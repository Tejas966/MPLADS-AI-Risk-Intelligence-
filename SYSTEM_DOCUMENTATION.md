# MPLADS AI Risk Intelligence Platform
## Technical Architecture, Workflow & AI Engine Documentation
**Developed by:** Team Vanguard  
**Initiative:** Smart India Hackathon (SIH 2026) · Problem Statement SIH26102  
**Target Entities:** Ministry of Statistics and Programme Implementation (MoSPI), CAG, State Nodal Departments, District Authorities  

---

## 1. Executive Summary & Core Philosophy

The **MPLADS AI Risk Intelligence Platform** is an enterprise-grade oversight and decision-support system built to analyze fund allocations, expenditure patterns, contractor concentrations, and implementation timelines across the Members of Parliament Local Area Development Scheme (MPLADS).

### Core Philosophy
```
DATA INGESTION ──► STATISTICAL BASELINING ──► MULTI-SIGNAL ANOMALY ENGINE ──► EXPLAINABLE AI (XAI) ──► HUMAN AUDIT DECISION
```

### Ethical AI & Governance Principles
1. **Assistive, Not Punitive**: The platform generates audit prioritizations and evidentiary dossiers. It does not pronounce legal wrongdoing; risk scores serve as an objective index to triage human physical inspections.
2. **Explainable AI (XAI)**: No "black-box" predictions. Every single point in a project's risk score is tied to a specific mathematical formula, historical baseline, and plain-language justification supported by transaction records.
3. **Reproducibility**: All peer baselines and outlier thresholds are computed deterministically from real administrative data.

---

## 2. Technology Stack

The platform is engineered using modern, modular web and machine learning technologies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION LAYER                     │
│  Next.js 15 (App Router) · React 19 · Tailwind CSS · Geist Typeface   │
│  Components: MetricCard, StatusBadge, ProgressBar, Header, Tables      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ JSON REST API
┌────────────────────────────────────▼───────────────────────────────────┐
│                          BACKEND API SERVICE                           │
│  FastAPI (Asynchronous Python) · Pydantic V2 · Uvicorn ASGI Server    │
│  Endpoints: /stats, /mps, /mps/{name}/risk, /works, /works/{id}/risk   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ SQLAlchemy ORM
┌────────────────────────────────────▼───────────────────────────────────┐
│                      DATABASE & PERSISTENCE LAYER                      │
│  SQLite / PostgreSQL (Supabase Compatible)                             │
│  Tables: works, work_payments, work_risk_scores, work_risk_signals,    │
│          mp_risk_scores, mp_risk_signals                               │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ Ingestion & Batch Scoring
┌────────────────────────────────────┴───────────────────────────────────┐
│                     AI/ML RISK INTELLIGENCE ENGINE                     │
│  Python 3.11+ · NumPy · Pandas · SciPy · Scikit-learn                   │
│  Modules: Peer Baselines, HHI Concentration, Z-Score Anomaly Detector  │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Breakdown:
* **Frontend**: 
  * **Next.js 15 (App Router)**: Client-side routing, streaming UI rendering, dynamic parameter handling (`/work/[id]`, `/mp/[name]`).
  * **Tailwind CSS**: Tailored design system with semantic color tokens (`--brand`, `--surface`, `--risk-high`, `--risk-medium`, `--risk-low`).
  * **Geist & Geist Mono**: Official Next.js fonts optimized for high-density administrative dashboards.
* **Backend**:
  * **FastAPI**: High-throughput asynchronous Python web framework providing OpenAPI/Swagger documentation.
  * **CORS Middleware**: Secure cross-origin communication between local dev port 3000 and API port 8000.
* **Database & ORM**:
  * **SQLAlchemy 2.0**: Relational mapping with cascades, foreign keys, indexed queries, and aggregation queries.
  * **SQLite / PostgreSQL**: Normalized relational storage housing 8,868 works, 542 MPs, and over 15,000 transaction line-items.
* **Data Science & AI**:
  * **Pandas & NumPy**: In-memory vectorization, aggregation by peer groups, and baseline calculation.
  * **SciPy / Statistics**: Median statistics, standard deviations, and Herfindahl-Hirschman market concentration metrics.

---

## 3. End-to-End System Workflow

```
[Raw Data Sources]
Allocated Limit for Hon'ble MPs (.xlsx/.csv)
Expenditure on Completed & Ongoing Works (.xlsx/.csv)
        │
        ▼
[Data Extraction & Normalization]
Extract District from IDA string, parse fiscal year from Work ID, normalize dates & amounts
        │
        ▼
[Dynamic Peer Grouping & Baselines]
Group by (work_type, state) to calculate Median Expenditure
Group by (work_type) to calculate Mean & StdDev for individual transactions
        │
        ▼
[Work-Level Multi-Signal Anomaly Scoring]
Compute Cost Outliers, Vendor Lock/Splitting, Timing Lags, Z-Scores, Duplicate Clusters
        │
        ▼
[Explainable AI Generation]
Create human-readable reasons and supporting metrics for every triggered signal
        │
        ▼
[MP Portfolio Roll-up]
Compute expenditure-weighted risk average across constituent works + Underspend penalty
        │
        ▼
[Database Persistence]
Write normalized entities and scores to SQLite / Supabase tables
        │
        ▼
[FastAPI Serving Layer]
Serve high-performance filtered JSON payloads to Next.js
        │
        ▼
[User Interface (Team Vanguard Dashboard)]
Ministry Admins triage projects, inspect payment timelines, view peer ratios, request audits
```

---

## 4. Deep Dive: How the AI Risk Scoring Engine Works

The AI engine evaluates public works across **five orthogonal anomaly dimensions** at the work level, and then rolls up these findings into an **expenditure-weighted MP portfolio risk index**.

### 4.1 Work-Level Risk Scoring (0 to 100 Points)

The composite risk score for each work is defined as:
$$\text{Composite Score} = \min\left(100, S_{\text{cost\_peer}} + S_{\text{vendor}} + S_{\text{timing}} + S_{\text{anomaly}} + S_{\text{duplicate}}\right)$$

#### Signal 1: Peer Cost Outlier Model (`cost_peer` — Weight: 0 to 30)
* **Objective**: Identify public works whose total sanctioned outlay significantly exceeds the historical cost baseline for identical asset types within the same state.
* **Methodology**:
  1. Define peer bucket $B = (work\_type, state)$.
  2. Compute peer median expenditure $M_B = \text{median}(\{E_w \mid w \in B\})$.
  3. Calculate expenditure ratio:
     $$R = \frac{E_{\text{work}}}{M_B}$$
* **Scoring Rules**:
  * If $R > 1.5$: Cost inflation detected.
    $$S_{\text{cost\_peer}} = \min(30, \lfloor(R - 1) \times 20\rfloor)$$
  * If $R > 2.5$: Classified as **HIGH severity**.
  * If $R < 0.3$: Flagged as **LOW severity** (unusually low expenditure indicating possible stalled or incomplete project).

#### Signal 2: Vendor Concentration & Anti-Bill-Splitting Detector (`vendor` — Weight: 0 to 25)
* **Objective**: Detect contractor monopolization and deliberate bill-splitting designed to circumvent statutory procurement thresholds.
* **Methodology**:
  1. Calculate disbursement share $s_i$ for each vendor $i$:
     $$s_i = \frac{\text{Disbursement to Vendor}_i}{E_{\text{work}}}$$
  2. Compute the **Herfindahl-Hirschman Index (HHI)**:
     $$HHI = \sum_{i=1}^{k} s_i^2$$
* **Scoring Rules**:
  * **Bill-Splitting**: If a single contractor receives all disbursements across $N \ge 4$ payments:
    $$S_{\text{vendor}} = \min(25, 10 + N \times 2)$$
    *(High severity if $N \ge 8$, indicative of fragmented payments below tendering limits).*
  * **Vendor Monopoly**: If $k > 1$ vendors exist but $HHI > 0.7$, the vendor dominating the lion's share is penalized:
    $$S_{\text{vendor}} = \lfloor HHI \times 20\rfloor$$
  * **Shell Entity Fragmentation**: If $k > 10$ distinct vendors are used on a single localized project:
    $$S_{\text{vendor}} = \min(15, k - 5)$$

#### Signal 3: Payment Timing & Velocity Model (`payment_timing` — Weight: 0 to 20)
* **Objective**: Identify lingering stale projects and rushed disbursements (e.g., "March rush") without verified milestone physical progress.
* **Methodology**:
  * **Stale Work Detection**: Compare transaction disbursement dates $t_{\text{payment}}$ against the sanction Fiscal Year end $t_{\text{FY\_end}}$:
    $$\Delta t_{\text{months}} = \text{Months}(t_{\text{payment}} - t_{\text{FY\_end}})$$
    If $\Delta t_{\text{months}} > 18$ months, a penalty of $+5$ is accumulated per late payment (up to 20 points). Lags $> 36$ months are flagged as **HIGH severity**.
  * **Rush Velocity Spending**: If a work has $N \ge 3$ disbursements, compute the total date span:
    $$\Delta D = \max(t_{\text{payment}}) - \min(t_{\text{payment}})$$
    If $\Delta D \le 7\text{ days}$, it indicates rapid bulk disbursements clustered in a single week:
    $$S_{\text{timing}} = \min(20, S_{\text{timing}} + \min(10, N))$$

#### Signal 4: Statistical Payment Outlier & Z-Score Detector (`amount_anomaly` — Weight: 0 to 15)
* **Objective**: Detect individual payment vouchers whose amounts deviate radically from standard expenditure distributions for that work category.
* **Methodology**:
  1. Fit distribution parameters $(\mu_{\text{type}}, \sigma_{\text{type}})$ for all payments within each work category across India.
  2. For every payment voucher amount $x$, compute standard score:
     $$Z = \frac{|x - \mu_{\text{type}}|}{\sigma_{\text{type}}}$$
* **Scoring Rules**:
  * For each payment where $Z > 2.5$ standard deviations, add $+5$ points (capped at 15 points).

#### Signal 5: Duplicate Asset & Proximity Clustering (`duplicate` — Weight: 0 to 10)
* **Objective**: Detect ghost assets or duplicate sanctions where multiple identical works are sanctioned in the same administrative block or district during the same fiscal year.
* **Methodology**:
  1. Define duplication key: $K = (MP, work\_type, district, fiscal\_year)$.
  2. Count occurrences $C_K$.
* **Scoring Rules**:
  * If $C_K > 3$:
    $$S_{\text{duplicate}} = \min(10, (C_K - 3) \times 2)$$
    *(High severity if $C_K > 6$).*

---

### 4.2 MP-Level Portfolio Risk Aggregation

Individual works are aggregated to produce a comprehensive portfolio risk rating for all 542 Members of Parliament:

1. **Expenditure-Weighted Portfolio Risk**:
   $$\bar{S}_{\text{MP}} = \frac{\sum_{w \in W_{\text{MP}}} \left( S_w \times \max(E_w, 1) \right)}{\sum_{w \in W_{\text{MP}}} \max(E_w, 1)}$$
   This guarantees that high-value works carry proportional significance compared to minor works.

2. **Dormancy & Underspend Risk Penalty**:
   * MPs are allocated ₹5 Crore annually. If fund utilization $U = \frac{\text{Total Disbursed}}{\text{Allocated Amount}} \times 100\%$ falls below 30%:
     $$S_{\text{underspend}} = \min\left(40, \lfloor(30 - U) \times 1.5\rfloor\right)$$
   * If an MP has active fund allocations but **zero recorded expenditure**:
     $$S_{\text{underspend}} = 40\text{ (HIGH severity)}$$

3. **Final MP Risk Score**:
   $$\text{MP Overall Risk} = \min\left(100, \lfloor \bar{S}_{\text{MP}} + S_{\text{underspend}} \rfloor\right)$$
   * $\ge 50$: **HIGH Review Priority**
   * $25 \le \text{Score} < 50$: **MEDIUM Review Priority**
   * $< 25$: **LOW Review Priority**

---

## 5. Explainable AI (XAI) Evidentiary Framework

A core differentiator of Team Vanguard's architecture is that **no score exists in isolation**. Every positive risk component triggers an evidentiary record in `work_risk_signals`:

| Signal Type | Severity | Reason Generated by AI | Concrete Evidentiary Data Stored |
|---|---|---|---|
| `cost_peer` | **HIGH** | Work expenditure is 499% above peer median for 'Borewell/Tubewell' works in Uttar Pradesh. | `This work: Rs. 5,99,000 \| Peer median: Rs. 1,00,000 \| Ratio: 5.99x` |
| `vendor_concentration` | **HIGH** | Single vendor 'Maa Durga Workshop' received all 12 payments totaling Rs. 5,99,940. Potential bill-splitting. | `Vendor: Maa Durga Workshop \| Payments: 12 \| Total: Rs. 5,99,940` |
| `payment_timing` | **HIGH** | Payments still being disbursed 38 months after FY 2021-2022 ended. Stale work. | `FY: 2021-2022 \| Latest payment: 14-May-2025 \| Lag: 38 months` |
| `rush_spending` | **MEDIUM** | All 4 payments were made within 3 day(s). Possible end-of-period rush. | `First: 28-Mar-2024 \| Last: 31-Mar-2024 \| Payments: 4` |
| `amount_anomaly` | **HIGH** | Payment amount(s) are statistical outliers for 'Community Hall' works. Largest: Rs. 48,00,000. | `Work-type mean: Rs. 8,20,000 \| Std: Rs. 3,40,000` |
| `duplicate_work` | **HIGH** | MP has 8 works of type 'Installation of Solar Lights' in Nadia during FY 2024-2025. | `Count: 8 \| District: Nadia \| Type: Installation of Solar Lights` |

---

## 6. Database Schema Design

The relational database layer is modeled in SQLAlchemy ([backend/app/models/work.py](file:///c:/Users/lenovo/Desktop/mplads-ai-risk-intelligence/backend/app/models/work.py)):

### 1. `works` Table
* `work_id` (VARCHAR, PK): Government work identifier (e.g., `WS/MP643/2025-2026/177006`).
* `work_type` (VARCHAR): Description/category of public infrastructure.
* `state`, `district`, `constituency` (VARCHAR): Administrative jurisdictions.
* `mp_name` (VARCHAR): Sponsoring Member of Parliament.
* `ida` (VARCHAR): Implementing District Authority.
* `fiscal_year` (VARCHAR): Financial year of sanction.
* `total_expenditure` (FLOAT): Aggregate disbursed amount.
* `payment_count` (INTEGER), `unique_vendors` (INTEGER).
* `first_payment_date`, `last_payment_date` (DATETIME).
* `latest_payment_status` (VARCHAR).

### 2. `work_risk_scores` Table
* `work_id` (VARCHAR, FK): References `works.work_id`.
* `overall_score` (FLOAT): 0 to 100 composite risk score.
* `risk_level` (VARCHAR): `HIGH`, `MEDIUM`, or `LOW`.
* `cost_peer_score` (FLOAT): 0 to 30.
* `vendor_score` (FLOAT): 0 to 25.
* `payment_timing_score` (FLOAT): 0 to 20.
* `amount_anomaly_score` (FLOAT): 0 to 15.
* `duplicate_score` (FLOAT): 0 to 10.

### 3. `work_risk_signals` Table
* `id` (INTEGER, PK).
* `work_id` (VARCHAR, FK): Associated work.
* `signal_type` (VARCHAR): Category (`cost_peer`, `vendor_concentration`, etc.).
* `severity` (VARCHAR): `HIGH`, `MEDIUM`, or `LOW`.
* `explanation` (TEXT): Natural-language forensic justification.
* `supporting_data` (TEXT): Specific numerical values, baselines, and vendor names.

### 4. `work_payments` Table
* `id` (INTEGER, PK).
* `work_id` (VARCHAR, FK): Associated work.
* `vendor_name` (VARCHAR): Contractor name.
* `amount` (FLOAT): Transaction voucher amount in INR.
* `payment_date` (DATETIME): Date of disbursement.
* `payment_status` (VARCHAR): Transaction status.

### 5. `mp_risk_scores` & `mp_risk_signals` Tables
* Stores MP-level allocations, total disbursements, utilization percentages, transaction counts, and portfolio risk scores across all 542 MPs.

---

## 7. Frontend User Experience & Workflow

The user interface built by **Team Vanguard** delivers an intuitive audit workflow:

1. **Portfolio Macro Metrics**:
   * Header displays **Team Vanguard · SIH 2026 · Problem SIH26102**.
   * Top-level metric cards: **Total Monitored Works (8,868)**, **Total Monitored MPs (542)**, **Works Needing Review (8,570)**, and **Total Disbursed (₹418.5Cr)**.
2. **Review Queues (MPs vs. Works)**:
   * Tabbed interface allowing auditors to switch between high-priority MPs and specific high-risk work projects.
   * Quick filter toggles (`HIGH`, `MEDIUM`, `LOW`, `ALL`) and instant search across MP names, districts, and work IDs.
3. **Investigation Dossier View (`/work/[id]`)**:
   * **Review Score Badge**: Large numeric score (0–100) color-coded by severity.
   * **Active Review Flags**: Card-by-card breakdown of triggered signals with exact evidence.
   * **Comparative Peer Outlay**: Dynamic visual bar comparing this project's cost against the state median for similar works.
   * **Signal Fingerprint**: Visual breakdown of all 5 anomaly components.
   * **Payment Timeline**: Detailed audit table of individual payment vouchers, vendors, and dates.
   * **Action Buttons**: Direct human-in-the-loop options (*"Request Audit"*, *"Mark Resolved"*).

---

## 8. Summary of Achievements
* **100% Real Government Data**: Fully operational across 8,868 real sanctioned works and 542 MPs.
* **Deterministic & Explainable**: Mathematical algorithms replace opaque black-box scoring.
* **Fast & Responsive**: Sub-50ms API response times via indexed SQLite/SQLAlchemy queries and optimized Next.js rendering.
* **Audit Ready**: Meets all problem requirements for SIH 2026 Problem Statement SIH26102.
