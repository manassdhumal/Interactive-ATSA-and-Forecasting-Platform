import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.seasonal import seasonal_decompose
from typing import Dict, Any, List, Optional
from app.services.dataset_service import get_dataset
from app.utils.serialization import clean_for_json

def get_descriptive_statistics(dataset_id: str, target_col: str) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    if target_col not in df.columns:
        raise ValueError(f"Column '{target_col}' not found in dataset.")
        
    s = pd.to_numeric(df[target_col], errors='coerce').dropna()
    if len(s) == 0:
        raise ValueError(f"Column '{target_col}' has no valid numerical values.")
        
    res = {
        "count": int(len(s)),
        "missing_count": int(df[target_col].isna().sum()),
        "mean": float(s.mean()),
        "std": float(s.std()) if len(s) > 1 else 0.0,
        "median": float(s.median()),
        "min": float(s.min()),
        "max": float(s.max()),
        "q25": float(s.quantile(0.25)),
        "q75": float(s.quantile(0.75)),
        "skewness": float(stats.skew(s)) if len(s) >= 3 else None,
        "kurtosis": float(stats.kurtosis(s)) if len(s) >= 4 else None
    }
    return clean_for_json(res)

def get_rolling_and_trend(dataset_id: str, target_col: str, window: int = 7) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    time_col = ds["metadata"]["time_col"]
    
    s = pd.to_numeric(df[target_col], errors='coerce')
    rolling_mean = s.rolling(window=window, min_periods=1).mean()
    rolling_std = s.rolling(window=window, min_periods=1).std().fillna(0)
    
    # Linear trend regression
    valid_idx = ~s.isna()
    x = np.arange(len(s))[valid_idx]
    y = s.values[valid_idx]
    
    if len(x) > 1:
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        trend_line = (slope * np.arange(len(s)) + intercept).tolist()
        trend_summary = {
            "slope": float(slope),
            "intercept": float(intercept),
            "r_squared": float(r_value ** 2),
            "p_value": float(p_value),
            "interpretation": "Upward trend" if slope > 0 and p_value < 0.05 else ("Downward trend" if slope < 0 and p_value < 0.05 else "No statistically significant linear trend")
        }
    else:
        trend_line = []
        trend_summary = {}

    return clean_for_json({
        "timestamps": df[time_col].astype(str).tolist(),
        "values": s.tolist(),
        "rolling_mean": rolling_mean.tolist(),
        "rolling_std": rolling_std.tolist(),
        "trend_line": trend_line,
        "trend_summary": trend_summary,
        "window": window
    })

def compute_decomposition(dataset_id: str, target_col: str, model_type: str = "additive", period: Optional[int] = None) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    time_col = ds["metadata"]["time_col"]
    
    s = pd.to_numeric(df[target_col], errors='coerce').interpolate().bfill().ffill()
    
    if period is None:
        period = 12 if len(s) >= 24 else (7 if len(s) >= 14 else 4)
        
    if len(s) < 2 * period:
        raise ValueError(f"Decomposition requires at least 2 complete cycles (2 * {period} = {2 * period} observations). Dataset has {len(s)}.")
        
    if model_type == "multiplicative" and (s <= 0).any():
        raise ValueError("Multiplicative decomposition requires all observed values to be strictly positive (> 0).")
        
    decomp = seasonal_decompose(s.values, model=model_type, period=period, extrapolate_trend='freq')
    
    return clean_for_json({
        "timestamps": df[time_col].astype(str).tolist(),
        "observed": s.tolist(),
        "trend": decomp.trend.tolist(),
        "seasonal": decomp.seasonal.tolist(),
        "residual": decomp.resid.tolist(),
        "period": period,
        "model_type": model_type
    })

def compute_lags(dataset_id: str, target_col: str, lags: List[int]) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    df = ds["df"]
    s = pd.to_numeric(df[target_col], errors='coerce').dropna()
    
    lag_data = {}
    for lag in lags:
        if lag < len(s):
            x = s.iloc[:-lag].values.tolist()
            y = s.iloc[lag:].values.tolist()
            lag_data[str(lag)] = [{"x": float(xi), "y": float(yi)} for xi, yi in zip(x, y)]
            
    return clean_for_json({"lags": lag_data})
