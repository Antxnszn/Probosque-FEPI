# Field Audit Methodology & Statistical Survival Estimation

## 1. Field Sampling Design

Field audits replace single aggregate tree counts with standardized sampling units:

- **Sampling Unit Geometry:** Circular plots of $500\,\text{m}^2$, corresponding to an exact radius of:
  $$r = \sqrt{\frac{500}{\pi}} \approx 12.6157\,\text{m}$$
- **Data Captured per Sampling Unit:**
  - Center coordinates $(\text{lat}, \text{lon})$ and GPS accuracy in meters ($EPE$).
  - Number of surviving trees ($y_i$).
  - Number of dead trees ($d_i$).
  - Unknown/missing sites ($u_i$).
  - Denominator sites ($x_i = y_i + d_i$ or program-defined planted sites).
  - High-resolution photographic evidence taken from unit center.

---

## 2. Server-Authoritative Survival Estimation

The field client submits raw observations only. The backend computes the final point estimate and confidence interval to ensure statistical consistency and prevent edge tampering.

### 2.1 Ratio Estimator ($\hat{p}_R$)
Because sampling units may feature variable densities or planting counts, the unweighted average of ratios is biased. The estimator used is the **Ratio Estimator**:

$$\hat{p}_R = \frac{\sum_{i=1}^{n} y_i}{\sum_{i=1}^{n} x_i}$$

Where:
- $n$: Number of completed sampling units.
- $y_i$: Count of surviving trees in unit $i$.
- $x_i$: Count of evaluated planting sites in unit $i$.

### 2.2 Standard Error ($SE$)
Computed from the sample residuals $e_i = y_i - \hat{p}_R x_i$:

$$s_e^2 = \frac{1}{n-1}\sum_{i=1}^{n} (e_i - \bar{e})^2 = \frac{1}{n-1}\sum_{i=1}^{n} (y_i - \hat{p}_R x_i)^2$$

$$SE(\hat{p}_R) \approx \sqrt{\frac{s_e^2}{n \bar{x}^2}}$$

Where $\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i$.

### 2.3 Confidence Interval ($CI$)
For small sample sizes ($n \ge 2$), critical values are computed via the Student-$t$ distribution with $df = n - 1$:

$$CI_{1-\alpha} = \hat{p}_R \pm t_{n-1, 1-\alpha/2} \cdot SE(\hat{p}_R)$$

Bounds are clamped to $[0.0, 1.0]$. If $n < 2$, no variance-based confidence interval is computed (`ci_low_pct` and `ci_high_pct` are null).
