import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.app.database import SessionLocal
from backend.app.models.project import Project, RiskScore, RiskExplanation

def score_projects():
    db = SessionLocal()
    projects = db.query(Project).all()
    
    # Very simple mock peer median logic for the 5 sample projects
    peer_median_cost = 1000000.0
    
    for p in projects:
        # Check if score already exists
        if db.query(RiskScore).filter(RiskScore.project_id == p.project_id).first():
            continue
            
        cost = float(p.sanctioned_amount)
        util = float(p.expenditure) / cost if cost > 0 else 0
        phys = float(p.physical_progress) / 100.0
        
        cost_score = 0
        progress_score = 0
        explanations = []
        
        # Rule 1: Cost Anomaly
        if cost > peer_median_cost * 1.5: # 50% above median
            cost_score = 40
            diff_pct = int(((cost - peer_median_cost) / peer_median_cost) * 100)
            explanations.append(RiskExplanation(
                project_id=p.project_id,
                signal="cost_anomaly",
                severity="HIGH",
                explanation=f"Project cost is {diff_pct}% above comparable projects."
            ))
            
        # Rule 2: Progress Mismatch
        if util > 0.75 and phys < 0.40:
            progress_score = 30
            explanations.append(RiskExplanation(
                project_id=p.project_id,
                signal="progress_mismatch",
                severity="HIGH",
                explanation=f"{int(util*100)}% of funds utilized while only {int(phys*100)}% physical progress reported."
            ))
            
        # Add basic scores for others just to have a complete fingerprint
        delay_score = 10
        duplicate_score = 5
        payment_score = 2
        
        overall = cost_score + progress_score + delay_score + duplicate_score + payment_score
        level = "LOW"
        if overall > 60:
            level = "HIGH"
        elif overall > 30:
            level = "MEDIUM"
            
        risk = RiskScore(
            project_id=p.project_id,
            overall_score=overall,
            cost_score=cost_score,
            delay_score=delay_score,
            progress_score=progress_score,
            duplicate_score=duplicate_score,
            payment_score=payment_score,
            risk_level=level
        )
        db.add(risk)
        if explanations:
            db.add_all(explanations)
            
    db.commit()
    print("AI Risk scoring completed for all unscored projects.")

if __name__ == "__main__":
    score_projects()