import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_database_url():
    # 1. Try to get from environment directly (e.g. Render)
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return db_url

    # 2. Try to read from backend/.env
    env_file = os.path.join(BASE_DIR, "backend", ".env")
    if os.path.exists(env_file):
        config = {}
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip()
        
        if "user" in config and "password" in config and "host" in config and "dbname" in config:
            port = config.get("port", "5432")
            return f"postgresql://{config['user']}:{config['password']}@{config['host']}:{port}/{config['dbname']}"

    # 3. Fallback to local SQLite
    db_path = os.path.join(BASE_DIR, 'data', 'sample')
    os.makedirs(db_path, exist_ok=True)
    return f"sqlite:///{os.path.join(db_path, 'mplads_mock.db')}"

DATABASE_URL = get_database_url()

# PostgreSQL doesn't need (and doesn't accept) check_same_thread
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Use pooler compatible settings if it's Supabase (e.g. pool_pre_ping)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()