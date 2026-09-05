import csv
import re
import sys
import os
from collections import defaultdict
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.app.database import SessionLocal, Base, engine

from sqlalchemy import Column, String, Float, Integer, Text, DateTime

class MPRiskScore(Base):
    __tablename__ = "mp_risk_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    mp_name = Column(String, index=True)
    constituency = Column(String)
    state = Column(String)
    allocated_amount = Column(Float, default=0)
    total_disbursed = Column(Float, default=0)
    utilization_pct = Column(Float, default=0)
    transaction_count = Column(Integer, default=0)
    unique_vendor_count = Column(Integer, default=0)
    overall_risk_score = Column(Float, default=0)
    risk_level = Column(String, default="LOW")
    underspend_score = Column(Float, default=0)
    vendor_concentration_score = Column(Float, default=0)
    bill_split_score = Column(Float, default=0)
    payment_delay_score = Column(Float, default=0)
    txn_anomaly_score = Column(Float, default=0)

class MPRiskSignal(Base):
    __tablename__ = "mp_risk_signals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    mp_name = Column(String, index=True)
    signal_type = Column(String)
    severity = Column(String)
    explanation = Column(Text)
    supporting_data = Column(Text)

Base.metadata.create_all(bind=engine)
BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_allocated(path):
    allocated = {}
    with open(path, encoding='utf-16') as f:
        content = f.read()
    lines = content.splitlines()
    for line in lines[2:]:
        if not line.strip(): continue
        row = list(csv.reader([line]))[0]
        if len(row) < 5: continue
        state = row[1].strip()
        mp = row[2].strip()
        constituency = row[3].strip()
        amt_str = row[4].strip().replace(',', '')
        if not mp or 'grand total' in state.lower() or 'grand total' in mp.lower(): continue
        try:
            amt = float(amt_str)
        except:
            continue
        allocated[mp.upper()] = {'state': state, 'constituency': constituency, 'allocated_amount': amt, 'original_name': mp}
    return allocated

def load_expenditure(path):
    txns = []
    with open(path, encoding='utf-16') as f:
        content = f.read()
    lines = content.splitlines()
    for line in lines[2:]:
        if not line.strip(): continue
        row = list(csv.reader([line]))[0]
        if len(row) < 11: continue
        state=row[1].strip(); work=row[2].strip(); work_id=row[3].strip()
        ida=row[4].strip(); mp=row[5].strip(); constituency=row[6].strip()
        exp_date_str=row[7].strip(); vendor=row[8].strip()
        pay_status=row[9].strip(); amt_str=row[10].strip().replace(',','')
        if not mp or not work_id: continue
        try: amt = float(amt_str)
        except: amt = 0.0
        fy_match = re.search(r'/(\d{4}-\d{4})/', work_id)
        fy = fy_match.group(1) if fy_match else None
        exp_date = None
        try: exp_date = datetime.strptime(exp_date_str, '%d-%b-%Y')
        except: pass
        txns.append({'state':state,'work':work,'work_id':work_id,'ida':ida,'mp':mp.upper(),
            'original_mp':mp,'constituency':constituency,'exp_date':exp_date,
            'vendor':vendor,'pay_status':pay_status,'amount':amt,'fy':fy})
    return txns

def compute_signals(mp_upper, mp_info, txns):
    signals = []; scores = {}
    allocated = mp_info.get('allocated_amount', 0)
    total_disbursed = sum(t['amount'] for t in txns)
    utilization = (total_disbursed / allocated * 100) if allocated > 0 else 0

    # Signal 1: Underspending
    if allocated > 0 and utilization < 30:
        score = min(40, int((30 - utilization) * 1.5))
        signals.append({'signal_type':'underspend','severity':'HIGH' if utilization<10 else 'MEDIUM',
            'explanation':f"Only {utilization:.1f}% of Rs.{allocated/1e7:.2f}Cr allocated funds utilized.",
            'supporting_data':f"Allocated: Rs.{allocated:,.0f} | Disbursed: Rs.{total_disbursed:,.0f}"})
        scores['underspend_score'] = score
    else:
        scores['underspend_score'] = 0

    # Signal 2: Vendor Concentration
    vendor_amounts = defaultdict(float)
    for t in txns:
        if t['vendor']: vendor_amounts[t['vendor']] += t['amount']
    vendor_score = 0
    if vendor_amounts and total_disbursed > 0:
        shares = [v/total_disbursed for v in vendor_amounts.values()]
        hhi = sum(s**2 for s in shares)
        vendor_score = int(hhi * 35)
        top_vendor = max(vendor_amounts, key=vendor_amounts.get)
        top_share = vendor_amounts[top_vendor]/total_disbursed*100
        if hhi > 0.5:
            signals.append({'signal_type':'vendor_concentration','severity':'HIGH' if hhi>0.75 else 'MEDIUM',
                'explanation':f"Vendor concentration HHI={hhi:.2f}. '{top_vendor}' got {top_share:.1f}% of all funds.",
                'supporting_data':f"Unique vendors: {len(vendor_amounts)} | Top share: {top_share:.1f}%"})
    scores['vendor_concentration_score'] = vendor_score

    # Signal 3: Bill Splitting
    work_vendor_txns = defaultdict(lambda: defaultdict(list))
    for t in txns:
        if t['work_id'] and t['vendor']: work_vendor_txns[t['work_id']][t['vendor']].append(t['amount'])
    split_cases = []
    for wid, vm in work_vendor_txns.items():
        for vendor, amounts in vm.items():
            if len(amounts) >= 4: split_cases.append({'work_id':wid,'vendor':vendor,'count':len(amounts),'total':sum(amounts)})
    split_score = 0
    if split_cases:
        worst = max(split_cases, key=lambda x: x['count'])
        split_score = min(25, len(split_cases)*3)
        signals.append({'signal_type':'bill_splitting','severity':'HIGH' if worst['count']>=8 else 'MEDIUM',
            'explanation':f"{len(split_cases)} work(s) show possible bill-splitting. Work {worst['work_id']} has {worst['count']} payments to same vendor totaling Rs.{worst['total']:,.0f}.",
            'supporting_data':f"Suspicious works: {len(split_cases)} | Worst: {worst['count']} splits to {worst['vendor']}"})
    scores['bill_split_score'] = split_score

    # Signal 4: Payment Delay
    stale = []
    for t in txns:
        if t['fy'] and t['exp_date']:
            fy_end_year = int(t['fy'].split('-')[1])
            lag = t['exp_date'].year - fy_end_year
            if lag >= 2: stale.append({'work_id':t['work_id'],'fy':t['fy'],'paid_in':t['exp_date'].year,'lag':lag})
    delay_score = 0
    if stale:
        max_lag = max(s['lag'] for s in stale)
        delay_score = min(20, len(stale)*2)
        signals.append({'signal_type':'payment_delay','severity':'HIGH' if max_lag>=3 else 'MEDIUM',
            'explanation':f"{len(stale)} payment(s) for works sanctioned 2+ years ago. Max delay: {max_lag} years.",
            'supporting_data':f"Example: FY {stale[0]['fy']} work paid in {stale[0]['paid_in']}"})
    scores['payment_delay_score'] = delay_score

    # Signal 5: Amount Anomaly
    amounts = [t['amount'] for t in txns if t['amount'] > 0]
    txn_score = 0
    if len(amounts) > 5:
        mean = sum(amounts)/len(amounts)
        std = (sum((a-mean)**2 for a in amounts)/len(amounts))**0.5
        if std > 0:
            outliers = [a for a in amounts if abs(a-mean) > 2.5*std]
            if outliers:
                txn_score = min(15, len(outliers)*3)
                signals.append({'signal_type':'amount_anomaly','severity':'MEDIUM',
                    'explanation':f"{len(outliers)} transaction(s) statistically anomalous (>2.5 sigma). Largest: Rs.{max(outliers):,.0f}.",
                    'supporting_data':f"Mean: Rs.{mean:,.0f} | Std: Rs.{std:,.0f} | Outliers: {len(outliers)}"})
    scores['txn_anomaly_score'] = txn_score

    overall = min(100, sum(scores.values()))
    level = 'HIGH' if overall >= 50 else ('MEDIUM' if overall >= 25 else 'LOW')
    return signals, scores, overall, level, total_disbursed, utilization

def run():
    alloc_path = os.path.join(BASE, 'allocated.csv')
    exp_path = os.path.join(BASE, 'exp.csv')
    print("Loading allocated limits..."); allocated = load_allocated(alloc_path); print(f"  {len(allocated)} MPs")
    print("Loading expenditure..."); txns = load_expenditure(exp_path); print(f"  {len(txns)} transactions")
    mp_txns = defaultdict(list)
    for t in txns: mp_txns[t['mp']].append(t)
    db = SessionLocal()
    db.query(MPRiskScore).delete(); db.query(MPRiskSignal).delete(); db.commit()
    scored = 0
    for mp_upper, mp_txn_list in mp_txns.items():
        mp_info = allocated.get(mp_upper, {})
        if not mp_info:
            for key in allocated:
                if mp_upper in key or key in mp_upper: mp_info = allocated[key]; break
        if not mp_info:
            first = mp_txn_list[0]
            mp_info = {'state':first['state'],'constituency':first['constituency'],'allocated_amount':0,'original_name':first['original_mp']}
        signals, scores, overall, level, total_disbursed, utilization = compute_signals(mp_upper, mp_info, mp_txn_list)
        unique_vendors = len(set(t['vendor'] for t in mp_txn_list if t['vendor']))
        db.add(MPRiskScore(
            mp_name=mp_info.get('original_name', mp_upper), constituency=mp_info.get('constituency',''),
            state=mp_info.get('state',''), allocated_amount=mp_info.get('allocated_amount',0),
            total_disbursed=total_disbursed, utilization_pct=round(utilization,2),
            transaction_count=len(mp_txn_list), unique_vendor_count=unique_vendors,
            overall_risk_score=overall, risk_level=level,
            underspend_score=scores.get('underspend_score',0), vendor_concentration_score=scores.get('vendor_concentration_score',0),
            bill_split_score=scores.get('bill_split_score',0), payment_delay_score=scores.get('payment_delay_score',0),
            txn_anomaly_score=scores.get('txn_anomaly_score',0)))
        for sig in signals:
            db.add(MPRiskSignal(mp_name=mp_info.get('original_name',mp_upper), signal_type=sig['signal_type'],
                severity=sig['severity'], explanation=sig['explanation'], supporting_data=sig['supporting_data']))
        scored += 1
    db.commit(); db.close()
    print(f"\nScored {scored} MPs from real MPLADS data.")

if __name__ == '__main__': run()