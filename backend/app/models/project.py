from sqlalchemy import Column, String, Numeric, Date, Integer, ForeignKey
from sqlalchemy.orm import relationship
import uuid

from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, unique=True, index=True, nullable=False)
    mp_name = Column(String)
    state = Column(String)
    district = Column(String)
    category = Column(String)
    description = Column(String)
    sanctioned_amount = Column(Numeric(15, 2))
    released_amount = Column(Numeric(15, 2))
    expenditure = Column(Numeric(15, 2))
    physical_progress = Column(Numeric(5, 2))
    start_date = Column(Date)
    expected_completion = Column(Date)
    actual_completion = Column(Date)
    implementing_agency = Column(String)
    
    risk_score = relationship("RiskScore", back_populates="project", uselist=False)
    explanations = relationship("RiskExplanation", back_populates="project")

class RiskScore(Base):
    __tablename__ = "risk_scores"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.project_id"))
    overall_score = Column(Integer)
    cost_score = Column(Integer)
    delay_score = Column(Integer)
    progress_score = Column(Integer)
    duplicate_score = Column(Integer)
    payment_score = Column(Integer)
    risk_level = Column(String)
    
    project = relationship("Project", back_populates="risk_score")

class RiskExplanation(Base):
    __tablename__ = "risk_explanations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.project_id"))
    signal = Column(String)
    severity = Column(String)
    explanation = Column(String)
    
    project = relationship("Project", back_populates="explanations")