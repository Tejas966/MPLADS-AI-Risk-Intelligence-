# MPLADS AI Risk Intelligence Platform

**Problem Statement:** SIH26102
**Organization:** MoSPI, Data Informatics & Innovation Division (DIID)

> **IMPORTANT DISCLAIMER**
> The platform is a decision-support and risk-prioritization system. A risk score or anomaly flag does not constitute proof of fraud or wrongdoing and should be validated through appropriate human investigation.

## Overview
An AI-powered system designed to detect anomalies, potential fraud, and inefficiencies in the implementation of the MPLAD Scheme. It serves as an intelligence layer to help government officials prioritize human investigations across thousands of projects.

## Problem
Monitoring thousands of MPLADS projects is complex. Existing dashboards provide tracking but rely on humans to spot unusual patterns. Identifying which projects have anomalous costs, mismatched progress, delay risks, or similarities to other projects is incredibly difficult at scale.

## Solution
Our solution provides an explainable AI risk intelligence layer that continuously compares MPLADS projects against relevant peers, detects multi-dimensional anomalies, predicts emerging implementation risks, and prioritizes projects for human investigation.

## Core Capabilities
- **Peer Benchmarking**: Compare project costs and progress against similar projects in the region.
- **Progress Mismatch Detection**: Identify discrepancies between fund utilization and physical progress.
- **Delay Risk Prediction**: Highlight projects likely to experience significant delays.
- **Duplicate Detection**: Find potentially overlapping or highly similar projects.
- **Risk Fingerprinting**: Provide a multidimensional profile for every project.
- **Explainable AI**: Give human investigators exact reasons why a project was flagged.

## Architecture
- **Frontend**: React / Next.js, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: Supabase / PostgreSQL
- **AI/ML**: Python (pandas, scikit-learn, sentence-transformers)

## Repository Structure
- `/frontend`: React/Next.js UI components and dashboard.
- `/backend`: FastAPI service for serving risk scores and project data.
- `/ai`: Core anomaly detection, risk scoring, and modeling scripts.
- `/data`: Sample datasets and data processing.
- `/docs`: Technical documentation, API contracts, and architecture.
- `/research`: Understanding of the problem, existing solutions, and data strategy.
- `/supabase`: Database migrations and seed files.

## Local Setup
1. Clone the repository.
2. Ensure you have Node.js, Python 3.10+, and Docker (for Supabase local).
3. Copy `.env.example` to `.env` and fill in required variables (do NOT commit `.env`).

## Environment Variables
See `.env.example`.

## Development Workflow
We use a standard feature-branch workflow:
`main` -> `feature/branch-name` -> PR -> Review -> Merge.
For details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Current MVP
Our initial prototype focuses on establishing a complete vertical slice for investigating project anomalies (cost, delay, progress mismatch, and similarity) with full explainability.

## Future Roadmap
- Phase 1: AI risk intelligence (MVP)
- Phase 2: Real-time/periodic data ingestion
- Phase 3: Advanced predictive analytics
- Phase 4: Geospatial intelligence
- Phase 5: Human investigation workflow
