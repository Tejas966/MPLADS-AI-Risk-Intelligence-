import sqlite3
conn = sqlite3.connect("data/sample/mplads_mock.db")
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", c.fetchall())
for table in ['works', 'work_risk_scores', 'mp_risk_scores']:
    try:
        c.execute(f"PRAGMA table_info({table})")
        print(f"Schema for {table}:", [col[1] for col in c.fetchall()])
    except Exception as e:
        print(e)

