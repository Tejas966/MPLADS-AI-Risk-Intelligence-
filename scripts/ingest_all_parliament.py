"""
Ingest All Parliament Data: Lok Sabha + Rajya Sabha
Team Vanguard (SIH 2026 · Problem SIH26102)

Ingests:
1. Allocated Limit for Honble MPs.xlsx (542 Lok Sabha MPs)
2. Allocated Limit for Honble MPs (Rajya Sabha).xlsx (232 Rajya Sabha MPs)
3. Expenditure on Completed and On-going Works as on Date( Rajya Sabha).xlsx (17,001 expanded transactions)

Exports clean, standardized UTF-8 CSV files and prepares unified parliament data.
"""

import os
import re
import csv
import sys
from datetime import datetime
from openpyxl.styles.fills import Fill, PatternFill
import openpyxl

# Apply patch for openpyxl empty fill elements
orig_from_tree = Fill.from_tree
def patched_from_tree(node):
    if len(node) == 0:
        return PatternFill()
    return orig_from_tree(node)
Fill.from_tree = patched_from_tree

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ingest_allocations():
    print("Loading allocations...")
    all_alloc = []

    # 1. Lok Sabha Allocations
    ls_path = os.path.join(BASE, "Allocated Limit for Honble MPs.xlsx")
    if os.path.exists(ls_path):
        wb = openpyxl.load_workbook(ls_path, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        # Header is row index 1
        header_idx = 1
        for idx, r in enumerate(rows[:5]):
            r_str = " ".join(str(x).lower() for x in r if x is not None)
            if "state" in r_str and ("mp" in r_str or "member" in r_str):
                header_idx = idx
                break
        
        for r in rows[header_idx + 1:]:
            if not r or r[0] is None:
                continue
            sr_no = str(r[0]).strip()
            if "total" in sr_no.lower():
                continue
            state = str(r[1]).strip() if len(r) > 1 and r[1] else ""
            mp = str(r[2]).strip() if len(r) > 2 and r[2] else ""
            const = str(r[3]).strip() if len(r) > 3 and r[3] else ""
            amt_raw = str(r[4]).replace(",", "").replace("₹", "").strip() if len(r) > 4 and r[4] is not None else "0"
            if not mp or "total" in state.lower():
                continue
            try:
                amt = float(amt_raw)
            except ValueError:
                amt = 0.0

            all_alloc.append({
                "house": "LOK_SABHA",
                "state": state,
                "mp_name": mp,
                "constituency": const,
                "allocated_amount": amt,
            })
        print(f"  Loaded {len(all_alloc)} Lok Sabha MP allocations")

    # 2. Rajya Sabha Allocations
    rs_path = os.path.join(BASE, "Allocated Limit for Honble MPs (Rajya Sabha).xlsx")
    if os.path.exists(rs_path):
        rs_count = 0
        wb = openpyxl.load_workbook(rs_path, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        header_idx = 1
        for idx, r in enumerate(rows[:5]):
            r_str = " ".join(str(x).lower() for x in r if x is not None)
            if "state" in r_str and ("mp" in r_str or "member" in r_str):
                header_idx = idx
                break

        for r in rows[header_idx + 1:]:
            if not r or r[0] is None:
                continue
            sr_no = str(r[0]).strip()
            if "total" in sr_no.lower():
                continue
            state = str(r[1]).strip() if len(r) > 1 and r[1] else ""
            mp = str(r[2]).strip() if len(r) > 2 and r[2] else ""
            amt_raw = str(r[4]).replace(",", "").replace("₹", "").strip() if len(r) > 4 and r[4] is not None else "0"
            if not mp or "total" in state.lower():
                continue
            try:
                amt = float(amt_raw)
            except ValueError:
                amt = 0.0

            all_alloc.append({
                "house": "RAJYA_SABHA",
                "state": state,
                "mp_name": mp,
                "constituency": f"{state} (Rajya Sabha)",
                "allocated_amount": amt,
            })
            rs_count += 1
        print(f"  Loaded {rs_count} Rajya Sabha MP allocations")

    print(f"Total Unified Parliament Allocations: {len(all_alloc)} MPs")
    return all_alloc


def extract_district(ida_str):
    if not ida_str:
        return ""
    paren = ida_str.find("(")
    if paren > 0:
        return ida_str[:paren].strip()
    return ida_str.strip()


def ingest_transactions():
    print("Loading transactions ledger...")
    txns = []

    # Expanded 17,001 transaction file
    exp_file = os.path.join(BASE, "Expenditure on Completed and On-going Works as on Date( Rajya Sabha).xlsx")
    if not os.path.exists(exp_file):
        exp_file = os.path.join(BASE, "Expenditure on Completed and On-going Works as on Date.xlsx")

    wb = openpyxl.load_workbook(exp_file, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)

    # Header is at row 2 (index 1)
    header_row = None
    for idx, row in enumerate(rows):
        if idx == 0:
            continue
        if idx == 1:
            header_row = [str(c).strip() if c else "" for c in row]
            break

    # Read records
    for row in rows:
        if not row or row[0] is None:
            continue
        sr_str = str(row[0]).strip()
        if not sr_str or "total" in sr_str.lower():
            continue
        state = str(row[1]).strip() if len(row) > 1 and row[1] else ""
        work_type = str(row[2]).strip() if len(row) > 2 and row[2] else ""
        work_id = str(row[3]).strip() if len(row) > 3 and row[3] else ""
        ida = str(row[4]).strip() if len(row) > 4 and row[4] else ""
        mp = str(row[5]).strip() if len(row) > 5 and row[5] else ""
        exp_date_str = str(row[7]).strip() if len(row) > 7 and row[7] else ""
        vendor = str(row[8]).strip() if len(row) > 8 and row[8] else ""
        pay_status = str(row[9]).strip() if len(row) > 9 and row[9] else ""
        amt_raw = str(row[10]).replace(",", "").replace("₹", "").strip() if len(row) > 10 and row[10] is not None else "0"

        if not work_id or not mp:
            continue

        try:
            amt = float(amt_raw)
        except ValueError:
            amt = 0.0

        fy_match = re.search(r"/(\d{4}-\d{4})/", work_id)
        fy = fy_match.group(1) if fy_match else None
        exp_date = None
        if exp_date_str:
            try:
                exp_date = datetime.strptime(exp_date_str, "%d-%b-%Y")
            except ValueError:
                pass

        txns.append({
            "state": state,
            "work_type": work_type,
            "work_id": work_id,
            "ida": ida,
            "mp": mp,
            "mp_upper": mp.upper(),
            "constituency": extract_district(ida),
            "exp_date": exp_date,
            "exp_date_str": exp_date_str,
            "vendor": vendor,
            "pay_status": pay_status,
            "amount": amt,
            "fy": fy,
            "district": extract_district(ida),
            "house": "LOK_SABHA",
        })

    print(f"Total Transactions Ingested: {len(txns):,} records")
    return txns


def main():
    allocations = ingest_allocations()
    transactions = ingest_transactions()

    os.makedirs(os.path.join(BASE, "data"), exist_ok=True)

    # Export unified allocations CSV (UTF-8)
    alloc_csv_path = os.path.join(BASE, "data", "unified_allocations.csv")
    with open(alloc_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["house", "state", "mp_name", "constituency", "allocated_amount"])
        writer.writeheader()
        writer.writerows(allocations)
    print(f"Exported: {alloc_csv_path}")

    # Export unified transactions CSV (UTF-8)
    txns_csv_path = os.path.join(BASE, "data", "unified_transactions.csv")
    with open(txns_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "house", "state", "work_type", "work_id", "ida", "mp",
            "constituency", "district", "fy", "exp_date_str", "vendor",
            "pay_status", "amount"
        ])
        writer.writeheader()
        for t in transactions:
            writer.writerow({
                "house": t["house"],
                "state": t["state"],
                "work_type": t["work_type"],
                "work_id": t["work_id"],
                "ida": t["ida"],
                "mp": t["mp"],
                "constituency": t["constituency"],
                "district": t["district"],
                "fy": t["fy"],
                "exp_date_str": t["exp_date_str"],
                "vendor": t["vendor"],
                "pay_status": t["pay_status"],
                "amount": t["amount"],
            })
    print(f"Exported: {txns_csv_path}")
    print("Ingestion staging completed successfully.")


if __name__ == "__main__":
    main()
