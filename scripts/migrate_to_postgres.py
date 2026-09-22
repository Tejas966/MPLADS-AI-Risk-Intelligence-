import os
import sys

# Ensure backend module is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models.work import Work, WorkPayment, WorkRiskScore, WorkRiskSignal
from ai.risk_scoring.real_scorer import MPRiskScore, MPRiskSignal

def get_postgres_url():
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
    config = {}
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip()
    port = config.get("port", "5432")
    return f"postgresql://{config['user']}:{config['password']}@{config['host']}:{port}/{config['dbname']}"

sqlite_url = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'sample', 'mplads_mock.db')}"
postgres_url = get_postgres_url()

sqlite_engine = create_engine(sqlite_url)
postgres_engine = create_engine(postgres_url)

print("Creating tables in PostgreSQL...")
Base.metadata.create_all(postgres_engine)

SqliteSession = sessionmaker(bind=sqlite_engine)
PostgresSession = sessionmaker(bind=postgres_engine)

sqlite_session = SqliteSession()
postgres_session = PostgresSession()

models_to_migrate = [
    Work,
    WorkPayment,
    WorkRiskScore,
    WorkRiskSignal,
    MPRiskScore,
    MPRiskSignal
]

from sqlalchemy import insert

for model in models_to_migrate:
    print(f"Migrating {model.__tablename__}...")
    postgres_session.query(model).delete()
    postgres_session.commit()

    rows = sqlite_session.query(model).all()
    print(f"  Found {len(rows)} rows in SQLite.")
    
    if not rows:
        continue

    dicts = []
    for row in rows:
        row_dict = {c.name: getattr(row, c.name) for c in model.__table__.columns}
        dicts.append(row_dict)
    
    batch_size = 5000
    for i in range(0, len(dicts), batch_size):
        batch = dicts[i:i+batch_size]
        postgres_session.execute(insert(model), batch)
        postgres_session.commit()
        print(f"  Migrated batch up to {i+len(batch)} rows.")

print("Migration completed successfully!")
sqlite_session.close()
postgres_session.close()
