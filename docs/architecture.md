# System Architecture

## Core Philosophy
DATA -> UNDERSTANDING -> ANOMALY DETECTION -> PEER COMPARISON -> RISK FINGERPRINT -> EXPLANATION -> INVESTIGATION PRIORITY -> HUMAN DECISION

## Stack
- **Frontend**: Next.js / React (Tailwind CSS, Recharts for analytics)
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Python (pandas, scikit-learn, sentence-transformers)

## Pipeline Flow
1. **Data Ingestion**: Scripts to load MPLADS CSV/JSON data into Supabase.
2. **AI Engine**: Python scripts running batch jobs to compute peer groups, calculate anomalies (cost, mismatch, delay, similarity), and generate risk scores and explanations.
3. **Database Layer**: Supabase stores raw project data, aggregated risk scores, and granular explanations.
4. **API Layer**: FastAPI exposes REST endpoints for the frontend to query projects by risk, fetch details, and retrieve peer comparisons.
5. **UI Layer**: React dashboard consumes API to display prioritized lists and detailed investigation screens.

## Why this Architecture?
It is modular, relies on established technologies suitable for a hackathon, and clearly separates the AI computation (batch/offline) from the fast UI serving (FastAPI + Supabase).
