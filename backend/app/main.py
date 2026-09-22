import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import get_db, engine, Base
from backend.app.models.work import Work, WorkPayment, WorkRiskScore, WorkRiskSignal
from ai.risk_scoring.real_scorer import MPRiskScore, MPRiskSignal

app = FastAPI(title="MPLADS AI Risk Intelligence API", version="2.0")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,https://mplads-ai-risk-intelligence.vercel.app").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ---------- Health ----------
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    try:
        db.query(Work).limit(1).first()
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database connection failed")


# ---------- Stats ----------
@app.get("/api/v1/stats")
def get_stats(house: str = None, db: Session = Depends(get_db)):
    # Base queries
    work_q = db.query(Work)
    work_risk_q = db.query(WorkRiskScore).join(Work, Work.work_id == WorkRiskScore.work_id)
    mp_q = db.query(MPRiskScore)

    if house and house.upper() in ["LOK_SABHA", "RAJYA_SABHA"]:
        h = house.upper()
        work_q = work_q.filter(Work.house == h)
        work_risk_q = work_risk_q.filter(Work.house == h)
        mp_q = mp_q.filter(MPRiskScore.house == h)

    total_works = work_q.count()
    high_works = work_risk_q.filter(WorkRiskScore.risk_level == "HIGH").count()
    med_works = work_risk_q.filter(WorkRiskScore.risk_level == "MEDIUM").count()
    low_works = work_risk_q.filter(WorkRiskScore.risk_level == "LOW").count()

    total_mps = mp_q.count()
    high_mps = mp_q.filter(MPRiskScore.risk_level == "HIGH").count()
    
    totals = mp_q.with_entities(
        func.sum(MPRiskScore.total_disbursed),
        func.sum(MPRiskScore.allocated_amount),
    ).first()

    lok_sabha_mps = db.query(MPRiskScore).filter(MPRiskScore.house == "LOK_SABHA").count()
    rajya_sabha_mps = db.query(MPRiskScore).filter(MPRiskScore.house == "RAJYA_SABHA").count()

    return {
        "house": house.upper() if house else "ALL",
        "total_works": total_works,
        "high_risk_works": high_works,
        "medium_risk_works": med_works,
        "low_risk_works": low_works,
        "total_mps": total_mps,
        "high_risk_mps": high_mps,
        "lok_sabha_mps": lok_sabha_mps,
        "rajya_sabha_mps": rajya_sabha_mps,
        "total_disbursed": totals[0] or 0,
        "total_allocated": totals[1] or 0,
    }


@app.get("/api/v1/states")
def get_state_stats(house: str = None, db: Session = Depends(get_db)):
    from sqlalchemy import case
    q = db.query(
        Work.state,
        func.count(Work.work_id).label("total_works"),
        func.sum(case((WorkRiskScore.risk_level == "HIGH", 1), else_=0)).label("high_risk_works"),
        func.sum(case((WorkRiskScore.risk_level == "MEDIUM", 1), else_=0)).label("medium_risk_works"),
        func.sum(case((WorkRiskScore.risk_level == "LOW", 1), else_=0)).label("low_risk_works"),
        func.sum(Work.total_expenditure).label("total_expenditure")
    ).join(WorkRiskScore, Work.work_id == WorkRiskScore.work_id)

    if house and house.upper() in ["LOK_SABHA", "RAJYA_SABHA"]:
        q = q.filter(Work.house == house.upper())

    results = q.group_by(Work.state).all()

    return [
        {
            "state": r[0],
            "total_works": r[1],
            "high_risk_works": r[2] or 0,
            "medium_risk_works": r[3] or 0,
            "low_risk_works": r[4] or 0,
            "total_expenditure": r[5] or 0,
        }
        for r in results if r[0]
    ]


@app.get("/api/v1/states/{state}/districts")
@app.get("/api/v1/districts")
def get_district_stats(state: str = None, house: str = None, db: Session = Depends(get_db)):
    from sqlalchemy import case
    q = db.query(
        Work.state,
        Work.district,
        func.count(Work.work_id).label("total_works"),
        func.sum(case((WorkRiskScore.risk_level == "HIGH", 1), else_=0)).label("high_risk_works"),
        func.sum(case((WorkRiskScore.risk_level == "MEDIUM", 1), else_=0)).label("medium_risk_works"),
        func.sum(case((WorkRiskScore.risk_level == "LOW", 1), else_=0)).label("low_risk_works"),
        func.avg(WorkRiskScore.overall_score).label("avg_risk_score"),
        func.sum(Work.total_expenditure).label("total_expenditure")
    ).join(WorkRiskScore, Work.work_id == WorkRiskScore.work_id)

    if state:
        q = q.filter(Work.state.ilike(f"%{state}%"))
    if house and house.upper() in ["LOK_SABHA", "RAJYA_SABHA"]:
        q = q.filter(Work.house == house.upper())

    results = q.group_by(Work.state, Work.district).all()

    return [
        {
            "state": r[0],
            "district": r[1] or "Unknown",
            "total_works": r[2],
            "high_risk_works": r[3] or 0,
            "medium_risk_works": r[4] or 0,
            "low_risk_works": r[5] or 0,
            "avg_risk_score": round(float(r[6] or 0), 1),
            "total_expenditure": r[7] or 0,
        }
        for r in results if r[1]
    ]


# ---------- Works ----------
@app.get("/api/v1/works")
def list_works(
    risk_level: str = None,
    state: str = None,
    work_type: str = None,
    mp_name: str = None,
    house: str = None,
    search: str = None,
    limit: int = Query(default=200, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Work).join(WorkRiskScore)
    if house and house.upper() in ["LOK_SABHA", "RAJYA_SABHA"]:
        q = q.filter(Work.house == house.upper())
    if risk_level:
        q = q.filter(WorkRiskScore.risk_level == risk_level.upper())
    if state:
        q = q.filter(Work.state.ilike(f"%{state}%"))
    if work_type:
        q = q.filter(Work.work_type.ilike(f"%{work_type}%"))
    if mp_name:
        q = q.filter(Work.mp_name.ilike(f"%{mp_name}%"))
    if search:
        q = q.filter(
            Work.work_id.ilike(f"%{search}%")
            | Work.mp_name.ilike(f"%{search}%")
            | Work.district.ilike(f"%{search}%")
        )
    results = q.order_by(WorkRiskScore.overall_score.desc()).limit(limit).all()
    return {
        "total": q.count(),
        "works": [
            {
                "work_id": w.work_id,
                "work_type": w.work_type,
                "house": w.house,
                "state": w.state,
                "district": w.district,
                "mp_name": w.mp_name,
                "constituency": w.constituency,
                "fiscal_year": w.fiscal_year,
                "total_expenditure": w.total_expenditure,
                "payment_count": w.payment_count,
                "unique_vendors": w.unique_vendors,
                "latest_payment_status": w.latest_payment_status,
                "risk_score": w.risk_score.overall_score if w.risk_score else 0,
                "risk_level": w.risk_score.risk_level if w.risk_score else "LOW",
                "signals": {
                    "cost_peer": w.risk_score.cost_peer_score,
                    "vendor": w.risk_score.vendor_score,
                    "payment_timing": w.risk_score.payment_timing_score,
                    "amount_anomaly": w.risk_score.amount_anomaly_score,
                    "duplicate": w.risk_score.duplicate_score,
                } if w.risk_score else {},
            }
            for w in results
        ],
    }


@app.get("/api/v1/works/{work_id:path}/risk")
def get_work_risk(work_id: str, db: Session = Depends(get_db)):
    work = db.query(Work).filter(Work.work_id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    risk = work.risk_score
    signals = db.query(WorkRiskSignal).filter(WorkRiskSignal.work_id == work_id).all()
    payments = db.query(WorkPayment).filter(WorkPayment.work_id == work_id).order_by(WorkPayment.payment_date).all()

    # Peer comparison
    peer_q = db.query(func.avg(Work.total_expenditure), func.count(Work.work_id)).filter(
        Work.work_type == work.work_type, Work.state == work.state
    ).first()
    peer_avg = peer_q[0] if peer_q[0] else 0
    peer_count = peer_q[1] if peer_q[1] else 0

    return {
        "work_id": work.work_id,
        "work_type": work.work_type,
        "house": work.house,
        "state": work.state,
        "district": work.district,
        "mp_name": work.mp_name,
        "constituency": work.constituency,
        "ida": work.ida,
        "fiscal_year": work.fiscal_year,
        "total_expenditure": work.total_expenditure,
        "payment_count": work.payment_count,
        "unique_vendors": work.unique_vendors,
        "latest_payment_status": work.latest_payment_status,
        "first_payment_date": work.first_payment_date.isoformat() if work.first_payment_date else None,
        "last_payment_date": work.last_payment_date.isoformat() if work.last_payment_date else None,
        "risk_score": risk.overall_score if risk else 0,
        "risk_level": risk.risk_level if risk else "LOW",
        "signals": {
            "cost_peer": risk.cost_peer_score,
            "vendor": risk.vendor_score,
            "payment_timing": risk.payment_timing_score,
            "amount_anomaly": risk.amount_anomaly_score,
            "duplicate": risk.duplicate_score,
        } if risk else {},
        "explanations": [
            {"type": s.signal_type, "severity": s.severity, "reason": s.explanation, "data": s.supporting_data}
            for s in signals
        ],
        "payments": [
            {
                "vendor": p.vendor_name,
                "amount": p.amount,
                "date": p.payment_date.isoformat() if p.payment_date else None,
                "status": p.payment_status,
            }
            for p in payments
        ],
        "peer_comparison": {
            "peer_avg_expenditure": round(peer_avg, 2),
            "peer_count": peer_count,
            "ratio": round(work.total_expenditure / peer_avg, 2) if peer_avg > 0 else None,
        },
        "recommendation": "Priority audit recommended" if (risk and risk.risk_level == "HIGH") else "Routine monitoring",
    }


# ---------- MPs ----------
@app.get("/api/v1/mps")
def list_mps(
    risk_level: str = None,
    state: str = None,
    house: str = None,
    search: str = None,
    limit: int = Query(default=200, le=800),
    db: Session = Depends(get_db),
):
    q = db.query(MPRiskScore)
    if house and house.upper() in ["LOK_SABHA", "RAJYA_SABHA"]:
        q = q.filter(MPRiskScore.house == house.upper())
    if risk_level:
        q = q.filter(MPRiskScore.risk_level == risk_level.upper())
    if state:
        q = q.filter(MPRiskScore.state.ilike(f"%{state}%"))
    if search:
        q = q.filter(
            MPRiskScore.mp_name.ilike(f"%{search}%")
            | MPRiskScore.constituency.ilike(f"%{search}%")
        )
    results = q.order_by(MPRiskScore.overall_risk_score.desc()).limit(limit).all()
    return {
        "total": q.count(),
        "mps": [
            {
                "mp_name": r.mp_name,
                "constituency": r.constituency,
                "state": r.state,
                "house": r.house,
                "allocated_amount": r.allocated_amount,
                "total_disbursed": r.total_disbursed,
                "utilization_pct": r.utilization_pct,
                "transaction_count": r.transaction_count,
                "unique_vendor_count": r.unique_vendor_count,
                "risk_score": r.overall_risk_score,
                "risk_level": r.risk_level,
                "signals": {
                    "underspend": r.underspend_score,
                },
            }
            for r in results
        ],
    }


@app.get("/api/v1/mps/{mp_name}/risk")
def get_mp_risk(mp_name: str, db: Session = Depends(get_db)):
    record = db.query(MPRiskScore).filter(MPRiskScore.mp_name.ilike(f"%{mp_name}%")).first()
    if not record:
        raise HTTPException(status_code=404, detail="MP not found")
    signals = db.query(MPRiskSignal).filter(MPRiskSignal.mp_name == record.mp_name).all()

    # Get child works
    works = db.query(Work).join(WorkRiskScore).filter(
        Work.mp_name == record.mp_name
    ).order_by(WorkRiskScore.overall_score.desc()).limit(50).all()

    return {
        "mp_name": record.mp_name,
        "constituency": record.constituency,
        "state": record.state,
        "house": record.house,
        "allocated_amount": record.allocated_amount,
        "total_disbursed": record.total_disbursed,
        "utilization_pct": record.utilization_pct,
        "transaction_count": record.transaction_count,
        "unique_vendor_count": record.unique_vendor_count,
        "risk_score": record.overall_risk_score,
        "risk_level": record.risk_level,
        "signals": {"underspend": record.underspend_score},
        "explanations": [
            {"type": s.signal_type, "severity": s.severity, "reason": s.explanation, "data": s.supporting_data}
            for s in signals
        ],
        "works": [
            {
                "work_id": w.work_id,
                "work_type": w.work_type,
                "district": w.district,
                "fiscal_year": w.fiscal_year,
                "total_expenditure": w.total_expenditure,
                "risk_score": w.risk_score.overall_score if w.risk_score else 0,
                "risk_level": w.risk_score.risk_level if w.risk_score else "LOW",
            }
            for w in works
        ],
        "recommendation": "Priority audit recommended" if record.risk_level == "HIGH" else "Routine monitoring",
    }