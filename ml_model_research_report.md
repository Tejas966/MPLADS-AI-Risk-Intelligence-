# ML Model Research Report: MPLADS AI Risk Intelligence Platform
### Team Vanguard · Smart India Hackathon 2026 · Problem Statement SIH26102
**Research Assignment: Model Selection for Anomaly & Risk Detection**
**Prepared for:** Team Vanguard
**Status:** Research & Recommendation Only — No code, no implementation

---

> **Scope Declaration:** This is a pure research document. It does not implement any model, does not modify the existing codebase, does not produce APIs, and does not generate training code. Its sole purpose is to inform Team Vanguard's architectural decision about which ML model family is most appropriate for the MPLADS Risk Intelligence Platform.

---

## SECTION 1 — EXECUTIVE SUMMARY

### What problem are we solving?

India's MPLADS (Members of Parliament Local Area Development Scheme) disburses ₹5 crore per MP per year — roughly ₹2,710 crore annually across 542 MPs — for local infrastructure works. This money flows through a chain of district authorities, implementing agencies, contractors, and payment vouchers. The scale, diversity of geography (36 states and UTs), and variety of work types (borewells, community halls, roads, drains, school equipment) make manual review of every work practically impossible.

Our project builds an AI-powered platform to help auditors and government administrators identify which works deserve closer examination. The system currently uses a **deterministic statistical engine** that produces a risk score (0–100) for every work based on five mathematically defined signals: peer cost comparison, vendor concentration (HHI), payment timing anomalies, individual payment Z-scores, and duplicate asset detection.

The question this research addresses is: **Should we, and if so how, add a machine learning layer on top of this deterministic engine — and which ML model is best suited to do so?**

### Why is an ML model being considered?

The current deterministic engine has a deliberate design philosophy: every point in a risk score is traceable to a specific formula. This is admirable and important for an audit system. However, deterministic rule systems have known limitations:

1. **Fixed thresholds are brittle.** A threshold of 1.5× peer median is reasonable on average, but it may be too sensitive in some work categories (where legitimate cost variation is high) and not sensitive enough in others.
2. **Interactions are not modeled.** A work with a cost ratio of 1.8×, an HHI of 0.75, and three payments in one week is almost certainly more suspicious than one with any single signal in isolation. Rules can be written for some combinations, but the space of interactions grows exponentially.
3. **The system cannot learn.** If auditors consistently find that certain combinations of signals lead to verified irregularities, the current rule engine cannot automatically adjust to reflect that knowledge.
4. **Patterns invisible to rules.** Some anomalies only become visible when many features are viewed together in a high-dimensional space — something that ML models can represent naturally.

A well-chosen ML model could address all four of these limitations, **while keeping the statistical signals as its inputs**, rather than replacing them.

### Why is a black-box model undesirable?

The audit and government context makes explainability a non-negotiable requirement, not a nice-to-have feature.

Consider the consequences:

- An auditor receives a risk score of 87/100 from a black-box neural network. They need to justify dispatching a district collector for a physical inspection. The justification cannot be "the AI said so."
- A contractor disputes a finding and demands to know why they were flagged. A model that cannot explain itself creates legal and ethical risk.
- A Member of Parliament contests a rating. Without traceable, verifiable reasoning, the entire system loses credibility.
- CAG guidelines and government audit standards require evidentiary justification, not probabilistic predictions.
- SIH judges — and more importantly, real government stakeholders — will ask "why." If the answer is a probability without reasoning, the system fails its fundamental purpose.

This is not a marketing or cosmetic constraint. It is a core system requirement: **every risk score must be accompanied by 3–4 specific, measurable reasons expressed in plain English that correspond to actual model inputs and their contributions.**

### What makes this different from a generic fraud-detection problem?

Generic fraud detection (e.g., credit card fraud) has several properties that our problem does NOT share:

- **Abundant confirmed labels.** Credit card companies know definitively which transactions were fraudulent. We do not have confirmed fraud labels; we have statistical signals suggesting anomalies.
- **Real-time low-latency requirements.** Card fraud must be detected in milliseconds. Our system runs in batch mode over historical data.
- **High data volume.** Credit card datasets have millions of labeled records. We have ~8,868 works across 542 MPs.
- **Homogeneous data.** Card transactions are numerically uniform. Our data spans 36 states, hundreds of work types, and multiple fiscal years with varying baselines.
- **Simple target variable.** Card fraud is binary (fraud/not fraud). Our target is a risk prioritization ranking — we want auditors to look at the right works, not classify every work as definitively fraudulent or clean.

Additionally, our problem has a **critical ethical dimension**: incorrectly labeling a legitimate MP's work as high-risk has real-world consequences for a public official. The system must be conservative and transparent.

### The 3 Models Selected

After critical evaluation, this report recommends:

1. **XGBoost (Extreme Gradient Boosting) with SHAP Explanations**
   — The strongest candidate for a supervised or semi-supervised setting where some labeled or pseudo-labeled data can be assembled. Excellent at capturing nonlinear interactions between our statistical signals. SHAP provides mathematically grounded, feature-level explanations. Well-established in financial risk literature.

2. **Explainable Boosting Machine (EBM / InterpretML)**
   — A genuinely interpretable model (not just "explainable via SHAP post-hoc"). The EBM produces a glass-box model where each feature's contribution is directly readable. The gold standard for settings where auditors and government officials require the highest level of trust and the explanation must be the model, not a separate layer. Suitable for both supervised and semi-supervised scenarios.

3. **Isolation Forest**
   — The strongest candidate for Scenario B (no confirmed labels). A purpose-built anomaly detection model that does not require fraud labels to train. Identifies works that are "difficult to isolate" — i.e., that stand apart from the majority in a high-dimensional feature space. Its isolation scores are not inherently explainable, but SHAP has been extended to work with Isolation Forest, enabling feature-level attribution.

These three models were selected because together they cover:
- The labeled data scenario (XGBoost + EBM)
- The unlabeled data scenario (Isolation Forest)
- Genuine interpretability (EBM)
- Strong performance with SHAP-based post-hoc explanation (XGBoost)
- Anomaly-native detection without fraud label assumptions (Isolation Forest)

They were selected critically — **not** because they are popular, but because their properties match the specific constraints of this audit system.

---

## SECTION 2 — UNDERSTANDING OUR CURRENT SYSTEM

### What the current statistical engine actually does

The current engine is a deterministic, additive risk scorer. "Deterministic" means that given the same input data, it always produces exactly the same score. "Additive" means the final score is the sum of five independent sub-scores, each measuring a different dimension of anomaly.

**The five signals (and why they matter for ML):**

#### Signal 1: Cost Peer Comparison (`cost_peer`, 0–30 points)

The engine groups works by `(work_type, state)` and computes the median expenditure for each group. A work's expenditure ratio is then `work_expenditure / peer_group_median`. Ratios above 1.5× trigger a score; above 2.5× is HIGH severity.

*Why this is a good ML feature:* The raw ratio value (e.g., 2.8) is more informative for an ML model than the binned score it produces. The ML model can learn that a ratio of 2.8 combined with an HHI of 0.82 is much more suspicious than a ratio of 2.8 with a normally distributed single vendor. The current rule cannot learn this interaction.

*Critical challenge:* The peer median is computed across all works of the same type in the same state. For rare work types with few peer comparisons, this median may be unstable. An ML model trained on these ratios inherits this instability. This is a genuine weakness that must be acknowledged.

#### Signal 2: Vendor Concentration / HHI (`vendor`, 0–25 points)

The Herfindahl-Hirschman Index (HHI) measures how concentrated vendor payments are. An HHI of 1.0 means one vendor got all the money. An HHI close to 0 means many vendors split it evenly. High HHI (>0.7) or single-vendor bill-splitting (≥4 identical payments to one vendor) triggers this signal.

*Why this is a good ML feature:* HHI is a continuous, well-calibrated numerical feature. An ML model can treat it as-is without any binning. The model can discover that HHI matters much more for large-value works than small-value ones — a nuance the current rules don't fully capture.

*Critical challenge:* In some legitimate work categories (e.g., highly specialized equipment installation), having a single vendor is entirely normal. The rule engine applies HHI universally. An ML model, if trained carefully, could learn to be less suspicious of single-vendor concentration in categories where it is structurally expected.

#### Signal 3: Payment Timing (`payment_timing`, 0–20 points)

Two sub-signals here: stale payments made more than 18 months after the fiscal year end (suggesting book-entry fraud or non-existent works), and rush spending (3+ payments within 7 days, suggesting end-of-year panic disbursement to consume budgets).

*Why this is a good ML feature:* The derived features — `lag_months_since_fy_end` and `payment_span_days` — are both continuous and meaningful. An ML model can learn threshold-free relationships between these timing features and risk outcomes.

*Critical challenge:* Rush spending can be legitimate (bulk material delivery). Stale payments can also be legitimate (delayed administrative processing). The current rule penalizes both uniformly. A trained ML model could learn contextual differences if sufficient historical data with outcomes is available.

#### Signal 4: Individual Payment Z-Scores (`amount_anomaly`, 0–15 points)

Each payment amount is compared against the distribution of all payments for that work type. Payments more than 2.5 standard deviations above the mean are flagged.

*Critical challenge to our own assumption:* Z-scores assume approximately normal distribution of payment amounts. Government expenditure data is typically right-skewed (most works are small; a few are very large). Z-scores applied to skewed distributions can behave unpredictably — flagging moderate-sized payments in low-cost categories while missing genuinely large ones in high-cost categories. An ML model that uses the raw z-score as a feature inherits this problem. This is worth investigating before ML training begins.

#### Signal 5: Duplicate Asset Detection (`duplicate`, 0–10 points)

Multiple identical works (`work_type × MP × district × fiscal_year`) in the same administrative unit suggest ghost assets or paper works.

*Why this is a good ML feature:* The duplicate count is a clean integer feature. ML models can learn that the threshold of 3+ duplicates is not universal — the significance of duplication varies by work type and geographic context.

### Why these signals are valuable features for ML

These five signals are not just scores to be replaced — they are **rich derived features** that encode domain knowledge about government financial irregularities. An ML model that receives these signals as inputs benefits from years of audit domain expertise already embedded in how they are calculated.

The choice is therefore not "statistical engine vs. ML model." The choice is about **architecture.**

### How should ML relate to the existing statistical engine?

There are four conceptual options:

**Option A: ML Replaces the Statistical Engine**

The ML model takes raw features (expenditure, vendor names, payment dates, districts) and produces a risk score directly, bypassing the existing signals entirely.

*Advantage:* Maximum flexibility; ML can discover patterns the rules missed.
*Disadvantage:* Throws away domain expertise already embedded in the signals. Dramatically increases data requirements. Explanation becomes harder because raw features like "expenditure" have no contextual meaning without peer comparison. This option is not recommended.

**Option B: ML and Statistical Engine Run Independently, Scores Are Fused**

Both systems produce a 0–100 score. A fusion mechanism (average, weighted sum, or another ML model) combines them.

*Advantage:* Redundancy; the two systems can check each other.
*Disadvantage:* If the ML model was trained on the same statistical signals, the fusion is double-counting evidence. The scores are not independent. This option is architecturally fragile.

**Option C: Statistical Features → ML → Explanation**

The ML model receives the statistical signals (the raw continuous values, not just the binned scores) as features, along with other raw features. The ML model learns how to weight these signals against each other and produces a risk prediction. The explanation layer then attributes the ML prediction to the contributing features.

*Advantage:* ML learns signal interactions that rules cannot capture. The statistical engine does the domain-specific feature engineering; the ML model does the combination. Explanation is straightforward because the features are already interpretable.
*Disadvantage:* If the ML model is trained on the same data that produced the statistical signals, there is a risk of circularity — especially if pseudo-labels derived from statistical scores are used as training targets. This must be carefully managed.

**Option D: ML Predictions Are Validated by Statistical Rules**

ML produces a risk ranking; the statistical engine then verifies or modifies the ML output using hard rules.

*Advantage:* Rules provide guardrails against ML hallucination.
*Disadvantage:* Complex to maintain two separate scoring systems with overrides. Hard to explain when the two systems disagree.

**This report recommends Option C** as the most coherent architecture for our project, with an important caveat: the statistical signals fed to the ML model should be their **raw continuous values** (e.g., `peer_cost_ratio = 2.8`, `hhi = 0.82`, `payment_z_score = 3.1`) rather than the already-binned scores (e.g., `cost_peer_score = 30`). This preserves information that is lost in binning and allows the ML model to make finer distinctions.

---

## SECTION 3 — DATA AND LABEL PROBLEM

This section is the most critical part of the research, because the choice of ML model depends fundamentally on what data is available to train it.

### What supervised learning requires

A supervised learning model (like XGBoost or a logistic regression) learns by example. It requires a dataset where each work is labeled with a known outcome:

- "This work was confirmed fraudulent in a CAG audit."
- "This work was investigated and found legitimate."
- "This work had a verified irregularity."

The model learns which patterns of features predict which outcomes. The quality of the learned model is entirely dependent on the quality and quantity of these labels.

**The minimum dataset size for reliable supervised learning:** There is no universal answer, but as a rough practical guideline, for a tabular dataset with ~15–20 features, at least 500–1,000 labeled examples of the minority class (fraud/irregularity) are needed for a model to learn meaningful patterns. This is substantially more than the confirmed audit outcomes likely available in our dataset.

### What unsupervised anomaly detection requires

Unsupervised models (like Isolation Forest or One-Class SVM) do not require any labels. They learn from the structure of the data itself. The core assumption is: **most works are normal; anomalies are different from the norm in measurable ways.**

Unsupervised models do not predict "fraud." They identify **anomalies** — works that are statistically unusual compared to the rest. These are not the same thing. An anomaly could be legitimate (a genuine high-cost infrastructure project) or suspicious (inflated cost padding). The distinction requires human judgment.

This is an important ethical and methodological point: **an anomaly score is not a fraud probability.**

### What pseudo-labeling and weak supervision mean

These are techniques for operating in the difficult middle ground between fully labeled and fully unlabeled data.

**Pseudo-labeling:** Use an unsupervised model (or the existing statistical engine) to assign preliminary labels. For example: "Works with a deterministic risk score above 70 are treated as Pseudo-High-Risk. Works below 20 are treated as Pseudo-Low-Risk." These pseudo-labels are then used to train a supervised model.

**Critical risk:** If pseudo-labels are derived from the same statistical signals that form the ML model's features, the ML model is essentially learning to replicate the rule engine — not to discover genuinely new patterns. This is **circular reasoning** and a subtle but serious methodological error. The ML model will appear to perform well in validation (because it replicates the rules) but may not generalize to genuinely new patterns of irregularity.

**Weak supervision:** More sophisticated than pseudo-labeling. Multiple imperfect labeling sources (the statistical signals, domain expert rules, historical audit findings, keyword patterns in work descriptions) are combined using a principled framework (such as Snorkel, developed at Stanford) to produce probabilistic labels. This is technically superior but more complex to implement for a hackathon prototype.

### Why confirmed fraud labels are difficult to obtain

1. **Audit cycles are long.** CAG audits take months to years. Confirmed outcomes may not be linked to individual MPLADS work IDs in a machine-readable format.
2. **Outcomes are politically sensitive.** Confirmed fraud findings involving MPs may not be publicly available in structured form.
3. **Selection bias.** Works that were historically audited may not be a random sample — auditors may have specifically targeted works that were already suspicious, meaning historical confirmed-fraud data is not representative of the full population.
4. **Definition ambiguity.** "Irregularity," "suspected fraud," "procedural non-compliance," and "confirmed corruption" are different things that may be conflated in any available records.

### Scenario A vs. Scenario B

**Scenario A: Reliable audit labels exist.**

The ideal scenario. Each of the 3 candidate models can be trained with clear, confirmed outcomes. Standard supervised learning evaluation metrics apply. Pseudo-labeling risks are avoided.

**Scenario B: No reliable labels exist.**

The realistic near-term scenario. The team must choose between:
- Pure unsupervised anomaly detection (Isolation Forest)
- Pseudo-labeling from the statistical engine (with circular reasoning risk)
- Weak supervision combining multiple signal sources
- Expert labeling: domain experts manually review a small sample of works and label them, creating a small verified dataset

In Scenario B, it is important to communicate clearly in all project documentation: **the model identifies anomalies and risk patterns, not confirmed fraud.** Human review is required before any action is taken.

---

## SECTION 4 — MODEL 1: XGBoost WITH SHAP EXPLANATIONS

### 4.1 What is the model?

XGBoost (eXtreme Gradient Boosting) is an ensemble learning algorithm based on gradient-boosted decision trees. It was developed by Tianqi Chen and Carlos Guestrin (Chen & Guestrin, 2016) and is widely regarded as one of the strongest models for tabular data in both academic benchmarks and real-world applications.

"Ensemble" means it builds many decision trees, each one trying to correct the errors of the ones before it. The final prediction is the weighted sum of all tree predictions. "Gradient boosting" refers to how each new tree is built by focusing on the examples where previous trees made the largest mistakes — a technique derived from functional gradient descent in statistical learning (Friedman, 2001).

XGBoost is not inherently interpretable. Its final model is the aggregate of hundreds of decision trees, which no human can read directly. However, SHAP (SHapley Additive exPlanations), developed by Lundberg & Lee (2017), provides a principled, mathematically grounded method for attributing each prediction to its contributing features.

### 4.2 How does it work?

At its core, XGBoost builds trees in sequence:

1. Start with an initial prediction (e.g., the mean risk score in the training set).
2. Compute the error (residual) between the prediction and the true label.
3. Build a new decision tree specifically to predict these residuals — i.e., where the current model is wrong.
4. Add this new tree to the ensemble with a small learning rate (so the model improves gradually rather than overfitting to any single tree).
5. Repeat hundreds or thousands of times.

The final prediction for any new work is the sum of all tree outputs.

For our project, the "label" in Scenario A would be a confirmed audit outcome (e.g., 1 = irregularity found, 0 = legitimate). In Scenario B, it could be a pseudo-label derived from the statistical engine, with all the caveats discussed above.

**SHAP — why it matters:**

SHAP values answer the question: "How much did each feature contribute to this particular prediction, compared to the average prediction?" This is derived from cooperative game theory (Shapley, 1953) — specifically from the concept of fair attribution of a joint outcome among players.

For a work with Risk Probability = 0.78:
- `peer_cost_ratio = 2.8` might contribute +0.24 (pushing the prediction higher)
- `hhi = 0.82` might contribute +0.18
- `payment_timing_lag_months = 6` might contribute +0.05
- `fiscal_year` might contribute +0.03
- Other features might have negative contributions (pushing the prediction lower)

The SHAP values for all features sum to the model's prediction minus the baseline, ensuring mathematical consistency. This is a fundamentally stronger guarantee than generic "feature importance" scores.

### 4.3 Why could it work for MPLADS?

XGBoost is particularly well-suited to our feature set because:

1. **It handles nonlinear interactions natively.** The relationship between `peer_cost_ratio` and `vendor_hhi` is not linear — a work with ratio 2.0 and HHI 0.9 is not simply the sum of a work with ratio 2.0 (HHI = 0) and ratio 1.0 (HHI = 0.9). XGBoost trees can capture this interaction without being explicitly programmed to look for it.

2. **It handles mixed feature types.** Our feature set includes continuous values (ratio, HHI, Z-score), integers (payment count, duplicate count), and categorical features (state, work type, fiscal year). XGBoost handles all of these well, especially with appropriate preprocessing.

3. **It works on moderate-sized datasets.** XGBoost can produce meaningful models with thousands of training examples, not millions. Our dataset of ~8,868 works, even with limited labels, is within its practical range for a prototype.

4. **It has an established track record in financial risk detection.** XGBoost has been used in financial fraud detection, credit risk scoring, and audit analytics across numerous published studies (see e.g., Bhattacharyya et al., 2011, for boosted tree approaches in fraud detection; and the consistent XGBoost dominance in Kaggle financial tabular competitions post-2016).

5. **It handles missing values natively.** If some works have no payment date (so timing features cannot be computed), XGBoost can handle this as a native missing value without requiring imputation.

### 4.4 What type of patterns can it detect?

- **Compound anomalies:** Works where no single signal is extreme but the combination is suspicious. For example: ratio = 1.6, HHI = 0.65, timing lag = 20 months, Z-score = 2.1. No individual signal would trigger a HIGH alert, but their combination may suggest a pattern that historical audit outcomes confirm as problematic.
- **Category-specific thresholds:** Through its tree structure, XGBoost implicitly learns that "road construction in Uttar Pradesh" has different normal behavior from "borewell in Rajasthan" — and applies appropriately different sensitivity.
- **Feature interactions:** The model can learn that a high HHI is much more suspicious when the payment count is also high (suggesting deliberate bill-splitting) than when there is only one payment (suggesting a small project with one natural vendor).
- **Contextual patterns:** Fiscal year effects, state-level differences in administrative capacity, and work-type-specific cost structures can all be implicitly captured.

### 4.5 Explainability

**Important distinction:** XGBoost itself is NOT inherently interpretable. You cannot read the model and understand its decisions the way you can read a scorecard or a decision tree with 5 nodes.

What XGBoost offers through SHAP is **post-hoc local explainability** — an explanation generated separately after the model makes its prediction. This is real and mathematically principled, but it is different from the model itself being transparent.

**What SHAP provides for XGBoost:**

- **Local explanations:** For each individual work, SHAP tells you exactly which features pushed the risk prediction higher or lower, and by how much.
- **Global explanations:** Across all works, SHAP reveals which features are most important on average and how their values relate to risk predictions (via SHAP dependency plots).
- **Force plots:** Visual representation showing the baseline prediction, and each feature's contribution pushing the prediction toward or away from "high risk."
- **Feature importance:** Ranked list of features by their average absolute SHAP contribution across all works.

**Limitations of SHAP for XGBoost:**

1. SHAP values explain the model's prediction, not the true underlying risk. If the model has learned from biased pseudo-labels, SHAP values will faithfully explain a biased model.
2. SHAP values can sometimes appear contradictory to human intuition if the model has learned unexpected feature interactions.
3. For tree ensembles with many interaction terms, SHAP values can be counter-intuitive — e.g., a feature that appears globally important may have low SHAP for a specific prediction.
4. SHAP is computationally intensive for large models, though TreeSHAP (Lundberg et al., 2020) makes it efficient for tree-based models specifically.

**The key question for our system:** Can SHAP values reliably produce 3–4 human-understandable reasons? **Yes — if the features are themselves interpretable.** If our features are `peer_cost_ratio`, `hhi`, `payment_timing_lag_months`, `amount_zscore_max`, and `duplicate_count`, then SHAP values for these features directly map to understandable statements. This works. If our features are raw text embeddings or opaque numerical transformations, SHAP explanations become harder to communicate.

### 4.6 Hypothetical Example Prediction

**⚠️ This is a fully hypothetical example. All numbers are illustrative.**

Work: `WS/UP/KU/2024-2025/177006`

Features:
- `peer_cost_ratio = 2.8` (expenditure 2.8× peer median)
- `vendor_hhi = 0.82` (one vendor dominates, 82% concentration)
- `payment_timing_lag_months = 24` (payments 24 months after FY end)
- `payment_amount_zscore_max = 3.1` (largest payment 3.1σ above work-type mean)
- `duplicate_count = 2` (2 similar works in same district × FY)
- `state = "Uttar Pradesh"`, `work_type = "Borewell / Tubewell"`

**XGBoost + SHAP Output (hypothetical):**

Predicted Risk Probability: **0.81**

SHAP contributions (hypothetical):
- `peer_cost_ratio`: +0.29
- `vendor_hhi`: +0.19
- `payment_timing_lag_months`: +0.13
- `payment_amount_zscore_max`: +0.09
- `duplicate_count`: +0.02
- `state` (UP baseline): +0.05
- Other features: +0.04

**Top 4 auto-generated reasons:**
1. "Expenditure is 2.8× the median expenditure of comparable Borewell/Tubewell works in Uttar Pradesh." *(peer_cost_ratio, SHAP contribution: +0.29)*
2. "Vendor concentration is unusually high — a single vendor received approximately 82% of all payments (HHI = 0.82)." *(vendor_hhi, SHAP contribution: +0.19)*
3. "Payments were disbursed 24 months after the fiscal year 2024-2025 ended, suggesting significant delay in reporting or execution." *(payment_timing_lag_months, SHAP contribution: +0.13)*
4. "The largest individual payment is 3.1 standard deviations above the typical payment size for Borewell/Tubewell works." *(payment_amount_zscore_max, SHAP contribution: +0.09)*

### 4.7 Advantages

1. **State-of-the-art tabular performance.** In benchmark comparisons of tabular ML models, XGBoost consistently performs at or near the top (Grinsztajn et al., 2022, "Why Tree-based Models Still Outperform Deep Learning on Tabular Data").
2. **Interaction learning without explicit feature engineering.** The model automatically discovers that HHI + high payment count = higher risk than either alone.
3. **SHAP provides mathematically grounded, consistent explanations** — not a heuristic approximation.
4. **Handles missing values natively.** Many works in our dataset may have missing payment dates or incomplete vendor information.
5. **Fast inference.** Once trained, XGBoost predictions on thousands of works complete in seconds.
6. **Well-supported in the Python ecosystem.** The `xgboost` library is mature, well-documented, and integrates directly with `scikit-learn`, `pandas`, and the SHAP library.
7. **Retraining is straightforward.** As new verified audit outcomes become available, the model can be retrained or fine-tuned.
8. **Strong regularization.** XGBoost includes L1 and L2 regularization, making it less prone to overfitting than unregularized boosting.

### 4.8 Disadvantages

1. **Not inherently interpretable.** The model itself is a black box; SHAP provides post-hoc attribution which, while principled, is not the same as the model being transparent.
2. **Requires labels to reach full potential.** Without reliable confirmed audit outcomes, XGBoost must be trained on pseudo-labels, which introduces circular reasoning risk.
3. **Hyperparameter tuning required.** Learning rate, tree depth, number of estimators, regularization terms — these must be tuned carefully to avoid overfitting on a small dataset.
4. **Risk of data leakage.** If the statistical signals used as features were themselves computed from data that the model is trained on, and those signals were used to create pseudo-labels, the model may appear more accurate than it truly is.
5. **Explanation quality degrades with complex interactions.** SHAP explanations for works where many features interact in complex ways can produce values that are individually correct but collectively confusing.
6. **No built-in anomaly detection.** XGBoost is fundamentally a supervised classifier. In Scenario B (no labels), it cannot be directly applied without the pseudo-labeling bridge, which carries its own risks.

### 4.9 Data Requirements

- **Minimum dataset size:** ~500–1,000 works per class for reliable supervised learning. With pseudo-labels, the full dataset of 8,868 works can be used, but with the circular reasoning caveat.
- **Label availability:** Scenario A: directly usable. Scenario B: requires pseudo-labeling strategy.
- **Feature preprocessing:** Categorical features (state, work_type, fiscal_year) need encoding (label encoding or target encoding). Continuous features (ratio, HHI, Z-score) can be used directly with optional log transformation for skewed distributions.
- **Missing values:** Handled natively; no imputation strictly required, though strategy should be documented.
- **Retraining:** Can be retrained on new labeled batches. Full retraining from scratch is typically preferred to partial updates for tree-based models.
- **Class imbalance:** In practice, high-risk works will be a minority. XGBoost has a `scale_pos_weight` parameter specifically designed to handle class imbalance. This must be used.

### 4.10 Deployment Considerations

- **Python ecosystem:** Fully compatible with the existing stack (Python, pandas, NumPy). The `xgboost` and `shap` libraries are pip-installable.
- **Model size:** A trained XGBoost model with ~200 trees can be serialized to a file of a few MB. Trivially storable.
- **Training time:** On 8,868 rows with ~20 features, training time is seconds to low minutes. Not a bottleneck.
- **Inference time:** Batch scoring of all 8,868 works would complete in well under a second.
- **FastAPI integration:** The trained model can be loaded at API startup and called synchronously during work scoring. SHAP values can be computed at inference time and returned as part of the API response. This adds some latency (SHAP computation for one prediction takes ~milliseconds with TreeSHAP) but is entirely feasible.
- **Model versioning:** The model file should be versioned alongside the training data snapshot, hyperparameters, and evaluation metrics so that any prediction can be reproduced.

### 4.11 Suitability for Our Project

XGBoost is the most versatile of the three recommended models. It offers excellent performance, practical SHAP-based explanations, and seamless integration with the existing Python stack. Its primary weakness is the labeled data requirement, which must be honestly addressed.

For a hackathon prototype using pseudo-labels, it can demonstrate impressive explainable risk scoring. For a production system, it should be retrained progressively as verified audit outcomes accumulate. Its explanation mechanism (SHAP) is scientifically defensible and audit-friendly.

**Verdict:** Strong candidate, especially if any verified labels are available or if pseudo-labeling is done carefully and its limitations are transparently communicated.

---

## SECTION 5 — MODEL 2: EXPLAINABLE BOOSTING MACHINE (EBM / InterpretML)

### 5.1 What is the model?

The Explainable Boosting Machine (EBM) is an implementation of Generalized Additive Models with pairwise interaction terms (GA2M — Generalized Additive Models squared). It was developed by Rich Caruana, Yin Lou, and colleagues at Microsoft Research (Lou et al., 2012; Lou et al., 2013; Nori et al., 2019) and is available as open-source software through Microsoft's InterpretML library.

The EBM is a **glass-box model** — meaning the model itself is interpretable, not just explainable through a post-hoc tool. This is a fundamental distinction from XGBoost.

"Glass-box" means: a human can, in principle, understand exactly how the model arrives at its prediction by reading its components. This is the highest standard of transparency in machine learning, and it matters enormously for government audit applications.

### 5.2 How does it work?

The EBM is built on the Generalized Additive Model (GAM) framework. A standard GAM makes predictions as the sum of individual feature functions:

`Risk Score = f₁(peer_cost_ratio) + f₂(hhi) + f₃(payment_lag) + ... + intercept`

Each `f_i` is a smooth, learned function of a single feature. The EBM extends this with pairwise interaction terms:

`Risk Score = f₁(ratio) + f₂(hhi) + ... + f₁₂(ratio × hhi) + intercept`

The pairwise interaction `f₁₂(ratio × hhi)` means the model can learn that the combination of a high cost ratio and high HHI is more than just additive.

**How the functions are learned:**

EBM uses boosting to learn these shape functions, cycling through each feature repeatedly and fitting small "stumps" (single-split decision trees) for each one. This cycling ensures that each feature function is well-calibrated even when features are correlated. This is the key innovation that makes EBMs robust compared to standard GAMs (Caruana et al., 2015).

The result is a set of visual "shape functions" — one graph per feature — showing exactly how any value of that feature contributes to the risk prediction. A government administrator can literally look at the shape function for `peer_cost_ratio` and see: "For works with a ratio below 1.5, the contribution is near zero. Above 2.5, the contribution rises steeply."

### 5.3 Why could it work for MPLADS?

1. **The explanation IS the model, not a separate layer.** For a government audit application, this is transformative. There is no gap between "what the model computed" and "what the explanation says." With XGBoost + SHAP, the explanation is an approximation of the model's behavior. With EBM, they are the same thing.

2. **It is highly auditable.** An auditor can review the shape functions for each signal and verify that the model has learned reasonable risk patterns. For example: "The model learned that peer_cost_ratio above 2.0 significantly increases risk — does this make sense?" They can also detect if the model has learned something unexpected and question it.

3. **It handles our feature set perfectly.** Our features (peer_cost_ratio, hhi, payment_lag, z_score, duplicate_count) are exactly the type of well-defined numerical and categorical features that EBMs excel at.

4. **Published performance comparable to XGBoost on many tabular datasets.** Caruana et al. (2015) showed that EBMs can match XGBoost performance on many real-world datasets while being fully interpretable. On some datasets, EBMs actually outperform XGBoost due to their more principled handling of feature contributions.

5. **Genuine trust in audit contexts.** The National Institute of Health (NIH) and other regulated organizations have published on using EBMs for clinical risk scoring (Nori et al., 2019) precisely because regulators require glass-box transparency. Our audit context has analogous requirements.

### 5.4 What type of patterns can it detect?

- **Smooth nonlinear risk relationships:** The shape function for `peer_cost_ratio` might show a flat region up to 1.5×, a gradual rise between 1.5× and 2.5×, and a steep increase above 2.5×. This is the actual pattern learned from data — not a manually set threshold.
- **Pairwise interactions:** With interaction detection enabled, the EBM can model `f(ratio × hhi)` — the joint effect of high cost ratio and high vendor concentration.
- **Categorical patterns:** The contribution of specific work types or states to risk — e.g., learning that "road construction" has a different risk baseline than "borewell" — is represented through categorical shape functions.
- **U-shaped relationships:** If very low expenditure (suggesting incomplete works) is also risky, the EBM shape function for expenditure can naturally show a U-shape that rules cannot express elegantly.

### 5.5 Explainability

This is where EBM is uniquely superior.

**Native feature contributions:** Every prediction is decomposed as:

`f(ratio) contribution + f(hhi) contribution + f(timing) contribution + ... = risk prediction`

This is the model. Not a post-hoc approximation. The actual computation path.

**Shape function interpretability:** Each feature's shape function can be visualized as a graph. For `peer_cost_ratio`, you can literally show a government administrator: "Works with a cost ratio of 3.0 add 42 risk points from this feature alone. Works with a ratio of 1.2 add only 2 points." This is directly readable.

**Comparison to SHAP on XGBoost:**

| Property | EBM Native Explanation | XGBoost + SHAP |
|---|---|---|
| Mathematically exact | ✅ Yes — IS the model | ⚠️ Approximate (Shapley values) |
| Requires separate library | ❌ No | ✅ Yes (SHAP library) |
| Human-readable shape functions | ✅ Yes | ❌ Not natively |
| Local (per-prediction) explanation | ✅ Yes | ✅ Yes |
| Global (model-wide) explanation | ✅ Yes | ✅ Yes |
| Auditor can verify model is sane | ✅ Directly | ⚠️ Indirectly |

**Limitation:** EBM explanations are highly accurate for features that appear in the model. They can be less informative for complex interactions involving more than two features, because the EBM primarily models pairwise interactions. If a genuine risk pattern requires a three-way interaction (ratio × hhi × payment_count), the EBM may not capture it as well as XGBoost.

### 5.6 Hypothetical Example Prediction

**⚠️ This is a fully hypothetical example. All numbers are illustrative.**

Work: `WS/RJ/JD/2023-2024/093456`

Features:
- `peer_cost_ratio = 3.1`
- `vendor_hhi = 0.91`
- `payment_timing_lag_months = 30`
- `payment_amount_zscore_max = 1.8`
- `duplicate_count = 1`

**EBM Native Output (hypothetical):**

EBM intercept (baseline): 0.10
- `f(peer_cost_ratio=3.1)` = +0.31 ← shape function evaluated at 3.1
- `f(vendor_hhi=0.91)` = +0.22
- `f(payment_timing_lag_months=30)` = +0.16
- `f(payment_amount_zscore_max=1.8)` = +0.04
- `f(duplicate_count=1)` = 0.00
- `f(work_type="Borewell")` = +0.03 ← categorical contribution

Total Risk Score: **0.86**

**Top 4 auto-generated reasons (directly from shape functions — no post-hoc tool needed):**
1. "Expenditure is 3.1× the peer median for Borewell works in Rajasthan. This pattern contributes 31% of the risk prediction." *(peer_cost_ratio: +0.31)*
2. "Vendor concentration is extreme — one vendor holds approximately 91% of payments (HHI = 0.91). This is in the highest-risk band for this signal." *(vendor_hhi: +0.22)*
3. "Payments occurred 30 months after fiscal year end — well beyond normal administrative lag. This timing pattern is associated with elevated risk." *(timing_lag: +0.16)*
4. "The largest individual payment amount is 1.8 standard deviations above the Borewell work-type mean — moderate but non-trivial." *(zscore_max: +0.04)*

### 5.7 Advantages

1. **Glass-box transparency — the highest trust level available in ML.** No post-hoc explanation tool needed. The model IS the explanation.
2. **Directly auditable.** Government reviewers can inspect shape functions and confirm the model has learned sensible risk patterns.
3. **Performance competitive with XGBoost on tabular data** (Caruana et al., 2015; Nori et al., 2019).
4. **Shape functions work as documentation.** They explain the model's decision logic in a way that can be presented to non-technical stakeholders.
5. **Handles categorical features** through learned categorical shape functions.
6. **Built-in interaction term detection** using a statistical test (FAST — Fast Accurate Shapley-Based Two-Way Interactions) to identify which feature pairs genuinely interact.
7. **Actively maintained open-source library** (InterpretML by Microsoft Research).
8. **Well-suited for regulated environments.** Published in healthcare, finance, and public policy applications where regulators require transparency.

### 5.8 Disadvantages

1. **Training is slower than XGBoost.** The cycling through features during training is computationally more intensive than standard gradient boosting. On our dataset (~8,868 rows), this is manageable (minutes), not prohibitive.
2. **Complex interactions beyond pairs are not natively modeled.** Three-way and higher interactions that may exist in MPLADS data (e.g., risk is only high when ratio AND hhi AND payment_count are simultaneously extreme) may not be fully captured.
3. **Requires labels for supervised training,** just like XGBoost. The pseudo-labeling circularity risk applies equally.
4. **Less community awareness.** Compared to XGBoost, EBM has fewer tutorials, StackOverflow answers, and community examples. This may slow development for a student team.
5. **The InterpretML library is Python-only** and less battle-tested at production scale than the XGBoost library.

### 5.9 Data Requirements

- Essentially identical to XGBoost: works well on datasets with thousands of examples; class imbalance must be handled (EBM supports class weights); categorical features supported.
- **Key advantage over XGBoost:** Because the model is glass-box, a domain expert can review the learned shape functions and manually adjust or validate them. This provides a quality check that is not available with XGBoost.
- **Retraining:** Same as XGBoost — as new verified outcomes arrive, retrain from scratch with the updated dataset.

### 5.10 Deployment Considerations

- **Python ecosystem:** `interpret` library (InterpretML) is pip-installable. Slightly less ubiquitous than `xgboost` but fully Python-compatible.
- **Model size:** Comparable to XGBoost (serializable to a few MB).
- **Training time:** Slower than XGBoost but acceptable for batch retraining workflows (not real-time).
- **Inference time:** Very fast. Each prediction is a sum of shape function lookups — computationally trivial.
- **FastAPI integration:** Straightforward. The model object can be loaded at startup; predictions are fast; feature contributions are available without a separate library.

### 5.11 Suitability for Our Project

The EBM is the most theoretically appropriate model for an **audit-facing, government-context** risk system where the explanation must be the model itself and not a post-hoc approximation. It provides the strongest transparency guarantee of the three recommended models.

For a hackathon, the shape function visualizations are also excellent presentation material — demonstrating to judges not just that the model works, but exactly *how* it decided to weight each risk signal.

Its weakness is the same as XGBoost: it is supervised. In the absence of labels, it still requires pseudo-labeling with the same caveats.

**Verdict:** The ideal model for production deployment in a government audit system. Best choice when explainability is treated as a first-class requirement, not an afterthought.

---

## SECTION 6 — MODEL 3: ISOLATION FOREST

### 6.1 What is the model?

Isolation Forest (iForest) is an anomaly detection algorithm developed by Liu, Ting, and Zhou (2008, 2012). It is specifically designed to detect anomalies without requiring any labeled data — making it directly applicable to Scenario B (no confirmed audit outcomes available).

The key insight is elegant and counterintuitive: anomalies are easier to isolate than normal points. Rather than profiling what is "normal" and then measuring distance from normality (the approach of many anomaly detectors), Isolation Forest directly measures how easy it is to isolate each data point by itself.

Isolation Forest has been used in financial fraud detection (Phua et al., 2010, broader survey), network intrusion detection, and industrial anomaly detection across numerous published studies.

### 6.2 How does it work?

The algorithm works as follows:

1. Build many random "Isolation Trees" (iTrees).
2. Each iTree is built by: randomly selecting a feature, then randomly selecting a split value between that feature's min and max, and recursively partitioning the data until each point is isolated (alone in a leaf node).
3. Anomalies require very few splits to isolate — because they are sparse and far from the majority of data points.
4. Normal points require many splits — because they are dense, surrounded by similar points.
5. The isolation score for each point is the average path length across all iTrees. **Short path length = anomaly.**

For our MPLADS project: a work with a peer_cost_ratio of 8.5, an HHI of 0.98, and 30 payments in a single week would be isolated very quickly in most trees — because almost no other works share all three extreme characteristics simultaneously. Its isolation score would flag it as a high-priority anomaly.

### 6.3 Why could it work for MPLADS?

1. **No labels required.** In Scenario B, this is the critical advantage. Isolation Forest can be trained on the full dataset of 8,868 works without any confirmed audit outcomes.

2. **Naturally identifies multivariate outliers.** It does not flag each feature independently — it identifies works that are anomalous across all features simultaneously. This is more sophisticated than the current deterministic engine, which sums independent signal scores.

3. **Robust to feature scale.** Isolation Forest does not require feature normalization because it uses random splits rather than distance metrics.

4. **Effective on high-dimensional data.** As we add more features (derived from our statistical signals plus raw features), Isolation Forest continues to perform well. Many distance-based anomaly detectors (like DBSCAN or KNN-based methods) suffer from the "curse of dimensionality" in high-dimensional spaces.

5. **Fast training and inference.** Training is fast even on large datasets (Liu et al. 2012 demonstrated this explicitly). Our dataset of ~8,868 works is processed in seconds.

6. **Established in financial anomaly detection literature.** Despite being an academic algorithm, it has practical financial applications documented in literature (e.g., Abdallah et al., 2016 survey of financial fraud detection covers ensemble tree methods including Isolation Forest).

### 6.4 What type of patterns can it detect?

- **Global outliers:** Works that are anomalous across all features simultaneously — the hardest to dismiss as coincidence.
- **High-dimensional anomalies:** Combinations of moderate anomalies across many features that no single signal would individually trigger.
- **Sparse regions of feature space:** Works in parts of the data distribution that have no neighbors — true outliers in the statistical sense.
- **Rare feature combinations:** A borewell with an unusually short payment span AND high HHI AND anomalous amount — rare enough to be suspicious.

**What it cannot detect:**
- Contextual anomalies that require domain knowledge to define (e.g., "rush spending is only suspicious near fiscal year end, not in general").
- Patterns that require confirmed labels to validate against.
- Fraud that follows the statistical norms of the data (e.g., a sophisticated operator who keeps all signals just below threshold — this is a risk for any anomaly detector).

### 6.5 Explainability

This is the most significant weakness of Isolation Forest.

**Native explainability: Very limited.**

The anomaly score (isolation path length) tells you HOW anomalous a work is, but not WHY. The model does not natively attribute the score to specific features.

**SHAP for Isolation Forest:**

Lundberg et al. (2020) extended TreeSHAP to work with tree ensemble models including Isolation Forest. This allows SHAP values to be computed for Isolation Forest predictions, attributing the anomaly score to feature contributions.

**Important limitation:** This is an approximation. TreeSHAP for Isolation Forest is less straightforward than for XGBoost because:
1. Isolation Forest does not predict a probability — it predicts an anomaly score. Mapping SHAP values onto this score is less semantically direct.
2. The random nature of feature and split selection in iTrees means SHAP values can be unstable across different random seeds.
3. The relationship between "which features caused isolation" and "which features are suspicious" is not always the same. A work might be easy to isolate because it has an unusual `work_type` rather than a suspicious `peer_cost_ratio`.

**Alternative: LIME (Local Interpretable Model-agnostic Explanations)**

LIME (Ribeiro et al., 2016) trains a simple interpretable model locally around each prediction. It can be applied to Isolation Forest to approximate which features drove the anomaly score for each work. However, LIME explanations are approximations and less mathematically grounded than SHAP.

**Practical approach:** For Isolation Forest in our project, the most auditor-friendly explanation approach would be to combine the Isolation Forest anomaly score with the existing deterministic statistical engine's signal decomposition. The Isolation Forest flags a work as anomalous; the statistical engine provides the evidence basis. The SHAP/LIME attribution serves as additional validation of which features drove the anomaly.

**This hybrid explanation approach is less elegant and less complete than EBM's native explanations or XGBoost's SHAP values**, but it is the best available approach for an unsupervised model.

### 6.6 Hypothetical Example Prediction

**⚠️ This is a fully hypothetical example. All numbers are illustrative.**

Work: `WS/MH/PN/2022-2023/055432`

Features (input to Isolation Forest):
- `peer_cost_ratio = 0.95` (appears normal)
- `vendor_hhi = 0.78`
- `payment_timing_lag_months = 6`
- `payment_amount_zscore_max = 1.4`
- `duplicate_count = 8`
- `payment_count = 14`
- `payment_span_days = 3`

**Isolation Forest Output (hypothetical):**

Anomaly Score: **0.71** (higher = more anomalous; typically scored as negative in sklearn, where -1 = anomaly)

SHAP attribution (hypothetical, less stable than XGBoost):
- `duplicate_count` → +0.28 (most isolating feature)
- `payment_count` → +0.18
- `payment_span_days` → +0.15
- `vendor_hhi` → +0.09

**Generated explanation (combining Isolation Forest SHAP with statistical engine):**
1. "This work is statistically unusual across multiple dimensions simultaneously — it stands apart from 92% of comparable works in a multivariate analysis." *(Isolation Forest anomaly score)*
2. "8 duplicate works of the same type were sanctioned in the same district and fiscal year — suggesting potential ghost asset creation." *(duplicate_count, primary isolation driver)*
3. "14 payments were disbursed across just 3 days — a highly concentrated disbursement pattern." *(payment_count + payment_span_days)*
4. "Vendor concentration is high (HHI = 0.78), with most funds flowing to one or two vendors." *(vendor_hhi)*

**Note:** The explanation is less tightly coupled to the Isolation Forest prediction than in the XGBoost/EBM examples. This is an honest representation of Isolation Forest's explainability limitation.

### 6.7 Advantages

1. **No labels required.** Directly applicable in Scenario B — the most likely near-term state of our project.
2. **Pure anomaly detection without fraud assumptions.** Does not require us to treat any pseudo-label as "confirmed fraud."
3. **Captures multivariate anomalies.** Identifies works that are unusual across the full feature space simultaneously, not just on individual signals.
4. **Fast, scalable, and robust.** Computationally efficient even on large datasets. Random subsampling (a key parameter) makes it stable against noise.
5. **Complementary to the existing deterministic engine.** Can be used alongside (not instead of) the statistical scoring to provide a second opinion from a different algorithmic perspective.
6. **Useful for unsupervised pre-labeling.** Isolation Forest scores can be used to identify candidate high-risk works for human expert review, creating a small set of verified labels that can then be used to train XGBoost or EBM.
7. **Handles contamination parameter.** The `contamination` hyperparameter allows setting the expected proportion of anomalies in the dataset — which can be tuned based on domain knowledge about what fraction of MPLADS works might be irregular.

### 6.8 Disadvantages

1. **Limited explainability.** This is the primary weakness. While SHAP can be applied, it is less reliable and less interpretable than for XGBoost or EBM. An auditor cannot directly understand "why" from the Isolation Forest score alone.
2. **Anomaly ≠ fraud.** Isolation Forest makes no distinction between "statistically unusual for legitimate reasons" and "statistically unusual due to irregularity." Both types appear as anomalies. The false positive rate in an audit context can be high.
3. **No probability output.** Isolation Forest produces an anomaly score, not a calibrated probability. Converting this to a meaningful "risk percentage" requires careful calibration.
4. **Sensitive to feature set choice.** If irrelevant features are included, the random splits may be dominated by uninformative features, diluting the signal from genuinely suspicious features.
5. **Cannot incorporate domain knowledge directly.** Unlike a supervised model trained with human-verified labels, Isolation Forest has no mechanism to learn from auditor feedback unless that feedback is used to re-label the training data.
6. **Interpretation instability.** Different random seeds produce slightly different anomaly scores, making exact reproducibility dependent on fixing the random seed — a detail that must be explicitly managed.

### 6.9 Data Requirements

- **Labels:** Not required. This is its primary advantage.
- **Dataset size:** Performs well even with hundreds of rows. Subsampling is used internally.
- **Feature engineering:** Requires more careful selection of informative features than supervised models. Uninformative features should be excluded.
- **Missing values:** Does NOT handle missing values natively (unlike XGBoost). Missing values must be imputed or the features must be excluded. This is a practical consideration for works with missing payment dates.
- **Categorical features:** Must be encoded (label encoding, ordinal encoding, or target encoding) before being passed to Isolation Forest.
- **Retraining:** As new data arrives, the model should be retrained on the updated full dataset. There is no incremental training mechanism.

### 6.10 Deployment Considerations

- **Python ecosystem:** `sklearn.ensemble.IsolationForest` is part of scikit-learn, which is already in our stack. No additional library needed for the core model.
- **SHAP for Isolation Forest:** Requires the `shap` library, which is pip-installable.
- **Model size:** Very compact. Random forest of 100–500 trees on small feature sets.
- **Training time:** Seconds.
- **Inference time:** Milliseconds per prediction.
- **FastAPI integration:** Simple — load model at startup, compute anomaly scores at inference time.

### 6.11 Suitability for Our Project

Isolation Forest is the essential bridge for Scenario B. It allows the project to demonstrate ML-based anomaly detection immediately, without waiting for confirmed audit labels. In a hackathon context, this is practically important.

Its role is best understood as a complement to the statistical engine rather than a replacement for it: the statistical engine provides interpretable signal scores; Isolation Forest provides a holistic multivariate view of which works are jointly anomalous across all features simultaneously.

**Verdict:** Best used as the near-term unsupervised component, with a plan to transition toward XGBoost or EBM as verified labels accumulate. The system should clearly communicate that Isolation Forest scores reflect statistical anomalies, not confirmed fraud.

---

## SECTION 7 — SIDE-BY-SIDE COMPARISON

| Dimension | XGBoost + SHAP | EBM (InterpretML) | Isolation Forest |
|---|---|---|---|
| **Model Type** | Supervised classifier (gradient-boosted trees) | Supervised classifier (generalized additive model) | Unsupervised anomaly detector (tree ensemble) |
| **Supervised / Unsupervised** | Supervised | Supervised | Unsupervised |
| **Works with tabular data** | Excellent — one of its primary strengths | Excellent — specifically designed for tabular data | Good — designed for tabular feature spaces |
| **Works with nonlinear patterns** | Excellent — captures complex nonlinear interactions | Good — captures nonlinear per-feature relationships and pairwise interactions; limited on 3+ way interactions | Good — captures multivariate nonlinear anomaly regions |
| **Explainability (overall)** | Post-hoc via SHAP (mathematically principled but separate from model) | Native glass-box — highest level of transparency | Post-hoc via SHAP (less stable than for supervised models); or combined with statistical engine |
| **Local explanation capability** | Strong — SHAP values per prediction | Strong — direct feature contributions from shape functions | Moderate — SHAP available but less reliable; path-based explanations available |
| **Global explanation capability** | Strong — SHAP summary plots, feature importance | Strong — shape function plots directly represent global behavior | Limited — feature importance via mean SHAP, but less informative |
| **Anomaly detection capability** | Not native — requires labels or pseudo-labels to define "anomaly" | Not native — same requirement as XGBoost | Native — core purpose of the model; no labels needed |
| **Label requirements** | Requires confirmed labels or reliable pseudo-labels | Requires confirmed labels or reliable pseudo-labels | No labels required |
| **Performance potential** | Very high — state-of-the-art for tabular classification | High — comparable to XGBoost on many tabular benchmarks | Depends on data; not directly comparable (different task type) |
| **Training complexity** | Moderate — hyperparameter tuning required | Moderate — fewer hyperparameters than XGBoost; some tuning needed | Low — few hyperparameters; `contamination` is the key one |
| **Inference complexity** | Very low — milliseconds | Very low — arithmetic sum of shape function lookups | Very low — path length computation in trees |
| **Data preprocessing requirements** | Moderate — categorical encoding; log transform for skewed features; class imbalance handling | Moderate — categorical encoding; handles skewness better through learned shape functions | Moderate — categorical encoding; missing value imputation; feature selection important |
| **Handling categorical features** | Good — label/target encoding needed; native ordinal support | Good — categorical shape functions learned natively | Moderate — must be encoded; ordinal encoding recommended |
| **Handling missing data** | Native missing value support | Requires imputation for missing values | Requires imputation or feature exclusion |
| **Risk of overfitting** | Moderate to high without careful regularization | Lower than XGBoost due to additive structure; regularization built in | Low — unsupervised; no labels to overfit |
| **Ease of retraining** | Good — retrain from scratch with new labeled data | Good — retrain from scratch; shape functions can be reviewed for sanity | Good — retrain as dataset grows; no labels needed |
| **Suitability for government/audit use** | High — established in financial risk; SHAP is defensible | Very High — glass-box model is the gold standard for regulated environments | Moderate — anomaly score is not a risk probability; requires careful communication |
| **Ease of explaining to SIH judges** | High — SHAP visualizations are intuitive and well-known | Very High — shape function graphs are immediately understandable; "the graph IS the model" | Moderate — the concept is elegant but the explanation of any specific prediction is harder |
| **Compatibility with existing Z-score/HHI engine** | Excellent — statistical signals become ML features | Excellent — same | Good — statistical signals become ML features; Isolation Forest adds multivariate view |
| **Suitability for human-in-the-loop learning** | High — auditor feedback creates labeled data; model retrains | High — same; plus auditors can directly review shape functions | Moderate — feedback must be translated into labels for any downstream supervised model |
| **Suitability for future production deployment** | High — widely deployed in production risk systems globally | High — growing adoption in regulated industries; InterpretML is actively maintained | Moderate — useful as one component but insufficient alone for a production audit system |

---

## SECTION 8 — EXPLAINABILITY COMPARISON

### The Critical Distinction: Inherent Interpretability vs. Post-Hoc Explainability

This distinction is often glossed over in ML articles and should be understood precisely.

**Inherently interpretable model:** A model whose decision logic can be understood directly, without any additional tools. A 5-node decision tree is inherently interpretable. A scorecard is inherently interpretable. **The EBM is inherently interpretable** — its shape functions are the model itself.

**Post-hoc explainable model:** A model that produces predictions through complex internal operations, but where an additional tool computes an approximate explanation after the fact. **XGBoost with SHAP is post-hoc explainable.** The SHAP tool examines the trained XGBoost model and computes attribution values. These are principled approximations, not the model's actual internal reasoning.

Why does this matter for audit systems? Because there is a gap between "SHAP says this feature contributed +0.24" and "the model actually used this feature this way." SHAP values are theoretically grounded (Shapley axioms guarantee certain fairness properties), but they can still produce locally inconsistent or unintuitive explanations for individual predictions, especially when features are correlated.

**Per-model explainability analysis:**

#### XGBoost + SHAP

| Explainability Question | Answer |
|---|---|
| Can it explain individual predictions? | ✅ Yes — SHAP values per prediction |
| Can it show which features contributed to risk? | ✅ Yes — positive SHAP values = risk increasing; negative = risk decreasing |
| Can we produce exactly 3–4 strongest reasons? | ✅ Yes — sort by absolute SHAP value, take top 4 |
| Can those reasons be converted into plain English? | ✅ Yes — if features are interpretable (ratio, HHI, Z-score) |
| Can an auditor understand why a work was flagged? | ✅ Mostly — with training on SHAP interpretation |
| Is the explanation mathematically connected to the prediction? | ⚠️ Principled approximation — Shapley axioms guarantee consistency in expectation, not exactly per prediction |
| Limitations? | SHAP values can be unstable for correlated features; require separate library; computation time proportional to model size |

#### EBM (InterpretML)

| Explainability Question | Answer |
|---|---|
| Can it explain individual predictions? | ✅ Yes — directly from shape function sum |
| Can it show which features contributed to risk? | ✅ Yes — exact feature contributions are the model |
| Can we produce exactly 3–4 strongest reasons? | ✅ Yes — sort by feature contribution magnitude |
| Can those reasons be converted into plain English? | ✅ Yes — more naturally than XGBoost because contributions are exact |
| Can an auditor understand why a work was flagged? | ✅ Yes — and they can also verify the model's learned patterns via shape functions |
| Is the explanation mathematically connected to the prediction? | ✅ Yes — the explanation IS the prediction computation |
| Limitations? | Pairwise interactions only; if a risk pattern requires three-way interactions, EBM may miss it; shape functions require visualization tools to be fully interpretable |

#### Isolation Forest

| Explainability Question | Answer |
|---|---|
| Can it explain individual predictions? | ⚠️ Partially — SHAP can be applied but is less reliable |
| Can it show which features contributed to risk? | ⚠️ Partially — via TreeSHAP or LIME, but attribution is less stable |
| Can we produce exactly 3–4 strongest reasons? | ⚠️ Partially — can extract top SHAP features but their interpretation is less direct |
| Can those reasons be converted into plain English? | ⚠️ With effort — but the connection to the anomaly score is not as clean |
| Can an auditor understand why a work was flagged? | ⚠️ With the help of the statistical engine alongside — not from Isolation Forest alone |
| Is the explanation mathematically connected to the prediction? | ⚠️ TreeSHAP for Isolation Forest is an approximation; less reliable than for supervised trees |
| Limitations? | Anomaly score is not a probability; explanations can be counterintuitive; different random seeds produce different SHAP values |

### The "SHAP does not make a model completely transparent" problem

This is a common source of confusion in ML for governance applications.

SHAP satisfies four mathematical properties (efficiency, symmetry, dummy, and additivity — the Shapley axioms). These properties guarantee that the attribution is fair in a game-theoretic sense. However:

1. **SHAP explains the model's output, not the underlying reality.** If the model has learned a spurious correlation (e.g., certain fiscal years have higher scores because the training data happened to contain more irregularities in those years), SHAP will faithfully explain this spurious correlation as if it were a real risk signal.

2. **SHAP values can be surprising.** For features with high correlation, SHAP may split the credit between them in ways that are technically correct but counterintuitive to a human reviewer.

3. **SHAP is not a substitute for model validation.** A model that has overfit to pseudo-labels will produce confident, wrong predictions — and SHAP will confidently, wrongly attribute them to specific features.

The implication for our project: **SHAP is a valuable explanation tool, but it does not replace the need for model validation, careful pseudo-label design, and regular auditor review of model predictions.**

---

## SECTION 9 — HOW THE 3–4 REASONS COULD BE GENERATED

This section explains the conceptual pipeline from model prediction to human-readable reasons. No code is written.

### Conceptual Pipeline

```
Model Training (XGBoost / EBM / Isolation Forest)
        ↓
Model predicts risk score or anomaly score for a work
        ↓
Feature attribution is computed:
  - XGBoost: TreeSHAP computes SHAP values for each feature
  - EBM: native feature contributions are summed
  - Isolation Forest: TreeSHAP for iForest computes approximate SHAP values
        ↓
Sort features by absolute contribution (positive contributors first)
        ↓
Select top 3–4 features with highest positive contributions
        ↓
Map each (feature_name, feature_value, contribution) tuple 
  to a domain-specific explanation template
        ↓
Insert actual values from the specific work into the template
        ↓
Display top 3–4 reasons to the auditor alongside the risk score
```

### Explanation Template Design

The key to producing good reasons is designing templates that are specific to each feature type. Here are examples:

---

**Feature: `peer_cost_ratio`**

Template: "Expenditure is `{ratio:.1f}×` the median expenditure of comparable `{work_type}` works in `{state}`, suggesting cost inflation."

Example output: "Expenditure is 2.8× the median expenditure of comparable Borewell/Tubewell works in Uttar Pradesh, suggesting cost inflation."

*Note: This sentence is only generated when the SHAP value (or EBM contribution) for this feature is among the top positive contributors. It is not generated purely because the ratio is high — it is generated because the model determined this feature materially influenced this specific prediction.*

---

**Feature: `vendor_hhi`**

Template when HHI is the cause: "Vendor concentration is `{risk_level}` — a single vendor or small group accounts for most disbursements (HHI = `{hhi:.2f}`), which may indicate contractor monopolization."

Where `{risk_level}` = "very high" if HHI > 0.8, "high" if HHI > 0.6.

---

**Feature: `payment_timing_lag_months`**

Template: "Payments occurred `{lag:.0f}` months after the fiscal year `{fy}` ended, significantly beyond normal administrative processing time."

---

**Feature: `payment_amount_zscore_max`**

Template: "The largest individual payment is `{zscore:.1f}` standard deviations above the typical payment size for `{work_type}` works, which is statistically unusual."

---

**Feature: `duplicate_count`**

Template: "The MP has sanctioned `{count}` works of type `{work_type}` in `{district}` during fiscal year `{fy}`, raising the possibility of duplicate or ghost assets."

---

**Feature: `payment_span_days`**

Template: "`{n_payments}` payments were made within a `{span}`-day window, which may indicate rushed end-of-period disbursement to consume budget without corresponding physical progress."

---

### Ensuring explanations are real, not invented

The discipline of connecting explanations to actual model inputs requires:

1. **Feature store integrity:** Every feature used in the explanation template must be the exact same value that was passed to the model. The explanation system reads feature values from the same row used for prediction.

2. **Attribution-gated templates:** An explanation template for `peer_cost_ratio` is only activated if the model's attribution for `peer_cost_ratio` is above a minimum positive threshold (e.g., SHAP > 0.05 or EBM contribution > 0.03). This prevents generating reasons for features that did not actually influence the prediction.

3. **No LLM post-hoc justification:** The reasons should NOT be generated by feeding the risk score to a large language model and asking it to explain the score. That produces plausible-sounding but potentially fabricated narratives. The reasons must come from the model's attribution layer.

4. **Reason consistency check:** For a given work and score, the top reasons should be stable across multiple inference runs (except for random seeds in Isolation Forest). Instability would indicate something is wrong with the attribution.

---

## SECTION 10 — HYBRID MODEL DESIGN

### Conceptual Architectures

The most effective deployment is almost certainly a hybrid of the statistical engine and an ML model. Here are four options analyzed:

---

**Option A: Rules → ML**

Statistical engine produces signals → ML model receives only the statistical scores (cost_peer_score, vendor_score, etc.) as features.

*Advantages:*
- Simple architecture — ML receives clean, bounded inputs.
- Easy to implement.

*Disadvantages:*
- ML receives already-binned scores, not raw values. Information is lost. The ML model can only combine signals in new ways; it cannot learn finer distinctions within the existing signal buckets.
- High risk of circular reasoning: if pseudo-labels come from the same statistical scores that are used as features, the ML model learns to replicate the rules, not to discover new patterns.
- The ML model has no access to raw features that might reveal new signals (e.g., specific vendor name patterns, geographic clusters).

*Transparency:* Moderate — the features are interpretable (they are scores from named signals), but the ML combination function is not.

---

**Option B: Rules and ML Independently → Fusion**

The statistical engine produces a score; an independent ML model also produces a score from raw features; a fusion model (weighted average or another ML model) combines them.

*Advantages:*
- Two independent views of the same data.
- Can cross-validate each other.

*Disadvantages:*
- The ML model and the statistical engine are not truly independent — they use overlapping data and overlapping concepts (expenditure, vendors, timing). Their outputs are correlated, not independent.
- Double-counting: a high HHI appears in both the statistical signal and as an ML feature. Fusing two scores that both reflect HHI does not add genuine information.
- Harder to explain: "The statistical engine said X and the ML said Y and the fusion said Z" requires explaining three layers.

*Transparency:* Low — the fusion layer adds opacity.

---

**Option C: Statistical Features → ML → Explanation** *(Recommended)*

Statistical signals are computed as raw continuous values (peer_cost_ratio, vendor_hhi, payment_lag_months, z_score_max, duplicate_count) and used as features in an ML model. The ML model learns how to combine these signals (and possibly additional raw features). The explanation layer attributes the ML prediction to feature contributions.

*Advantages:*
- Preserves information (raw continuous values rather than binned scores).
- ML model discovers signal interactions and weighting that rules cannot.
- Explanation directly maps back to domain-meaningful features.
- The statistical engine does the domain-expert feature engineering; the ML model does the combination.
- Clean separation of concerns: statistics engine = feature engineering, ML = risk synthesis, explanation layer = auditability.

*Disadvantages:*
- If pseudo-labels are derived from the statistical signals, circularity risk remains. Must be managed carefully.
- Requires careful feature engineering to avoid multicollinearity (e.g., `vendor_hhi` and `single_vendor_flag` measure similar things; including both may confuse the model without adding information).

*Transparency:* High — features are directly interpretable; SHAP or EBM attribution maps predictions to named, domain-specific signals.

*Risk of evidence leakage:* Moderate — the same raw data that produced the statistical signals also produces the pseudo-labels. This is unavoidable unless external verified labels are obtained. The risk must be disclosed and managed.

*Maintainability:* High — each layer can be independently updated (new statistical signals can be added as new features; the ML model retrained).

---

**Option D: ML → Statistical Validation Layer**

ML produces a risk ranking; a hard-rule engine then validates or overrides the ML decision.

*Advantages:*
- Hard rules provide guardrails against ML hallucination.
- Regulatory thresholds can be enforced regardless of what the ML model learned.

*Disadvantages:*
- Complex to maintain — when ML and rules disagree, which wins?
- Explanation must cover both layers.
- If the ML model is routinely overridden by rules, it is unclear what value the ML layer adds.

*Transparency:* Moderate — the rule overrides are transparent, but the underlying ML reasoning is not.

---

### Recommended Conceptual Architecture

Based on this analysis, **Option C (Statistical Features → ML → Explanation)** is the most coherent architecture:

```
Raw Government Data (exp.csv, allocated.csv)
        ↓
Feature Engineering Layer (existing Python statistical engine)
  Output: peer_cost_ratio, vendor_hhi, payment_lag_months,
          payment_zscore_max, duplicate_count, payment_count,
          payment_span_days, work_type, state, fy, etc.
        ↓
ML Model (XGBoost or EBM in Scenario A; Isolation Forest in Scenario B)
  Input: feature vector per work
  Output: risk probability (XGBoost/EBM) or anomaly score (Isolation Forest)
        ↓
Attribution Layer (TreeSHAP or EBM native contributions)
  Output: per-feature contribution values for this prediction
        ↓
Explanation Template Engine
  Output: top 3–4 human-readable reasons with actual feature values
        ↓
Audit Dashboard
  Human Review → (Confirm / Dismiss) → New Verified Label → Retraining
```

The human audit feedback loop closes the cycle and allows supervised models to progressively improve as verified labels accumulate.

---

## SECTION 11 — MODEL TRAINING AND RETRAINING

### The Ideal Training Lifecycle

```
Historical MPLADS Data
  (exp.csv, allocated.csv, all fiscal years available)
        ↓
Feature Engineering
  (compute peer_cost_ratio, hhi, timing lag, z-scores, duplicates,
   for every work_id)
        ↓
Label Assembly
  Scenario A: Use confirmed audit outcomes as labels
  Scenario B: Use pseudo-labels from statistical engine OR
              expert-review-labeled sample
        ↓
Training Data Split
  (Train set: 70–80%; Validation set: 10–15%; Test set: 10–15%)
  Critical: Split by work_id, not by row, to avoid data leakage
        ↓
Model Training
  (XGBoost: tune learning rate, max_depth, n_estimators, scale_pos_weight)
  (EBM: tune learning rate, interactions, max_bins)
  (Isolation Forest: tune n_estimators, contamination, max_samples)
        ↓
Validation
  (Evaluate on held-out validation set)
  (Check calibration, precision@K, false positive rate)
  (Review SHAP / EBM explanations for sanity)
        ↓
Deployment
  (Serve via FastAPI; score all works in batch)
  (Store model version, training data hash, evaluation metrics)
        ↓
Auditor Review Cycle
  (Auditors confirm or dismiss model-flagged works)
  (Confirmations → Verified True Positive labels)
  (Dismissals → Verified False Positive labels)
        ↓
New Labels Added to Training Set
  (Progressively growing verified dataset)
        ↓
Periodic Retraining
  (Monthly or quarterly; or triggered by N new labels being added)
        ↓
Model Version Comparison
  (New model must outperform previous model on hold-out test set)
  (If not, keep previous model; investigate why)
```

### Important Risks in the Retraining Pipeline

**Concept drift:**
The patterns that predict risk in 2023–2024 may differ from patterns in 2025–2026. If contractor behavior changes (e.g., shifting from obvious bill-splitting to subtler forms), a model trained only on older data may miss new patterns. Periodic retraining helps; monitoring for concept drift should be built into the evaluation pipeline.

**False positive fatigue:**
If the model flags too many works as high-risk, auditors will begin dismissing flags without genuine review. This erodes the quality of the negative labels (dismissed works may contain genuine irregularities). The model must be calibrated to produce a manageable number of high-priority flags per review cycle.

**False negative risk:**
In a government oversight context, missing genuine irregularities (false negatives) may be more costly than investigating legitimate works (false positives). The precision/recall tradeoff should be tuned toward higher recall (catching more genuine irregularities) at the cost of some precision (accepting more false positives for auditors to review).

**Self-reinforcing bias:**
If the model is repeatedly retrained on its own predictions (i.e., auditors only review works that the model flagged, so confirmed irregularities are always from the set the model chose to flag), the model will progressively become more confident in its current beliefs and never learn about irregularity patterns it missed. This is the most dangerous failure mode in a human-in-the-loop system. **Random sampling of low-risk works for occasional audit is essential** to break this feedback loop.

**Historical audit outcome bias:**
If historical audit findings come from politically motivated or geographically uneven auditing, the training labels will reflect those biases. A model trained on such labels may learn to associate risk with certain states or work types not because they are genuinely riskier, but because they were historically more likely to be audited. This is a form of selection bias that can produce unfair and unreliable models.

---

## SECTION 12 — EVALUATION METRICS

### Why Accuracy is the Wrong Metric

In our dataset, most works are likely legitimate. Even if 5% of works have genuine irregularities (~443 out of 8,868), a model that predicts "all works are legitimate" achieves 95% accuracy — without learning anything useful. Accuracy is meaningless for imbalanced classification.

### Recommended Metrics for MPLADS Risk Triage

**Precision @ K (Precision@K):**
"Of the top K works flagged as high-risk, what fraction actually had confirmed irregularities?"

For a triage system, this is perhaps the most directly meaningful metric. Auditors have limited capacity — they can investigate perhaps 10, 50, or 100 works per quarter. If we set K = 50 (the top 50 highest-risk works), Precision@50 tells us how many of those 50 are worth the auditor's time.

A Precision@50 of 0.60 means 30 of the 50 flagged works had real irregularities — a major improvement over random selection, where Precision@50 would equal the base rate (~5%), yielding only 2–3 genuine irregularities.

**Recall @ K (Recall@K):**
"Of all confirmed irregularities in the dataset, what fraction appear in the top K highest-risk works?"

High Recall@K means the model successfully surfaces confirmed irregularities into the auditor's review set, even if the review set contains some false positives.

**PR-AUC (Precision-Recall Area Under Curve):**
Plots precision vs. recall across all possible thresholds. AUC captures overall discriminative quality across the operating range. Strongly preferred over ROC-AUC for imbalanced datasets.

*Why not ROC-AUC?* ROC-AUC can look impressive even when a model is poor at identifying the minority class (fraud/irregularity), because it also accounts for performance on the majority class (legitimate works). For our imbalanced problem, PR-AUC is more informative (Davis & Goadrich, 2006).

**False Positive Rate (FPR):**
The fraction of legitimate works incorrectly flagged as high-risk. In an audit context, a high FPR means auditors waste time investigating legitimate works, eroding trust in the system. FPR should be monitored alongside Precision@K.

**Calibration:**
"When the model says 80% risk probability, are approximately 80% of such works actually irregular?"

A well-calibrated model's risk score is interpretable as a genuine probability, not just a ranking. Calibration can be assessed with Platt scaling, isotonic regression, or the Brier score. For government audit communication ("this work has an estimated 75% probability of containing an irregularity"), calibration matters.

**False Negative Rate (FNR):**
The fraction of genuinely irregular works that the model did NOT flag. In a government oversight context, false negatives may be costly — they represent irregularities that were missed. FNR should be monitored, especially for high-value works.

### How the Evaluation Changes for Triage vs. Binary Classification

The system's purpose is not "classify every work as fraud or legitimate." It is "help auditors prioritize their limited time." This changes evaluation fundamentally:

- Binary accuracy is irrelevant.
- The operating threshold should be chosen based on auditor capacity, not on maximizing overall classification accuracy.
- Precision@K and Recall@K are the direct operational metrics.
- The model should be evaluated at the K that matches the auditor review queue size.
- Risk scores should be treated as rankings (ordinal) first, and probabilities (cardinal) only after calibration is verified.

---

## SECTION 13 — RISKS AND FAILURE MODES

### False Positives

**Risk:** Works are incorrectly flagged as high-risk, causing unnecessary investigation of legitimate MPs and works.

**MPLADS impact:** This has real reputational and political consequences. An MP whose legitimate works are repeatedly flagged by the system may contest the system's credibility, potentially leading to political pressure to abandon the platform.

**Mitigation:** Use Precision@K as a primary metric. Communicate clearly that risk scores are prioritization tools, not verdicts. Ensure the system clearly labels its uncertainty.

### False Negatives

**Risk:** Genuinely irregular works receive low risk scores and are not investigated.

**MPLADS impact:** Irregularities slip through; public funds are wasted; the platform fails its core purpose.

**Mitigation:** Tune the threshold toward higher recall. Implement random audit sampling of low-risk works to catch false negatives and provide feedback data.

### Data Leakage

**Risk:** Information from the "future" (post-audit outcomes) leaks into training features, making the model appear to perform better than it actually will in deployment.

**MPLADS impact:** A model that appears accurate in validation but fails in deployment destroys stakeholder trust.

**Mitigation:** Careful temporal train/test splitting (train on earlier fiscal years, test on later ones). Audit the feature engineering pipeline for any accidental lookahead.

### Biased Historical Labels

**Risk:** If historical audit findings are geographically or politically skewed, the model learns these biases.

**MPLADS impact:** Certain states or MPs may be systematically over-flagged or under-flagged not due to genuine risk differences but due to audit history.

**Mitigation:** Analyze distribution of confirmed labels by state, work type, and fiscal year. If significant imbalances exist, apply geographic stratification in training. Report model performance separately by state and work type.

### Geographic Bias

**Risk:** Different states have genuinely different cost structures, administrative capacities, and work patterns. A model trained primarily on data from high-volume states (e.g., UP with many works) may perform poorly on low-volume states.

**MPLADS impact:** Works in smaller states may be systematically misevaluated.

**Mitigation:** Evaluate model performance separately by state. Consider state-specific calibration if performance varies significantly.

### Data Quality Problems

**Risk:** Our dataset contains formatting issues (UTF-16 encoding, IDA strings, date formats, comma-separated numbers). If data cleaning is imperfect, features may be computed incorrectly.

**MPLADS impact:** Incorrect features produce incorrect predictions. SHAP values confidently explain wrong predictions.

**Mitigation:** Comprehensive data validation before feature engineering. Document all data quality assumptions. Log warnings for records that fail validation.

### Concept Drift

**Risk:** As government procurement practices evolve, the patterns that indicate risk in 2024 may not indicate risk in 2027.

**MPLADS impact:** An aging model becomes progressively less accurate without anyone noticing, because the feedback loop may be slow.

**Mitigation:** Monitor model performance metrics over time. Set up automated alerts when PR-AUC on a rolling validation window drops below a threshold. Schedule periodic retraining.

### Overfitting to Pseudo-Labels

**Risk:** If pseudo-labels are created from the statistical engine's scores, and the ML model is trained on these pseudo-labels, the ML model will converge to approximate the rule engine rather than discover new patterns.

**MPLADS impact:** The ML layer adds complexity without adding genuine intelligence. The system appears to have ML but is effectively still running rules.

**Mitigation:** Evaluate whether the ML model's predictions differ meaningfully from the statistical engine's scores on held-out works. If correlation is ~1.0, the ML is not adding value. Seek external verified labels as soon as possible.

### Model Gaming / Adversarial Behavior

**Risk:** If the risk model's scoring criteria become known, sophisticated actors could structure transactions specifically to avoid triggering the signals.

**MPLADS impact:** Works are structured with cost ratios just below 1.5×, HHI just below 0.7, and payment timing designed to avoid lag detection.

**Mitigation:** Periodically update the model with new signal types. Use ensemble approaches that are harder to reverse-engineer. Do not publish specific threshold values publicly. The ML model's nonlinear combination of signals is already harder to game than simple rules.

### Misuse of Risk Score as Proof of Fraud

**Risk:** Decision-makers or media treat a high risk score as confirmation of fraud, rather than as a prioritization signal.

**MPLADS impact:** Reputational damage to MPs and local authorities based on unverified algorithmic output. Legal liability. Political controversy.

**Mitigation:** All communications about the system must clearly state: "Risk scores are prioritization tools for audit triage. They do not constitute evidence of fraud. Every flagged work requires physical inspection and human review before any action is taken."

---

## SECTION 14 — FINAL RECOMMENDATION

### Shortlist Summary

**XGBoost + SHAP:**
- **Why it belongs:** Best-in-class performance for tabular supervised classification. SHAP provides principled, mathematically grounded feature attribution that can produce clean 3–4 reason explanations.
- **When most useful:** When verified audit labels (even a modest sample of 500–1,000) are available. When performance is the primary concern.
- **Major weakness:** Requires labeled data; SHAP is post-hoc and not the same as the model being inherently transparent.
- **Label requirement:** Yes — Scenario A strongly preferred; pseudo-labels usable in Scenario B with acknowledged caveats.
- **Explainability:** High — via SHAP, with the caveat that SHAP approximates rather than reveals the model's internal reasoning.
- **Fit with existing engine:** Excellent — statistical signals feed directly as features.

**EBM (InterpretML):**
- **Why it belongs:** The only glass-box model that provides native, exact explanations without a separate post-hoc tool. The gold standard for regulated, audit-facing environments. Competitive performance with XGBoost on tabular data.
- **When most useful:** When explainability and auditor trust are the highest priorities. When the team needs to demonstrate to judges and stakeholders that the model's reasoning is directly readable.
- **Major weakness:** Requires labels (same as XGBoost); limited pairwise interaction modeling; smaller community than XGBoost.
- **Label requirement:** Yes.
- **Explainability:** Very High — the explanation IS the model.
- **Fit with existing engine:** Excellent.

**Isolation Forest:**
- **Why it belongs:** The only model that works without any confirmed labels. Can be deployed immediately in Scenario B to provide genuine ML value beyond the deterministic rule engine.
- **When most useful:** When no verified labels exist. As a first-stage anomaly detector to identify candidate works for expert review, which then generates the labels needed to train supervised models.
- **Major weakness:** Cannot explain predictions as cleanly as XGBoost or EBM; anomaly score is not a risk probability; cannot learn from auditor feedback directly.
- **Label requirement:** None.
- **Explainability:** Moderate — via SHAP or combination with statistical engine.
- **Fit with existing engine:** Good — complements rather than replaces statistical engine.

### Final Recommendation

> **For the stated requirements — government audit context, explainability as non-negotiable, limited labeled data, integration with existing statistical engine, and hackathon + production viability — the Explainable Boosting Machine (EBM) appears to provide the most balanced fit for the long-term production system.**

**Reasoning:**

1. The audit context requires the highest possible level of model transparency. EBM's glass-box nature means that stakeholders — auditors, government administrators, MPs who contest ratings, and SIH judges — can directly inspect the model's learned logic, not just an approximation of it. This is uniquely important for a system that informs consequential decisions.

2. EBM performance is competitive with XGBoost on tabular datasets with a relatively small number of meaningful features (Caruana et al., 2015; Nori et al., 2019). Given that our feature set consists of ~10–15 carefully engineered signals from domain expertise, EBM's additive model with pairwise interactions is well-matched to the problem structure.

3. The explanation mechanism is cleaner and more defensible in a government audit setting: "The model assigned 31 points to the cost ratio because the shape function for peer_cost_ratio evaluated at 3.1 returns +0.31" is more auditable than "SHAP says this feature contributed +0.29 based on a game-theoretic marginal contribution across all subsets of features."

**However:** For a hackathon prototype — particularly in Scenario B where no labels are available — the recommended **practical deployment strategy** is:

1. **Immediately:** Isolation Forest on the full dataset, providing an unsupervised multivariate anomaly layer alongside the deterministic engine.
2. **Near-term:** Use Isolation Forest anomaly scores + statistical engine scores + optional expert review to generate a small set of pseudo-labels with human oversight.
3. **Medium-term:** Train EBM (primary) and XGBoost (comparison) on the assembled labels. Compare performance and explanation quality. Select EBM for production deployment if its performance is within 5% of XGBoost (which published research suggests is typical).

This three-stage approach is realistic, honest about data limitations, and positions the team well both for the hackathon and for a production trajectory.

---

## SECTION 15 — RECOMMENDED EXPERIMENTS

The following experiments should be run when the team is ready to implement. This section describes what to test, not how to test it.

**Experiment 1: Feature Correlation Analysis**
Before model training, compute correlation between features (peer_cost_ratio, hhi, z_score, timing_lag, etc.). Highly correlated features may cause instability in SHAP values and should be examined for consolidation. Check specifically whether `vendor_hhi` and `single_vendor_flag` are redundant.

**Experiment 2: Isolation Forest Baseline**
Train Isolation Forest on all works using all available statistical signal features. Plot the distribution of anomaly scores. Manually review the top 20 and bottom 20 works to assess whether the Isolation Forest ranking makes domain sense. Check: are the "most anomalous" works the ones the statistical engine also flagged as high-risk? If not, investigate why — the Isolation Forest may be picking up on patterns the rule engine missed (good) or on irrelevant feature correlations (bad).

**Experiment 3: Pseudo-Label Quality Assessment**
Create pseudo-labels from the statistical engine (e.g., top 15% = 1, bottom 50% = 0). Train XGBoost and EBM on these pseudo-labels. Evaluate whether the ML predictions correlate almost perfectly with the statistical engine scores. If the Spearman correlation between ML risk probability and statistical engine score is above 0.95, the ML model has learned nothing new — it has merely approximated the rules. The team should investigate whether additional raw features (work description text embeddings, geographic cluster features) can break this circularity.

**Experiment 4: SHAP / EBM Explanation Sanity Check**
For the top 50 highest-risk works according to each model, inspect the generated explanations. Ask: do the top 3–4 reasons make intuitive domain sense? Do they correspond to features that a domain expert would consider suspicious? This qualitative evaluation is as important as any quantitative metric.

**Experiment 5: Cross-State Performance Analysis**
Evaluate model performance (Precision@K, where K = top 10% per state) separately for each state or region. Identify states where the model performs substantially worse. Investigate whether this reflects genuine data quality issues, insufficient training examples from that state, or legitimate differences in work type distribution.

**Experiment 6: Temporal Validation**
Train the model on fiscal years 2020–2023 and test on fiscal years 2024–2025. This simulates production conditions (training on history, predicting on future data). Compare this temporal validation performance to the random split validation. If performance drops substantially, concept drift may be an issue even within the available historical window.

**Experiment 7: Human Expert Review Sample**
Request that a domain expert (someone familiar with MPLADS auditing) review a sample of works: say, 20 works flagged as high-risk by the model and 20 flagged as low-risk. Record their assessments. Use this as ground truth to estimate the model's actual precision at the current operating threshold.

**Experiment 8: XGBoost vs. EBM Head-to-Head**
Once pseudo-labels or expert labels are available, train both XGBoost (with SHAP) and EBM on the same training set. Compare on the same test set using PR-AUC and Precision@K. If EBM is within 5 percentage points of XGBoost on PR-AUC, prefer EBM for its superior transparency. If XGBoost is more than 5 percentage points better, the performance gain must be weighed against the transparency loss.

---

## SECTION 16 — SIH JUDGE EXPLANATION

### 30-Second Explanation

"Our platform analyzes 8,868 government works across 542 MPs using a two-layer intelligence system. The first layer is a statistical engine that computes five objective risk signals — cost anomalies, vendor concentration, payment timing, statistical outliers, and duplicate detection. The second layer is a machine learning model that learns how these signals combine to indicate risk, and for every flagged work, it generates 3–4 specific, evidence-backed reasons in plain English so that auditors understand exactly why each work was prioritized. The system is a triage tool, not a verdict — every flag requires human review before any action is taken."

### 1-Minute Explanation

"Our system solves a real operational problem: with over 8,000 public works across 542 MPs, no audit team can manually review every project. Our platform uses two intelligent layers.

The first layer is a deterministic statistical engine that computes five objective signals for every work: how much does the expenditure deviate from comparable works? How concentrated are vendor payments? Were disbursements unusually timed? Are there statistically anomalous payment amounts? Are there duplicate works in the same area?

The second layer is a machine learning model — specifically an Explainable Boosting Machine — that learns from historical patterns how these signals combine to indicate risk. Unlike a black-box AI, this model is glass-box: its internal logic can be directly inspected. For every flagged work, the model produces an exact decomposition of its risk score into 3–4 specific, measurable reasons with actual numbers — like 'expenditure is 2.8× the peer median' or 'vendor HHI is 0.82' — connected directly to the model's computation.

The system is designed for government audit use: fully explainable, reproducible, trainable over time as new verified outcomes emerge, and explicitly non-punitive — it prioritizes investigations, it does not pronounce guilt."

### 2-Minute Explanation

"India's MPLADS scheme allocates ₹5 crore per MP per year — roughly ₹2,700 crore annually. With 8,868 works on record, manual audit coverage is impossible. Our platform is an AI-powered risk intelligence system that helps audit authorities focus their limited resources on the works most deserving investigation.

The platform has three layers.

The first is data engineering: we ingest real government CSV data, handle UTF-16 encoding, extract districts from IDA strings, parse fiscal years from work IDs, and clean currency formats — producing a structured feature set for every work.

The second is our statistical intelligence engine: five mathematically defined signals produce objective risk contributions. These include peer cost comparison (how does this work's expenditure compare to similar works in the same state?), vendor concentration using the Herfindahl-Hirschman Index, payment timing analysis detecting both stale payments and rush disbursements, individual payment Z-score outlier detection, and duplicate asset clustering.

The third layer is our ML model — an Explainable Boosting Machine. This model learns from patterns in the statistical signals to weight them appropriately based on their historical predictive value. Unlike XGBoost or neural networks, the EBM is fully glass-box: its shape functions directly show how each feature contributes to risk predictions, and these contributions are the explanation, not a separate approximation. For every high-risk work, the system generates 3–4 specific reasons — like 'expenditure is 2.8× the peer median,' 'vendor HHI is 0.82 indicating near-monopoly disbursement,' and 'payments clustered within a 3-day window' — connected directly to model computation.

Critically: our system identifies anomalies and flags works for priority review. It does not declare fraud. Every flag is a prioritized investigation request. Human auditors review the evidence and make determinations. The system continuously learns from their verified outcomes, improving over time."

---

## SECTION 17 — IMPORTANT CLAIMS CHECK

### Claims We Must NOT Make

**❌ "The AI detects fraud with certainty."**
The system identifies statistical anomalies and risk patterns. It does not have legal authority to determine fraud, and its predictions may include false positives.

*What to say instead:* "The system identifies works exhibiting patterns associated with financial irregularities, for priority human review."

**❌ "The model proves corruption."**
Anomaly detection produces prioritization rankings. A high risk score is a recommendation to look closer, not evidence of a crime.

*What to say instead:* "The system generates evidence-backed prioritization scores. Physical inspection and human judgment are required to determine any finding."

**❌ "The model is 100% accurate."**
No ML model is 100% accurate. Our system will have false positives (legitimate works incorrectly flagged) and false negatives (irregularities missed).

*What to say instead:* "The system is designed to maximize audit efficiency by focusing investigative resources on the works most likely to yield findings, while minimizing unnecessary reviews."

**❌ "The ML model is unbiased."**
All ML models trained on historical data inherit the biases present in that data, including geographically or politically skewed audit coverage, data quality differences across states, and pseudo-label circularity.

*What to say instead:* "The system's performance is regularly evaluated across states and work types to identify and mitigate potential biases in its risk assessments."

**❌ "SHAP makes the model completely transparent."**
SHAP provides post-hoc feature attribution that is principled but approximate. It explains model behavior without exposing the model's internal decision logic directly.

*What to say instead:* "SHAP provides mathematically grounded feature attribution that allows auditors to understand which signals most influenced each risk prediction, while the model itself is validated through periodic performance evaluation."

**❌ "An anomaly is automatically fraud."**
Statistical anomaly = deviation from the norm. It may reflect a legitimate high-cost project, administrative delays, data entry errors, or genuine irregularities. Human review is required to distinguish between these.

*What to say instead:* "Anomalous works are works that deviate significantly from expected patterns based on peer comparisons. Whether this deviation reflects a genuine irregularity requires physical inspection."

**❌ "The model was trained on confirmed fraud data."**
In Scenario B (our likely starting point), the model is trained on pseudo-labels derived from statistical signals. This must be disclosed.

*What to say instead:* "In the initial phase, the model uses statistical signal patterns as training signals. As verified audit outcomes are collected, the model will be progressively retrained on confirmed labels."

**❌ "The system will eliminate corruption in MPLADS."**
This is a decision-support tool, not an enforcement mechanism. It supports auditors; it does not replace them.

*What to say instead:* "The system is designed to make MPLADS audit coverage more systematic, efficient, and evidence-driven, supporting human auditors in prioritizing their investigations."

---

## References and Source Notes

This report draws on the following authoritative sources:

1. **Chen, T., & Guestrin, C. (2016).** XGBoost: A Scalable Tree Boosting System. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining.* — The original XGBoost paper.

2. **Friedman, J. H. (2001).** Greedy function approximation: A gradient boosting machine. *Annals of Statistics, 29(5), 1189–1232.* — Foundational gradient boosting paper underlying XGBoost.

3. **Lou, Y., Caruana, R., & Gehrke, J. (2012).** Intelligible Models for Classification and Regression. *ACM SIGKDD.* — Introduces GA2M / EBM.

4. **Lou, Y., Caruana, R., Gehrke, J., & Hooker, G. (2013).** Accurate Intelligible Models with Pairwise Interactions. *ACM SIGKDD.* — Extends EBM with pairwise interaction terms.

5. **Caruana, R., Lou, Y., Gehrke, J., Koch, P., Sturm, M., & Elhadad, N. (2015).** Intelligible Models for Healthcare: Predicting Pneumonia Risk and Hospital 30-day Readmission. *ACM SIGKDD.* — Demonstrates EBM performance competitive with XGBoost in regulated settings.

6. **Nori, H., Jenkins, S., Koch, P., & Caruana, R. (2019).** InterpretML: A Unified Framework for Machine Learning Interpretability. *arXiv:1909.09223.* — Introduces the InterpretML library implementing EBM.

7. **Lundberg, S. M., & Lee, S. I. (2017).** A Unified Approach to Interpreting Model Predictions. *NeurIPS.* — The original SHAP paper.

8. **Lundberg, S. M., et al. (2020).** From Local Explanations to Global Understanding with Explainable AI for Trees. *Nature Machine Intelligence, 2, 56–67.* — TreeSHAP extension including Isolation Forest.

9. **Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008, 2012).** Isolation Forest. *IEEE ICDM 2008* and *IEEE Transactions on Knowledge and Data Engineering, 2012.* — Original Isolation Forest papers.

10. **Grinsztajn, L., Oyallon, E., & Varoquaux, G. (2022).** Why Tree-based Models Still Outperform Deep Learning on Tabular Data. *NeurIPS 2022.* — Comparative study confirming XGBoost/tree superiority on tabular data.

11. **Davis, J., & Goadrich, M. (2006).** The Relationship Between Precision-Recall and ROC Curves. *ICML 2006.* — Justification for PR-AUC preference over ROC-AUC in imbalanced classification.

12. **Ribeiro, M. T., Singh, S., & Guestrin, C. (2016).** "Why Should I Trust You?": Explaining the Predictions of Any Classifier. *ACM SIGKDD.* — Original LIME paper.

13. **Shapley, L. S. (1953).** A Value for n-Person Games. *Contributions to the Theory of Games, Princeton University Press.* — Game-theoretic foundation for SHAP values.

---

*End of Research Report*

*This document is research-only. It does not implement any model, does not modify the existing codebase, and does not produce any production code. All numerical examples and predictions are hypothetical and illustrative.*

*Team Vanguard · SIH 2026 · Problem Statement SIH26102*
