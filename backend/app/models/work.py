from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from datetime import datetime


class Work(Base):
    """Core entity: one MPLADS sanctioned work identified by work_id."""
    __tablename__ = "works"

    work_id = Column(String, primary_key=True, index=True)
    work_type = Column(String, nullable=False)
    state = Column(String, index=True)
    district = Column(String)
    constituency = Column(String)
    mp_name = Column(String, index=True)
    ida = Column(String)
    fiscal_year = Column(String)
    total_expenditure = Column(Float, default=0)
    payment_count = Column(Integer, default=0)
    unique_vendors = Column(Integer, default=0)
    first_payment_date = Column(DateTime, nullable=True)
    last_payment_date = Column(DateTime, nullable=True)
    latest_payment_status = Column(String, default="Unknown")
    house = Column(String, default="LOK_SABHA", index=True)

    payments = relationship("WorkPayment", back_populates="work", cascade="all, delete-orphan")
    risk_score = relationship("WorkRiskScore", back_populates="work", uselist=False, cascade="all, delete-orphan")
    risk_signals = relationship("WorkRiskSignal", back_populates="work", cascade="all, delete-orphan")


class WorkPayment(Base):
    """Individual payment transaction against a work."""
    __tablename__ = "work_payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String, ForeignKey("works.work_id"), nullable=False, index=True)
    vendor_name = Column(String)
    amount = Column(Float, default=0)
    payment_date = Column(DateTime, nullable=True)
    payment_status = Column(String, default="Unknown")

    work = relationship("Work", back_populates="payments")


class WorkRiskScore(Base):
    """Risk assessment for an individual work."""
    __tablename__ = "work_risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String, ForeignKey("works.work_id"), nullable=False, unique=True, index=True)
    overall_score = Column(Float, default=0)
    risk_level = Column(String, default="LOW")
    cost_peer_score = Column(Float, default=0)
    vendor_score = Column(Float, default=0)
    payment_timing_score = Column(Float, default=0)
    amount_anomaly_score = Column(Float, default=0)
    duplicate_score = Column(Float, default=0)

    work = relationship("Work", back_populates="risk_score")


class WorkRiskSignal(Base):
    """Explainable risk signal for a work. Every non-zero score component
    MUST have a corresponding signal row."""
    __tablename__ = "work_risk_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String, ForeignKey("works.work_id"), nullable=False, index=True)
    signal_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    supporting_data = Column(Text)

    work = relationship("Work", back_populates="risk_signals")