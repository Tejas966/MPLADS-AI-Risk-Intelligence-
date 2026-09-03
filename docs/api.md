# API Design Contract

Base URL: `/api/v1`

## Endpoints

### `GET /projects`
Returns a paginated list of projects, with optional filters for district, state, or risk level.

### `GET /projects/high-risk`
Returns a prioritized list of projects with a risk score above a certain threshold, sorted by score descending.

### `GET /projects/{id}/risk`
Returns the complete risk fingerprint and explanations for a specific project.
**Response format:**
```json
{
    "project_id": 23871,
    "risk_score": 87,
    "risk_level": "HIGH",
    "signals": {
        "cost_anomaly": 24,
        "progress_mismatch": 21,
        "delay_risk": 18,
        "similarity": 14,
        "payment_anomaly": 10
    },
    "explanations": [
        {
            "type": "cost_anomaly",
            "severity": "HIGH",
            "reason": "Project cost is 32% above peer median."
        },
        {
            "type": "progress_mismatch",
            "severity": "HIGH",
            "reason": "76% of funds utilized while only 39% physical progress reported."
        }
    ],
    "recommendation": "Priority field verification"
}
```

### `GET /projects/{id}/similar`
Returns a list of highly similar projects (duplicates/overlap candidates).

### `GET /analytics/overview`
Returns aggregate statistics for the dashboard.
