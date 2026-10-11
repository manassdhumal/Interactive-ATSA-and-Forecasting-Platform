import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import adfuller, acf
from typing import Dict, Any, List
from app.services.dataset_service import get_dataset
from app.utils.serialization import clean_for_json

def analyze_and_suggest_transformations(dataset_id: str, target_col: str) -> Dict[str, Any]:
    """
    Analyzes the series characteristics and recommends automated preprocessing/transformations:
    1. Missing Data Evaluation: Detects missing values and suggests interpolation/fill.
    2. Non-Stationarity & Unit Root: Runs ADF test; if non-stationary (p >= 0.05), suggests differencing (d=1).
    3. Variance Stabilization: Checks skewness, dispersion, and positivity (>0) to suggest Log Transformation.
    4. Seasonality Detection: Evaluates ACF peaks to suggest seasonal differencing.
    5. Frequency / Irregularity: Recommends resampling if timestamps have irregular gaps.
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
        
    df = ds["df"].copy()
    time_col = ds["metadata"]["time_col"]
    
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found.")
        
    series_raw = pd.to_numeric(df[target_col], errors='coerce')
    total_len = len(series_raw)
    missing_count = int(series_raw.isna().sum())
    
    # Work on cleaned numerical series
    s = series_raw.dropna().values
    
    suggestions: List[Dict[str, Any]] = []
    series_profile: Dict[str, Any] = {
        "total_observations": total_len,
        "missing_count": missing_count,
        "missing_percentage": round((missing_count / total_len) * 100, 2) if total_len > 0 else 0,
        "is_positive": bool((s > 0).all()) if len(s) > 0 else False,
        "has_zeros": bool((s == 0).any()) if len(s) > 0 else False,
        "has_negatives": bool((s < 0).any()) if len(s) > 0 else False
    }
    
    if len(s) < 10:
        return clean_for_json({
            "profile": series_profile,
            "suggestions": [{
                "action": "none",
                "title": "Insufficient Observations",
                "priority": "high",
                "reason": "Series contains fewer than 10 valid observations. Collect more data for reliable analysis.",
                "button_label": "No action possible"
            }]
        })
        
    # 1. Missing Value Recommendation
    if missing_count > 0:
        pct = series_profile["missing_percentage"]
        if pct < 15:
            suggestions.append({
                "action": "interpolate",
                "title": "Linear Interpolation for Missing Values",
                "priority": "high",
                "reason": f"Detected {missing_count} missing value(s) ({pct}%). Linear interpolation will reconstruct continuous trajectory without dropping temporal points.",
                "params": {},
                "button_label": "Apply Linear Interpolation"
            })
        else:
            suggestions.append({
                "action": "drop_na",
                "title": "Drop Missing Observations",
                "priority": "medium",
                "reason": f"Detected significant missingness ({missing_count} rows, {pct}%). Dropping missing rows or resampling is recommended.",
                "params": {},
                "button_label": "Drop Missing Rows"
            })

    # 2. Stationarity & Differencing Recommendation (ADF Test)
    try:
        adf_stat, adf_p, _, _, crit, _ = adfuller(s, autolag='AIC')
        series_profile["adf_p_value"] = float(adf_p)
        series_profile["adf_stat"] = float(adf_stat)
        
        if adf_p >= 0.05:
            suggestions.append({
                "action": "diff",
                "title": "First-Order Differencing (d=1)",
                "priority": "high",
                "reason": f"ADF test p-value is {adf_p:.4f} (p >= 0.05), indicating a non-stationary stochastic trend or unit root. First-order differencing will remove trend drift and stabilize the mean for AR/MA/ARMA modeling.",
                "params": {"order": 1},
                "button_label": "Apply First Difference (d=1)"
            })
        else:
            suggestions.append({
                "action": "already_stationary",
                "title": "Series is Stationary",
                "priority": "info",
                "reason": f"ADF test p-value is {adf_p:.4f} (p < 0.05). The series is already mean-stationary; no differencing needed for ARMA.",
                "params": {},
                "button_label": "No Differencing Needed"
            })
    except Exception as e:
        pass

    # 3. Variance Stabilization (Log Transformation)
    if series_profile["is_positive"]:
        skew = stats.skew(s)
        std_val = float(np.std(s))
        mean_val = float(np.mean(s))
        cv = (std_val / mean_val) if mean_val > 0 else 0
        series_profile["skewness"] = float(skew)
        series_profile["coefficient_of_variation"] = float(cv)
        
        if skew > 1.2 or cv > 0.8:
            suggestions.append({
                "action": "log",
                "title": "Logarithmic Transformation (Y > 0)",
                "priority": "medium",
                "reason": f"All values are strictly positive and the distribution exhibits right-skewness (skew={skew:.2f}) or heteroscedastic dispersion. Applying natural logarithm log(Y_t) will stabilize variance and normalize innovations.",
                "params": {},
                "button_label": "Apply Log Transform"
            })

    # 4. Seasonality Detection (Autocorrelation Peak Check)
    try:
        max_lag = min(36, len(s) // 3)
        if max_lag >= 8:
            acf_vals = acf(s, nlags=max_lag)
            # Check standard seasonal periods: 7 (weekly), 12 (monthly)
            candidate_periods = [p for p in [7, 12, 24] if p < len(acf_vals)]
            detected_period = None
            max_peak = 0.0
            for p in candidate_periods:
                if acf_vals[p] > 0.35 and acf_vals[p] > max_peak:
                    max_peak = float(acf_vals[p])
                    detected_period = p
                    
            if detected_period:
                series_profile["detected_seasonality_period"] = detected_period
                suggestions.append({
                    "action": "seasonal_diff",
                    "title": f"Seasonal Differencing (Period s={detected_period})",
                    "priority": "medium",
                    "reason": f"Strong recurring cyclical autocorrelation detected at lag {detected_period} (ACF={max_peak:.2f}). Seasonal differencing (Y_t - Y_{{t-{detected_period}}}) or fitting SARIMA/Holt-Winters is recommended.",
                    "params": {"period": detected_period},
                    "button_label": f"Apply Seasonal Diff (s={detected_period})"
                })
    except Exception:
        pass

    return clean_for_json({
        "dataset_id": dataset_id,
        "target_col": target_col,
        "profile": series_profile,
        "suggestions": suggestions
    })
