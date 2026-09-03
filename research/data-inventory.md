# Data Inventory & Strategy

## Available Government Data (Based on MPLADS Dashboard)
*Note: This must be verified against actual available open data or scraped dashboard data for the hackathon prototype.*

| Field | Source | Availability | Data Type | Potential Use | Data Quality | Required Preprocessing |
|-------|--------|--------------|-----------|---------------|--------------|------------------------|
| `project_id` | MPLADS Dashboard | Yes | String/Int | Unique identifier | Good | None |
| `description` | MPLADS Dashboard | Yes | Text | Similarity check | Variable | NLP cleaning, embedding |
| `category` | MPLADS Dashboard | Yes | Categorical | Peer grouping | Good | Standardization |
| `state` & `district` | MPLADS Dashboard | Yes | Categorical | Geo grouping | Good | Standardization |
| `sanctioned_amount` | MPLADS Dashboard | Yes | Numeric | Cost anomaly | Good | Currency parsing |
| `released_amount` | MPLADS Dashboard | Yes | Numeric | Financial tracking | Good | Currency parsing |
| `expenditure` | MPLADS Dashboard | Yes | Numeric | Utilization check | Good | Currency parsing |
| `physical_progress` | MPLADS Dashboard | Yes | Percentage/Categorical | Progress mismatch | Variable | Standardization |
| `start_date` / `expected_completion` | Dashboard | Partial | Date | Delay risk | Variable | Date parsing |
| `latitude` / `longitude` | PAIMANA/Dashboard | Partial | Float | Distance calculation | Low/Missing | Geo-imputation/Mocking |

## Synthetic Data / Mocking Strategy
For the hackathon, if certain granular fields (like exact latitude/longitude or highly specific timeline dates) are missing from the public datasets, we will use **CLEARLY LABELED SYNTHETIC DATA** to demonstrate the AI risk intelligence capabilities. We will not pass off mock data as real government data.
