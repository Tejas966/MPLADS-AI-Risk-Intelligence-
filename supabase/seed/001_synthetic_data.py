import sys
import os
import random
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.project import Project, RiskScore, RiskExplanation
os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)

Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    if db.query(Project).count() > 0:
        print("Data already seeded.")
        return
    
    peer_sanctioned_amount = 1000000.0
    projects = []
    
    for i in range(1, 5):
        p = Project(
            project_id=f"PRJ-2026-00{i}",
            mp_name=f"MP Name {i}",
            state="State A",
            district="District A",
            category="Community Infrastructure",
            description=f"Construction of community hall in Village {i}",
            sanctioned_amount=peer_sanctioned_amount + random.randint(-50000, 50000),
            released_amount=peer_sanctioned_amount,
            expenditure=peer_sanctioned_amount * random.uniform(0.7, 0.9),
            physical_progress=random.uniform(70.0, 95.0),
            start_date=date.today() - timedelta(days=200),
            expected_completion=date.today() + timedelta(days=50),
            implementing_agency="District Agency A"
        )
        projects.append(p)
        
    anomalous_project = Project(
        project_id="PRJ-2026-999",
        mp_name="MP Name X",
        state="State A",
        district="District A",
        category="Community Infrastructure",
        description="Construction of community hall in Village X",
        sanctioned_amount=1950000.0, 
        released_amount=1950000.0,
        expenditure=1800000.0,      
        physical_progress=35.0,     
        start_date=date.today() - timedelta(days=200),
        expected_completion=date.today() + timedelta(days=50),
        implementing_agency="District Agency A"
    )
    projects.append(anomalous_project)
    
    db.add_all(projects)
    db.commit()
    print("Successfully seeded 5 synthetic projects.")

if __name__ == "__main__":
    seed_data()