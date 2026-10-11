import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import adfuller, kpss, acf, pacf
from statsmodels.stats.diagnostic import acorr_ljungbox
from typing import Dict, Any, List, Optional
from app.services.dataset_service import get_dataset
from app.utils.serialization import clean_for_json

def compute_adf_test(dataset_id: str, target_col: str, regression: str = "c") -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    s = pd.to_numeric(df[target_col], errors='coerce').dropna().values
    
    if len(s) < 15:
        raise ValueError("ADF test requires at least 15 valid observations.")
        
    result = adfuller(s, regression=regression, autolag="AIC")
    stat = float(result[0])
    p_val = float(result[1])
    used_lag = int(result[2])
    n_obs = int(result[3])
    crit_vals = {str(k): float(v) for k, v in result[4].items()}
    
    is_stationary_5pct = bool(stat < crit_vals.get("5%", -2.86) and p_val < 0.05)
    interpretation = (
        "Reject null hypothesis of unit root at 5% significance level. The series exhibits statistical evidence consistent with stationarity."
        if is_stationary_5pct else
        "Fail to reject null hypothesis of unit root at 5% significance level. The series exhibits non-stationary characteristics (unit root likely present)."
    )
    
    return clean_for_json({
        "test_statistic": stat,
        "p_value": p_val,
        "lags_used": used_lag,
        "n_obs": n_obs,
        "critical_values": crit_vals,
        "is_stationary": is_stationary_5pct,
        "interpretation": interpretation,
        "null_hypothesis": "The time series possesses a unit root (is non-stationary)."
    })

def compute_kpss_test(dataset_id: str, target_col: str, regression: str = "c") -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    s = pd.to_numeric(df[target_col], errors='coerce').dropna().values
    
    if len(s) < 15:
        raise ValueError("KPSS test requires at least 15 valid observations.")
        
    stat, p_val, lags, crit_vals = kpss(s, regression=regression, nlags="auto")
    crit_dict = {str(k): float(v) for k, v in crit_vals.items()}
    
    is_stationary_5pct = bool(p_val >= 0.05)
    interpretation = (
        "Fail to reject null hypothesis at 5% significance level. The series is consistent with stationarity."
        if is_stationary_5pct else
        "Reject null hypothesis at 5% significance level. Evidence suggests non-stationarity."
    )
    
    return clean_for_json({
        "test_statistic": float(stat),
        "p_value": float(p_val),
        "lags_used": int(lags),
        "critical_values": crit_dict,
        "is_stationary": is_stationary_5pct,
        "interpretation": interpretation,
        "null_hypothesis": "The series is level or trend stationary."
    })

def compute_acf_pacf(dataset_id: str, target_col: str, nlags: int = 30) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    s = pd.to_numeric(df[target_col], errors='coerce').dropna().values
    
    if len(s) < 10:
        raise ValueError("Dataset has too few observations for ACF/PACF analysis.")
        
    max_lags = min(nlags, len(s) // 2 - 1)
    if max_lags < 2:
        max_lags = 2
        
    # ACF with confidence intervals (95% CI)
    acf_vals, acf_confint = acf(s, nlags=max_lags, alpha=0.05)
    
    # PACF with confidence intervals (95% CI)
    try:
        pacf_vals, pacf_confint = pacf(s, nlags=max_lags, alpha=0.05, method="yule_walker")
    except Exception:
        pacf_vals, pacf_confint = pacf(s, nlags=max_lags, alpha=0.05, method="ldb")
        
    # Confidence bound ~ 1.96 / sqrt(N)
    bound = 1.96 / np.sqrt(len(s))
    
    lags = list(range(len(acf_vals)))
    
    return clean_for_json({
        "lags": lags,
        "acf": acf_vals.tolist(),
        "acf_lower": acf_confint[:, 0].tolist(),
        "acf_upper": acf_confint[:, 1].tolist(),
        "pacf": pacf_vals.tolist(),
        "pacf_lower": pacf_confint[:, 0].tolist(),
        "pacf_upper": pacf_confint[:, 1].tolist(),
        "ci_bound": float(bound),
        "n_obs": len(s)
    })

def compute_residual_diagnostics(residuals: np.ndarray, model_df: int = 0) -> Dict[str, Any]:
    res = np.asarray(residuals, dtype=float)
    res = res[~np.isnan(res)]
    if len(res) < 8:
        return {"error": "Insufficient residual observations for diagnostics."}
        
    # Ljung-Box test
    lags_lb = min(10, len(res) // 3)
    lb_df = acorr_ljungbox(res, lags=[lags_lb], model_df=model_df, return_df=True)
    lb_stat = float(lb_df["lb_stat"].iloc[0])
    lb_pvalue = float(lb_df["lb_pvalue"].iloc[0])
    
    # Histogram distribution
    hist, bin_edges = np.histogram(res, bins=min(20, len(res) // 4))
    bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])
    
    # Q-Q plot theoretical vs sample quantiles
    osm, osr = stats.probplot(res, dist="norm")
    
    # Residual ACF
    max_lags = min(20, len(res) // 3)
    res_acf, _ = acf(res, nlags=max_lags, alpha=0.05)
    bound = 1.96 / np.sqrt(len(res))
    
    return clean_for_json({
        "ljung_box": {
            "statistic": lb_stat,
            "p_value": lb_pvalue,
            "lags": lags_lb,
            "null_hypothesis": "Residuals are independently distributed (white noise / no autocorrelation).",
            "interpretation": "Residuals exhibit no significant autocorrelation (white noise)." if lb_pvalue > 0.05 else "Significant residual autocorrelation detected."
        },
        "histogram": {
            "counts": hist.tolist(),
            "bins": [round(b, 4) for b in bin_centers.tolist()]
        },
        "qq_plot": {
            "theoretical": osm[0].tolist(),
            "sample": osm[1].tolist()
        },
        "acf": {
            "lags": list(range(len(res_acf))),
            "values": res_acf.tolist(),
            "ci_bound": float(bound)
        },
        "mean": float(np.mean(res)),
        "std": float(np.std(res))
    })
