"""
Work-level AI risk scorer for MPLADS data.

Scores each work_id individually, then rolls up into MP-level aggregates.
Every non-zero signal score produces an explanation row.

Signals (per work):
  1. cost_peer     (0-30): Work expenditure vs peer median (same type + state)
  2. vendor        (0-25): Single-vendor dominance or excessive fragmentation
  3. payment_timing(0-20): Stale FY payments or rush-spending clusters
  4. amount_anomaly(0-15): Individual payment z-scores vs work-type peers
  5. duplicate     (0-10): MP has multiple works of same type in same district+FY
"""
import csv
import re
import sys
import os
from collections import defaultdict
from datetime import datetime, timedelta
from statistics import median, stdev, mean

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.work import Work, WorkPayment, WorkRiskScore, WorkRiskSignal
from ai.risk_scoring.real_scorer import MPRiskScore, MPRiskSignal

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure tables exist
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# DATA LOADING
# ---------------------------------------------------------------------------

def extract_district(ida_str):
    """Extract district name from IDA string like 'GHAZIABAD(DISTRICT MAGISTRAE GHAZIABAD_IDA)'."""
    if not ida_str:
        return ""
    paren = ida_str.find("(")
    if paren > 0:
        return ida_str[:paren].strip()
    return ida_str.strip()


def load_allocated(path):
    allocated = {}
    with open(path, encoding="utf-16") as f:
        content = f.read()
    for line in content.splitlines()[2:]:
        if not line.strip():
            continue
        row = list(csv.reader([line]))[0]
        if len(row) < 5:
            continue
        state, mp, const = row[1].strip(), row[2].strip(), row[3].strip()
        amt_str = row[4].strip().replace(",", "")
        if not mp or "grand total" in state.lower() or "grand total" in mp.lower():
            continue
        try:
            amt = float(amt_str)
        except ValueError:
            continue
        allocated[mp.upper()] = {
            "state": state, "constituency": const,
            "allocated_amount": amt, "original_name": mp,
        }
    return allocated


def load_transactions(path):
    txns = []
    with open(path, encoding="utf-16") as f:
        content = f.read()
    for line in content.splitlines()[2:]:
        if not line.strip():
            continue
        row = list(csv.reader([line]))[0]
        if len(row) < 11:
            continue
        state = row[1].strip()
        work_type = row[2].strip()
        work_id = row[3].strip()
        ida = row[4].strip()
        mp = row[5].strip()
        constituency = row[6].strip()
        exp_date_str = row[7].strip()
        vendor = row[8].strip()
        pay_status = row[9].strip()
        amt_str = row[10].strip().replace(",", "")
        if not mp or not work_id:
            continue
        try:
            amt = float(amt_str)
        except ValueError:
            amt = 0.0
        fy_match = re.search(r"/(\d{4}-\d{4})/", work_id)
        fy = fy_match.group(1) if fy_match else None
        exp_date = None
        try:
            exp_date = datetime.strptime(exp_date_str, "%d-%b-%Y")
        except ValueError:
            pass
        txns.append({
            "state": state, "work_type": work_type, "work_id": work_id,
            "ida": ida, "mp": mp, "mp_upper": mp.upper(),
            "constituency": constituency, "exp_date": exp_date,
            "vendor": vendor, "pay_status": pay_status,
            "amount": amt, "fy": fy,
            "district": extract_district(ida),
        })
    return txns


# ---------------------------------------------------------------------------
# PEER BASELINES (computed once, used by all work scorers)
# ---------------------------------------------------------------------------

def build_peer_baselines(work_map):
    """Build peer median expenditure by (work_type, state)."""
    buckets = defaultdict(list)
    for wid, w in work_map.items():
        key = (w["work_type"], w["state"])
        buckets[key].append(w["total_expenditure"])
    peer_medians = {}
    for key, amounts in buckets.items():
        if amounts:
            peer_medians[key] = median(amounts)
    return peer_medians


def build_amount_baselines(txns):
    """Build per-work-type payment amount distributions."""
    buckets = defaultdict(list)
    for t in txns:
        if t["amount"] > 0:
            buckets[t["work_type"]].append(t["amount"])
    stats = {}
    for wtype, amounts in buckets.items():
        if len(amounts) >= 5:
            m = mean(amounts)
            s = stdev(amounts) if len(amounts) > 1 else 0
            stats[wtype] = {"mean": m, "std": s}
    return stats


# ---------------------------------------------------------------------------
# WORK-LEVEL SIGNAL SCORING
# ---------------------------------------------------------------------------

def score_work(wid, w, peer_medians, amount_stats, dup_counts):
    """Score a single work. Returns (signals, scores_dict)."""
    signals = []
    scores = {}

    total = w["total_expenditure"]
    wtype = w["work_type"]
    state = w["state"]

    # --- Signal 1: Cost-Peer Comparison (0-30) ---
    peer_key = (wtype, state)
    peer_med = peer_medians.get(peer_key)
    cost_score = 0
    if peer_med and peer_med > 0 and total > 0:
        ratio = total / peer_med
        if ratio > 1.5:
            cost_score = min(30, int((ratio - 1) * 20))
            pct_above = int((ratio - 1) * 100)
            signals.append({
                "signal_type": "cost_peer",
                "severity": "HIGH" if ratio > 2.5 else "MEDIUM",
                "explanation": f"Work expenditure is {pct_above}% above peer median for '{wtype[:50]}' works in {state}.",
                "supporting_data": f"This work: Rs.{total:,.0f} | Peer median: Rs.{peer_med:,.0f} | Ratio: {ratio:.2f}x",
            })
        elif ratio < 0.3 and total > 0:
            cost_score = min(15, int((1 - ratio) * 10))
            signals.append({
                "signal_type": "cost_peer",
                "severity": "LOW",
                "explanation": f"Work expenditure is unusually low ({ratio:.1%} of peer median). May indicate incomplete disbursement.",
                "supporting_data": f"This work: Rs.{total:,.0f} | Peer median: Rs.{peer_med:,.0f}",
            })
    scores["cost_peer_score"] = cost_score

    # --- Signal 2: Vendor Concentration / Fragmentation (0-25) ---
    vendor_amounts = defaultdict(float)
    vendor_counts = defaultdict(int)
    for p in w["payments"]:
        if p["vendor"]:
            vendor_amounts[p["vendor"]] += p["amount"]
            vendor_counts[p["vendor"]] += 1
    n_vendors = len(vendor_amounts)
    n_payments = w["payment_count"]
    vendor_score = 0

    if n_vendors == 1 and n_payments >= 4 and total > 0:
        vendor_name = list(vendor_amounts.keys())[0]
        vendor_score = min(25, 10 + n_payments * 2)
        signals.append({
            "signal_type": "vendor_concentration",
            "severity": "HIGH" if n_payments >= 8 else "MEDIUM",
            "explanation": f"Single vendor '{vendor_name}' received all {n_payments} payments totaling Rs.{total:,.0f}. Potential bill-splitting.",
            "supporting_data": f"Vendor: {vendor_name} | Payments: {n_payments} | Total: Rs.{total:,.0f}",
        })
    elif n_vendors > 10:
        vendor_score = min(15, n_vendors - 5)
        signals.append({
            "signal_type": "vendor_fragmentation",
            "severity": "MEDIUM",
            "explanation": f"Work has {n_vendors} distinct vendors across {n_payments} payments. Unusually fragmented.",
            "supporting_data": f"Vendors: {n_vendors} | Payments: {n_payments} | Total: Rs.{total:,.0f}",
        })
    elif n_vendors >= 1 and total > 0:
        # Check HHI even with multiple vendors
        shares = [v / total for v in vendor_amounts.values()]
        hhi = sum(s ** 2 for s in shares)
        if hhi > 0.7:
            top_vendor = max(vendor_amounts, key=vendor_amounts.get)
            top_share = vendor_amounts[top_vendor] / total * 100
            vendor_score = int(hhi * 20)
            signals.append({
                "signal_type": "vendor_concentration",
                "severity": "MEDIUM",
                "explanation": f"Vendor '{top_vendor}' dominates with {top_share:.0f}% of funds (HHI={hhi:.2f}).",
                "supporting_data": f"Top vendor share: {top_share:.0f}% | HHI: {hhi:.2f} | Vendors: {n_vendors}",
            })
    scores["vendor_score"] = vendor_score

    # --- Signal 3: Payment Timing (0-20) ---
    timing_score = 0
    fy = w.get("fiscal_year")
    dates = [p["exp_date"] for p in w["payments"] if p["exp_date"]]

    if fy and dates:
        try:
            fy_end_year = int(fy.split("-")[1])
        except (ValueError, IndexError):
            fy_end_year = None

        if fy_end_year:
            # Stale payment check
            for d in dates:
                months_after = (d.year - fy_end_year) * 12 + d.month - 3  # FY ends March
                if months_after > 18:
                    timing_score = min(20, timing_score + 5)

            if timing_score > 0:
                latest = max(dates)
                lag_months = (latest.year - fy_end_year) * 12 + latest.month - 3
                signals.append({
                    "signal_type": "payment_timing",
                    "severity": "HIGH" if lag_months > 36 else "MEDIUM",
                    "explanation": f"Payments still being disbursed {lag_months} months after FY {fy} ended. Stale work.",
                    "supporting_data": f"FY: {fy} | Latest payment: {latest.strftime('%d-%b-%Y')} | Lag: {lag_months} months",
                })

    # Rush-spending: all payments within 7 days
    if len(dates) >= 3:
        date_range = (max(dates) - min(dates)).days
        if date_range <= 7:
            rush_bump = min(10, len(dates))
            timing_score = min(20, timing_score + rush_bump)
            signals.append({
                "signal_type": "rush_spending",
                "severity": "MEDIUM",
                "explanation": f"All {len(dates)} payments were made within {date_range} day(s). Possible end-of-period rush.",
                "supporting_data": f"First: {min(dates).strftime('%d-%b-%Y')} | Last: {max(dates).strftime('%d-%b-%Y')} | Payments: {len(dates)}",
            })

    scores["payment_timing_score"] = timing_score

    # --- Signal 4: Amount Anomaly (0-15) ---
    anomaly_score = 0
    wtype_stats = amount_stats.get(wtype)
    if wtype_stats and wtype_stats["std"] > 0:
        for p in w["payments"]:
            if p["amount"] > 0:
                z = abs(p["amount"] - wtype_stats["mean"]) / wtype_stats["std"]
                if z > 2.5:
                    anomaly_score = min(15, anomaly_score + 5)
        if anomaly_score > 0:
            max_payment = max(p["amount"] for p in w["payments"] if p["amount"] > 0)
            signals.append({
                "signal_type": "amount_anomaly",
                "severity": "MEDIUM" if anomaly_score < 10 else "HIGH",
                "explanation": f"Payment amount(s) are statistical outliers for '{wtype[:40]}' works. Largest: Rs.{max_payment:,.0f}.",
                "supporting_data": f"Work-type mean: Rs.{wtype_stats['mean']:,.0f} | Std: Rs.{wtype_stats['std']:,.0f}",
            })
    scores["amount_anomaly_score"] = anomaly_score

    # --- Signal 5: Duplicate Work Detection (0-10) ---
    dup_key = (w["mp_upper"], wtype, w["district"], fy or "")
    dup_count = dup_counts.get(dup_key, 0)
    dup_score = 0
    if dup_count > 3:
        dup_score = min(10, (dup_count - 3) * 2)
        signals.append({
            "signal_type": "duplicate_work",
            "severity": "HIGH" if dup_count > 6 else "MEDIUM",
            "explanation": f"MP has {dup_count} works of type '{wtype[:40]}' in {w['district']} during FY {fy or 'unknown'}.",
            "supporting_data": f"Count: {dup_count} | District: {w['district']} | Type: {wtype[:60]}",
        })
    scores["duplicate_score"] = dup_score

    # --- Overall ---
    overall = min(100, sum(scores.values()))
    level = "HIGH" if overall >= 40 else ("MEDIUM" if overall >= 20 else "LOW")
    return signals, scores, overall, level


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def run():
    alloc_path = os.path.join(BASE, "allocated.csv")
    exp_path = os.path.join(BASE, "exp.csv")

    print("Loading allocated limits...")
    allocated = load_allocated(alloc_path)
    print(f"  {len(allocated)} MPs")

    print("Loading expenditure transactions...")
    txns = load_transactions(exp_path)
    print(f"  {len(txns)} transactions")

    # --- Build work map ---
    print("Building work entities...")
    work_map = {}  # work_id -> dict
    for t in txns:
        wid = t["work_id"]
        if wid not in work_map:
            work_map[wid] = {
                "work_type": t["work_type"], "state": t["state"],
                "district": t["district"], "constituency": t["constituency"],
                "mp": t["mp"], "mp_upper": t["mp_upper"],
                "ida": t["ida"], "fiscal_year": t["fy"],
                "payments": [], "total_expenditure": 0,
                "payment_count": 0,
            }
        w = work_map[wid]
        w["payments"].append({
            "vendor": t["vendor"], "amount": t["amount"],
            "exp_date": t["exp_date"], "pay_status": t["pay_status"],
        })
        w["total_expenditure"] += t["amount"]
        w["payment_count"] += 1

    print(f"  {len(work_map)} unique works")

    # --- Peer baselines ---
    print("Computing peer baselines...")
    peer_medians = build_peer_baselines(work_map)
    amount_stats = build_amount_baselines(txns)

    # --- Duplicate counts ---
    dup_counts = defaultdict(int)
    for wid, w in work_map.items():
        key = (w["mp_upper"], w["work_type"], w["district"], w.get("fiscal_year") or "")
        dup_counts[key] += 1

    # --- Score all works ---
    print("Scoring works...")
    db = SessionLocal()

    # Clear old data
    db.query(WorkRiskSignal).delete()
    db.query(WorkRiskScore).delete()
    db.query(WorkPayment).delete()
    db.query(Work).delete()
    db.query(MPRiskSignal).delete()
    db.query(MPRiskScore).delete()
    db.commit()

    work_scores = {}  # wid -> (overall, level)
    mp_work_scores = defaultdict(list)  # mp_upper -> [(overall, expenditure)]

    for wid, w in work_map.items():
        signals, scores, overall, level = score_work(wid, w, peer_medians, amount_stats, dup_counts)
        work_scores[wid] = (overall, level)
        mp_work_scores[w["mp_upper"]].append((overall, w["total_expenditure"]))

        # Compute vendor set and date range
        vendors = set(p["vendor"] for p in w["payments"] if p["vendor"])
        dates = [p["exp_date"] for p in w["payments"] if p["exp_date"]]

        # Persist Work
        db_work = Work(
            work_id=wid, work_type=w["work_type"], state=w["state"],
            district=w["district"], constituency=w["constituency"],
            mp_name=w["mp"], ida=w["ida"], fiscal_year=w.get("fiscal_year"),
            total_expenditure=w["total_expenditure"],
            payment_count=w["payment_count"],
            unique_vendors=len(vendors),
            first_payment_date=min(dates) if dates else None,
            last_payment_date=max(dates) if dates else None,
            latest_payment_status=w["payments"][-1]["pay_status"] if w["payments"] else "Unknown",
        )
        db.add(db_work)

        # Persist payments
        for p in w["payments"]:
            db.add(WorkPayment(
                work_id=wid, vendor_name=p["vendor"],
                amount=p["amount"], payment_date=p["exp_date"],
                payment_status=p["pay_status"],
            ))

        # Persist risk score
        db.add(WorkRiskScore(
            work_id=wid, overall_score=overall, risk_level=level,
            cost_peer_score=scores["cost_peer_score"],
            vendor_score=scores["vendor_score"],
            payment_timing_score=scores["payment_timing_score"],
            amount_anomaly_score=scores["amount_anomaly_score"],
            duplicate_score=scores["duplicate_score"],
        ))

        # Persist signals
        for sig in signals:
            db.add(WorkRiskSignal(
                work_id=wid, signal_type=sig["signal_type"],
                severity=sig["severity"], explanation=sig["explanation"],
                supporting_data=sig["supporting_data"],
            ))

    db.commit()

    # --- Count work-level results ---
    total_works = len(work_map)
    high_works = sum(1 for _, (o, _) in work_scores.items() if o >= 40)
    med_works = sum(1 for _, (o, _) in work_scores.items() if 20 <= o < 40)
    low_works = sum(1 for _, (o, _) in work_scores.items() if o < 20)
    print(f"  Works: {total_works} total | {high_works} HIGH | {med_works} MEDIUM | {low_works} LOW")

    # --- MP roll-up ---
    print("Rolling up to MP level...")
    # Include all MPs from allocation file, even those with zero expenditure
    all_mp_keys = set(mp_work_scores.keys()) | set(allocated.keys())
    mp_scored = 0

    for mp_upper in all_mp_keys:
        mp_info = allocated.get(mp_upper, {})
        work_scores_list = mp_work_scores.get(mp_upper, [])

        if not mp_info:
            # Try to find info from transactions
            for wid, w in work_map.items():
                if w["mp_upper"] == mp_upper:
                    mp_info = {
                        "state": w["state"], "constituency": w["constituency"],
                        "allocated_amount": 0, "original_name": w["mp"],
                    }
                    break

        if not mp_info:
            continue

        alloc_amt = mp_info.get("allocated_amount", 0)
        total_disbursed = sum(exp for _, exp in work_scores_list)
        util = (total_disbursed / alloc_amt * 100) if alloc_amt > 0 else 0

        # Weighted average risk score
        if work_scores_list:
            total_weight = sum(max(exp, 1) for _, exp in work_scores_list)
            mp_risk = sum(score * max(exp, 1) for score, exp in work_scores_list) / total_weight
        else:
            mp_risk = 0

        # MP-specific signals
        mp_signals = []

        # Underspend (MP-level only)
        underspend_score = 0
        if alloc_amt > 0 and util < 30:
            underspend_score = min(40, int((30 - util) * 1.5))
            mp_signals.append({
                "signal_type": "underspend",
                "severity": "HIGH" if util < 10 else "MEDIUM",
                "explanation": f"Only {util:.1f}% of Rs.{alloc_amt/1e7:.2f}Cr allocated funds utilized.",
                "supporting_data": f"Allocated: Rs.{alloc_amt:,.0f} | Disbursed: Rs.{total_disbursed:,.0f}",
            })

        # Zero expenditure (strongest underspend)
        if not work_scores_list and alloc_amt > 0:
            underspend_score = 40
            mp_signals.append({
                "signal_type": "zero_expenditure",
                "severity": "HIGH",
                "explanation": f"MP has Rs.{alloc_amt/1e7:.2f}Cr allocated but zero expenditure recorded in this dataset.",
                "supporting_data": f"Allocated: Rs.{alloc_amt:,.0f} | Works in dataset: 0",
            })

        overall_mp = min(100, int(mp_risk + underspend_score))
        mp_level = "HIGH" if overall_mp >= 50 else ("MEDIUM" if overall_mp >= 25 else "LOW")

        # Count unique vendors across all works
        mp_vendors = set()
        mp_txn_count = 0
        for wid, w in work_map.items():
            if w["mp_upper"] == mp_upper:
                mp_txn_count += w["payment_count"]
                for p in w["payments"]:
                    if p["vendor"]:
                        mp_vendors.add(p["vendor"])

        db.add(MPRiskScore(
            mp_name=mp_info.get("original_name", mp_upper),
            constituency=mp_info.get("constituency", ""),
            state=mp_info.get("state", ""),
            allocated_amount=alloc_amt,
            total_disbursed=total_disbursed,
            utilization_pct=round(util, 2),
            transaction_count=mp_txn_count,
            unique_vendor_count=len(mp_vendors),
            overall_risk_score=overall_mp,
            risk_level=mp_level,
            underspend_score=underspend_score,
            vendor_concentration_score=0,
            bill_split_score=0,
            payment_delay_score=0,
            txn_anomaly_score=0,
        ))
        for sig in mp_signals:
            db.add(MPRiskSignal(
                mp_name=mp_info.get("original_name", mp_upper),
                signal_type=sig["signal_type"], severity=sig["severity"],
                explanation=sig["explanation"], supporting_data=sig["supporting_data"],
            ))
        mp_scored += 1

    db.commit()
    db.close()

    print(f"\nDone. Scored {total_works} works and {mp_scored} MPs.")


if __name__ == "__main__":
    run()
