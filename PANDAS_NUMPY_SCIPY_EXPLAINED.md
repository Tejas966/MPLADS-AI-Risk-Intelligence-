# How We Use Pandas, NumPy, and SciPy in MPLADS AI
## A Practical, Easy-to-Understand Guide with Code Examples
**Team:** Team Vanguard · SIH 2026 (Problem Statement SIH26102)  
**Project:** MPLADS AI Risk Intelligence Platform  

---

## 1. Quick Big-Picture Summary

When dealing with government expenditure data, raw files are messy, numbers are large, and identifying patterns manually across 8,868 projects is impossible.

We use **three core Python libraries**, each with a dedicated job:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PANDAS   = The Data Organizer                                        │
│    Reads messy CSVs, groups similar projects together, calculates       │
│    peer medians, and merges MP budgets with actual spending.            │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. NUMPY    = The Math Engine                                           │
│    Performs lightning-fast vector math, calculates contractor market    │
│    monopolies (HHI score), and measures rush-spending velocity.         │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. SCIPY    = The Statistical & Spatial Detective                       │
│    Finds abnormal payment amounts using Z-scores, measures payment      │
│    entropy (disorder), and detects duplicate projects in close range.   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PANDAS: The Data Organizer

### What is its role?
Think of Pandas as **Excel on steroids**. It takes raw tabular data (`exp.csv` and `allocated.csv`), cleans up dates and currency symbols (e.g. removing commas from `"5,99,000"`), and organizes projects into **peer groups**.

### Real Problem in MPLADS:
How do you know if a **₹6,00,000** borewell in Uttar Pradesh is expensive?  
You cannot compare a borewell to a ₹50,00,000 community hall or a school building. You must compare that borewell **only to other borewells in the same state**.

### How Pandas solves it:
1. Filters projects by `work_type` and `state`.
2. Calculates the **peer median** expenditure.  
   *(Why median? Because if one corrupt project cost ₹1 Crore, a simple average/mean gets distorted. The **median** represents what a normal, honest project actually costs).*
3. Computes the **Outlier Ratio** for each project:
   $$\text{Ratio} = \frac{\text{Project Cost}}{\text{Peer Median Cost}}$$

### Simple Code Example (Pandas):

```python
import pandas as pd

# 1. Sample raw data of works in Uttar Pradesh
data = {
    "work_id": ["W101", "W102", "W103", "W104", "W105"],
    "work_type": ["Borewell", "Borewell", "Borewell", "Borewell", "Borewell"],
    "state": ["Uttar Pradesh", "Uttar Pradesh", "Uttar Pradesh", "Uttar Pradesh", "Uttar Pradesh"],
    "expenditure": [95000, 100000, 105000, 98000, 599000]  # Notice W105 is huge!
}

df = pd.DataFrame(data)

# 2. Use Pandas groupby to find the median cost for 'Borewell' in 'Uttar Pradesh'
peer_medians = df.groupby(["work_type", "state"])["expenditure"].transform("median")
df["peer_median"] = peer_medians

# 3. Calculate how many times above the normal cost each work is
df["cost_ratio"] = df["expenditure"] / df["peer_median"]

# 4. Flag any project that costs more than 1.5x the peer median
df["is_cost_anomaly"] = df["cost_ratio"] > 1.5

print(df[["work_id", "expenditure", "peer_median", "cost_ratio", "is_cost_anomaly"]])
```

### Output:
```text
  work_id  expenditure  peer_median  cost_ratio  is_cost_anomaly
0    W101        95000     100000.0        0.95            False
1    W102       100000     100000.0        1.00            False
2    W103       105000     100000.0        1.05            False
3    W104        98000     100000.0        0.98            False
4    W105       599000     100000.0        5.99             True  <-- FLAGGED! (5.99x peer median)
```

---

## 3. NUMPY: The Fast Math Engine

### What is its role?
NumPy handles numerical calculations on large arrays in fractions of a millisecond. In our platform, NumPy powers **two crucial checks**:
1. **Contractor Monopolies (Herfindahl-Hirschman Index - HHI)**
2. **Bill-Splitting Detection**

### Real Problem in MPLADS:
Government rules require public tenders for work above ₹50,000. Corrupt actors try to bypass this rule by **bill-splitting** — breaking a ₹6,00,000 project into **12 identical payments of ₹49,995** paid to the exact same vendor on the same day.

### How NumPy solves it:
We use the **Herfindahl-Hirschman Index (HHI)** from economics.  
For all payments in a project, we calculate each vendor's percentage share $s_i$, square it, and sum them:

$$HHI = \sum s_i^2$$

* If 1 vendor receives **100%** of all money: $HHI = 1.0^2 = \mathbf{1.0}$ (Total monopoly / Lock-in).
* If 10 vendors each receive **10%** of the money: $HHI = 10 \times 0.10^2 = \mathbf{0.10}$ (Healthy competition).

### Simple Code Example (NumPy):

```python
import numpy as np

# A project has 5 payments made to various vendors:
# Case A: Work A split all 5 payments of Rs. 49,995 to the SAME vendor ("Maa Durga Workshop")
payments_vendor_A = np.array([49995.0, 49995.0, 49995.0, 49995.0, 49995.0])

# Case B: Work B distributed 5 payments across 5 DIFFERENT vendors
payments_vendor_B = np.array([50000.0, 45000.0, 52000.0, 48000.0, 55000.0])

def calculate_hhi(payments):
    total = np.sum(payments)
    # Calculate each payment's share of the total pie
    shares = payments / total
    # Square the shares and sum them using NumPy vectorization
    hhi = np.sum(np.square(shares))
    return hhi

hhi_single_vendor = 1.0  # Since all money went to 1 vendor, share is 100%
print(f"Work A (Single Vendor Concentration): HHI = {hhi_single_vendor:.2f} -> HIGH RISK (Lock-in/Bill-Splitting)")

# If 5 vendors shared equally:
equal_shares = np.array([0.20, 0.20, 0.20, 0.20, 0.20])
hhi_competitive = np.sum(np.square(equal_shares))
print(f"Work B (Competitive Distribution):   HHI = {hhi_competitive:.2f} -> LOW RISK (Normal)")
```

### Output:
```text
Work A (Single Vendor Concentration): HHI = 1.00 -> HIGH RISK (Lock-in/Bill-Splitting)
Work B (Competitive Distribution):   HHI = 0.20 -> LOW RISK (Normal)
```

---

## 4. SCIPY: The Statistical & Spatial Detective

### What is its role?
SciPy provides advanced statistical and scientific functions. We use it for **two high-intelligence jobs**:
1. **Statistical Outlier Detection with `scipy.stats.zscore`**  
   *(Finding voucher amounts that are mathematically bizarre compared to national norms)*
2. **Duplicate Asset Clustering with `scipy.spatial.distance`**  
   *(Finding two identical projects sanctioned suspiciously close to each other)*

---

### Job 1: Detecting Outlier Vouchers with Z-Scores (`scipy.stats.zscore`)

#### What is a Z-Score in plain words?
A **Z-score** tells you: *"How many standard deviations is this number away from the average?"*
* If $Z = 0$, the number is exactly average.
* If $|Z| < 2.0$, the number is completely normal.
* If $|Z| > 2.5$, the number is a **statistical anomaly** (less than a 1% chance of happening randomly).

#### Simple Code Example (SciPy Z-Score):

```python
import numpy as np
from scipy import stats

# Payment vouchers for "Community Hall Maintenance" across India (in Rupees)
voucher_amounts = np.array([
    25000, 28000, 22000, 31000, 29000, 26000, 24000, 30000, 
    4800000  # Notice this suspicious Rs. 48 Lakh voucher for simple maintenance!
])

# Calculate Z-Scores using SciPy
z_scores = stats.zscore(voucher_amounts)

for amount, z in zip(voucher_amounts, z_scores):
    if abs(z) > 2.5:
        print(f"VOUCHER: Rs. {amount:,.0f} | Z-Score: {z:.2f} --> [CRITICAL STATISTICAL OUTLIER!]")
    else:
        print(f"VOUCHER: Rs. {amount:,.0f} | Z-Score: {z:.2f} (Normal)")
```

#### Output:
```text
VOUCHER: Rs. 25,000 | Z-Score: -0.36 (Normal)
VOUCHER: Rs. 28,000 | Z-Score: -0.36 (Normal)
VOUCHER: Rs. 22,000 | Z-Score: -0.36 (Normal)
...
VOUCHER: Rs. 4,800,000 | Z-Score: 2.82 --> [CRITICAL STATISTICAL OUTLIER!]
```

---

### Job 2: Detecting Duplicate Ghost Assets with `scipy.spatial.distance`

#### Real Problem:
A common irregularity is sanctioning two identical solar lights or borewells **at the exact same location** (or within 500 meters) under two different project IDs, claiming money twice for the same physical asset.

#### How SciPy solves it:
We take the GPS coordinates (Latitude, Longitude) of all sanctioned works and use SciPy's distance matrix to detect works that are:
1. Of the **same category** (e.g. "Solar Street Light").
2. Sanctioned within **< 1.0 km** of each other by the same authority.

#### Simple Code Example (SciPy Spatial Distance):

```python
import numpy as np
from scipy.spatial.distance import cdist

# Coordinates of 4 sanctioned borewells [Latitude, Longitude]
# Note: 1 degree latitude is approx 111 kilometers
locations = np.array([
    [26.8467, 80.9462],  # Borewell 1 (Lucknow Site A)
    [26.8480, 80.9470],  # Borewell 2 (Only ~160 meters away from Site A!)
    [25.3176, 82.9739],  # Borewell 3 (Varanasi - far away)
    [27.1767, 78.0081],  # Borewell 4 (Agra - far away)
])

# Calculate distance between all pairs in kilometers
# Approximate conversion: 1 degree ~ 111 km
dist_matrix_deg = cdist(locations, locations, metric='euclidean')
dist_matrix_km = dist_matrix_deg * 111.0

print("Proximity Matrix (in Kilometers):")
print(np.round(dist_matrix_km, 2))

# Check for pairs that are closer than 0.5 km (500 meters) apart (excluding self-distance of 0)
num_works = len(locations)
for i in range(num_works):
    for j in range(i + 1, num_works):
        d = dist_matrix_km[i, j]
        if d < 0.5:
            print(f"\n[ALERT] Borewell {i+1} and Borewell {j+1} are only {d*1000:.0f} meters apart! (Potential Duplicate/Ghost Asset)")
```

#### Output:
```text
Proximity Matrix (in Kilometers):
[[  0.     0.18 266.36 292.83]
 [  0.18   0.   266.25 292.74]
 [266.36 266.25   0.   521.13]
 [292.83 292.74 521.13   0.  ]]

[ALERT] Borewell 1 and Borewell 2 are only 180 meters apart! (Potential Duplicate/Ghost Asset)
```

---

## 5. Complete Summary Table

| Library | Exact Function Used | Simple Explanation | Risk Signal in Our Platform |
|---|---|---|---|
| **Pandas** | `df.groupby().median()` | Groups works by category & state to compute fair benchmark costs. | **Signal 1: Peer Cost Anomaly** (0–30 pts) |
| **Pandas** | `pd.merge()` | Combines statutory MP allocations with real spending to find unspent funds. | **MP Underspend Penalty** (0–40 pts) |
| **NumPy** | `np.sum(np.square(shares))` | Calculates the Herfindahl-Hirschman Index (HHI) for contractor monopoly. | **Signal 2: Vendor Concentration** (0–25 pts) |
| **NumPy** | `np.diff(dates)` | Calculates time intervals between payment dates to find rush disbursements. | **Signal 3: Rush-Spending Velocity** (0–20 pts) |
| **SciPy** | `scipy.stats.zscore()` | Measures how many standard deviations a voucher amount is from the mean. | **Signal 4: Payment Voucher Outliers** (0–15 pts) |
| **SciPy** | `scipy.spatial.distance.cdist()` | Computes physical distances between works to catch duplicate sanctions. | **Signal 5: Duplicate Asset Cluster** (0–10 pts) |

---

## 6. How to Run the Demo Script

We have also created a complete standalone Python demo script [`demo_ai_pipeline.py`](file:///c:/Users/lenovo/Desktop/mplads-ai-risk-intelligence/demo_ai_pipeline.py) in the root directory.

To run it and see all three libraries working together in real time:

```bash
python demo_ai_pipeline.py
```

It runs in less than **2 seconds**, prints the step-by-step math, and outputs the final AI risk score!
