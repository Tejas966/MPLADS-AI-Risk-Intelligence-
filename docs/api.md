# API Documentation

Base URL: `/api/v1`

## Endpoints

### `GET /stats`
Returns aggregate statistics for the dashboard.
```json
{
  "total_works": 8868,
  "high_risk_works": 1222,
  "medium_risk_works": 7348,
  "low_risk_works": 298,
  "total_mps": 542,
  "high_risk_mps": 183,
  "total_disbursed": 4185071006,
  "total_allocated": 74112779872.2
}
```

### `GET /mps`
Returns a list of MPs with aggregated risk scores.
**Query Parameters:**
- `risk_level` (optional): Filter by HIGH, MEDIUM, LOW
- `state` (optional): Filter by state
- `search` (optional): Search by MP name or constituency
- `limit` (optional): Max number of results (default 200, max 600)

### `GET /mps/{mp_name}/risk`
Returns the risk fingerprint, explanations, and child works for a specific MP.

### `GET /works`
Returns a list of individual works.
**Query Parameters:**
- `risk_level` (optional): Filter by HIGH, MEDIUM, LOW
- `state` (optional): Filter by state
- `work_type` (optional): Filter by type of work
- `mp_name` (optional): Filter by MP name
- `search` (optional): Search by work ID, MP name, or district
- `limit` (optional): Max number of results (default 200, max 500)

### `GET /works/{work_id}/risk`
Returns detailed risk analysis for a specific work, including the payment timeline, AI explanations, and peer comparison.