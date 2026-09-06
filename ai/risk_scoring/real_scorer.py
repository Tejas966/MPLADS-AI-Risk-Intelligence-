from sqlalchemy import Column, String, Float, Integer, Text
from backend.app.database import Base

class MPRiskScore(Base):
    __tablename__ = "mp_risk_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    mp_name = Column(String, index=True)
    state = Column(String)
    constituency = Column(String)
    risk_level = Column(String)
    total_disbursed = Column(Float, default=0)
    allocated_amount = Column(Float, default=0)
    overall_risk_score = Column(Float, default=0)
    utilization_pct = Column(Float, default=0)
    transaction_count = Column(Integer, default=0)
    unique_vendor_count = Column(Integer, default=0)
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
