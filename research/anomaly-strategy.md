# Anomaly Detection Strategy

Our platform uses five core modules to generate a unified risk score.

## Module 1: Cost Anomaly Detection
- **Concept**: Compare project cost against similar projects (peer grouping by category, district, scale).
- **MVP Approach**: Percentile analysis or z-score within peer groups.

## Module 2: Financial vs Physical Progress Mismatch
- **Concept**: Compare fund utilization percentage vs physical progress percentage.
- **MVP Approach**: Rule-based mismatch calculation (e.g., if utilization > 75% but physical progress < 40%, flag as high risk).

## Module 3: Project Delay Risk
- **Concept**: Predict likelihood of significant delay based on age, current progress, and historical patterns.
- **MVP Approach**: Simple statistical estimation or classification model using project age vs expected timeline.

## Module 4: Duplicate / Similar Project Detection
- **Concept**: Identify overlapping projects that may indicate duplicate funding or inefficiencies.
- **MVP Approach**: Text embeddings (TF-IDF or sentence-transformers) on project descriptions + geographic proximity check (cosine similarity & Haversine distance).

## Module 5: Expenditure / Payment Anomalies
- **Concept**: Unusual expenditure timing or spikes inconsistent with physical progress.
- **MVP Approach**: Basic statistical checks on available disbursement dates. (Requires clear distinction between available data and ideal transaction data).

## Unified Risk Score
A weighted aggregate of the signals, e.g., Cost (25%), Progress (25%), Delay (20%), Similarity (20%), Payment (10%).
