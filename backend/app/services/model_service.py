import uuid
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from scipy import stats
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, Holt, ExponentialSmoothing
from app.services.dataset_service import get_dataset
from app.services.evaluation_service import compute_metrics
from app.services.diagnostic_service import compute_residual_diagnostics
from app.utils.serialization import clean_for_json

# In-memory store for model fit sessions
ANALYSES_STORE: Dict[str, Dict[str, Any]] = {}

def fit_time_series_model(
    dataset_id: str,
    target_column: str,
    model_type: str,
    parameters: Dict[str, Any],
    forecast_horizon: int = 12,
    confidence_level: float = 0.95
) -> Dict[str, Any]:
    """
    Fits genuine ATSA models using statsmodels:
    - 'linear_trend': Linear regression on time index
    - 'seasonal_reg': Linear regression with seasonal dummies
    - 'ses': Simple Exponential Smoothing
    - 'holt': Holt's Linear Trend Method
    - 'holt_winters': Holt-Winters Exponential Smoothing (additive/multiplicative)
    - 'ar': Autoregressive process AR(p) via ARIMA(p,0,0)
    - 'ma': Moving Average process MA(q) via ARIMA(0,0,q)
    - 'arma': ARMA(p, q) via ARIMA(p,0,q)
    - 'arima': ARIMA(p, d, q)
    - 'sarima': SARIMAX(p, d, q) x (P, D, Q, s)
    - 'naive': Naive random-walk benchmark
    - 'snaive': Seasonal naive benchmark
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
        
    df = ds["df"].copy()
    time_col = ds["metadata"]["time_col"]
    
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' does not exist.")
        
    s = pd.to_numeric(df[target_column], errors='coerce').dropna()
    if len(s) < 10:
        raise ValueError("Insufficient observations (minimum 10 required for modeling).")
        
    time_series = df.loc[s.index, time_col].values
    timestamps = [str(t) for t in time_series]
    y = s.values
    n = len(y)
    
    # Generate future timestamps
    try:
        last_dt = pd.to_datetime(timestamps[-1])
        # Try inferring dt step
        if len(timestamps) > 1:
            prev_dt = pd.to_datetime(timestamps[-2])
            delta = last_dt - prev_dt
            future_dts = [last_dt + delta * (i + 1) for i in range(forecast_horizon)]
        else:
            future_dts = pd.date_range(start=last_dt, periods=forecast_horizon + 1, freq="D")[1:]
        forecast_timestamps = [dt.strftime("%Y-%m-%d %H:%M:%S") if ":" in str(dt) else dt.strftime("%Y-%m-%d") for dt in future_dts]
    except Exception:
        forecast_timestamps = [f"Step +{i+1}" for i in range(forecast_horizon)]
        
    fitted = np.full(n, np.nan)
    forecast = np.full(forecast_horizon, np.nan)
    lower_ci = np.full(forecast_horizon, np.nan)
    upper_ci = np.full(forecast_horizon, np.nan)
    residuals = np.full(n, np.nan)
    param_estimates = {}
    ic_dict = {}
    warnings = []
    model_df_val = 0
    
    # Model fitting logic
    if model_type == "naive":
        fitted[1:] = y[:-1]
        forecast[:] = y[-1]
        residuals = y - fitted
        param_estimates = {"last_value": float(y[-1])}
        
    elif model_type == "snaive":
        period = int(parameters.get("period", 12 if n >= 24 else 7))
        if n <= period:
            raise ValueError(f"Seasonal Naive requires series length ({n}) > seasonal period ({period}).")
        fitted[period:] = y[:-period]
        for h in range(forecast_horizon):
            forecast[h] = y[-period + (h % period)]
        residuals = y - fitted
        param_estimates = {"seasonal_period": period}

    elif model_type == "linear_trend":
        x = np.arange(n)
        slope, intercept, r_val, p_val, std_err = stats.linregress(x, y)
        fitted = slope * x + intercept
        residuals = y - fitted
        x_future = np.arange(n, n + forecast_horizon)
        forecast = slope * x_future + intercept
        
        # Prediction interval for linear regression
        se_res = np.std(residuals)
        crit_z = stats.norm.ppf(0.5 + confidence_level / 2)
        lower_ci = forecast - crit_z * se_res
        upper_ci = forecast + crit_z * se_res
        param_estimates = {
            "intercept": float(intercept),
            "slope": float(slope),
            "r_squared": float(r_val ** 2),
            "p_value": float(p_val),
            "std_error": float(std_err)
        }
        
    elif model_type == "ses":
        alpha = parameters.get("alpha")
        alpha = float(alpha) if alpha is not None and alpha != "auto" else None
        fit_res = SimpleExpSmoothing(y).fit(smoothing_level=alpha, optimized=(alpha is None))
        fitted = fit_res.fittedvalues
        forecast = fit_res.forecast(forecast_horizon)
        residuals = y - fitted
        se = np.std(residuals)
        crit_z = stats.norm.ppf(0.5 + confidence_level / 2)
        lower_ci = forecast - crit_z * se
        upper_ci = forecast + crit_z * se
        param_estimates = {"alpha": float(fit_res.params.get("smoothing_level", 0.0))}
        ic_dict = {"aic": float(fit_res.aic), "bic": float(fit_res.bic)}
        
    elif model_type == "holt":
        alpha = parameters.get("alpha")
        beta = parameters.get("beta")
        alpha = float(alpha) if alpha is not None and alpha != "auto" else None
        beta = float(beta) if beta is not None and beta != "auto" else None
        fit_res = Holt(y).fit(smoothing_level=alpha, smoothing_trend=beta, optimized=(alpha is None or beta is None))
        fitted = fit_res.fittedvalues
        forecast = fit_res.forecast(forecast_horizon)
        residuals = y - fitted
        se = np.std(residuals)
        crit_z = stats.norm.ppf(0.5 + confidence_level / 2)
        lower_ci = forecast - crit_z * se
        upper_ci = forecast + crit_z * se
        param_estimates = {
            "alpha": float(fit_res.params.get("smoothing_level", 0.0)),
            "beta": float(fit_res.params.get("smoothing_trend", 0.0))
        }
        ic_dict = {"aic": float(fit_res.aic), "bic": float(fit_res.bic)}
        
    elif model_type == "holt_winters":
        trend = parameters.get("trend", "add")
        seasonal = parameters.get("seasonal", "add")
        period = int(parameters.get("period", 12 if n >= 24 else 7))
        if seasonal == "mul" and (y <= 0).any():
            raise ValueError("Multiplicative seasonality requires all values to be positive (> 0).")
        fit_res = ExponentialSmoothing(y, trend=trend, seasonal=seasonal, seasonal_periods=period).fit()
        fitted = fit_res.fittedvalues
        forecast = fit_res.forecast(forecast_horizon)
        residuals = y - fitted
        se = np.std(residuals)
        crit_z = stats.norm.ppf(0.5 + confidence_level / 2)
        lower_ci = forecast - crit_z * se
        upper_ci = forecast + crit_z * se
        param_estimates = {
            "alpha": float(fit_res.params.get("smoothing_level", 0.0)),
            "beta": float(fit_res.params.get("smoothing_trend", 0.0)),
            "gamma": float(fit_res.params.get("smoothing_seasonal", 0.0)),
            "period": period,
            "trend_type": trend,
            "seasonal_type": seasonal
        }
        ic_dict = {"aic": float(fit_res.aic), "bic": float(fit_res.bic)}

    elif model_type in ["ar", "ma", "arma", "arima"]:
        p = int(parameters.get("p", 1 if model_type in ["ar", "arma", "arima"] else 0))
        d = int(parameters.get("d", 1 if model_type == "arima" else 0))
        q = int(parameters.get("q", 1 if model_type in ["ma", "arma", "arima"] else 0))
        trend_cfg = parameters.get("trend", "c" if d == 0 else "n")
        
        # Check ARMA stationarity requirement warning
        if model_type in ["ar", "ma", "arma"] and d == 0:
            from statsmodels.tsa.stattools import adfuller
            try:
                adf_stat, adf_p = adfuller(y)[:2]
                if adf_p >= 0.05:
                    warnings.append(f"ADF test p-value is {adf_p:.4f} (>= 0.05). {model_type.upper()} requires a stationary series. Consider differencing via ARIMA if non-stationary.")
            except Exception:
                pass
                
        model_fit = ARIMA(y, order=(p, d, q), trend=trend_cfg).fit()
        fitted = model_fit.fittedvalues
        residuals = model_fit.resid
        forecast_res = model_fit.get_forecast(steps=forecast_horizon)
        forecast = forecast_res.predicted_mean
        ci = forecast_res.conf_int(alpha=1.0 - confidence_level)
        lower_ci = ci[:, 0]
        upper_ci = ci[:, 1]
        
        model_df_val = p + q
        p_names = getattr(model_fit, "param_names", [f"param_{i}" for i in range(len(model_fit.params))])
        param_estimates = {str(k): round(float(v), 5) for k, v in zip(p_names, model_fit.params)}
        ic_dict = {
            "aic": float(model_fit.aic),
            "bic": float(model_fit.bic),
            "hqic": float(model_fit.hqic) if hasattr(model_fit, "hqic") else None,
            "log_likelihood": float(model_fit.llf)
        }

    elif model_type == "sarima":
        p = int(parameters.get("p", 1))
        d = int(parameters.get("d", 0))
        q = int(parameters.get("q", 1))
        P = int(parameters.get("P", 1))
        D = int(parameters.get("D", 0))
        Q = int(parameters.get("Q", 1))
        s_val = int(parameters.get("s", 12 if n >= 24 else 7))
        trend_cfg = parameters.get("trend", "c" if (d == 0 and D == 0) else None)
        
        sarima_model = SARIMAX(y, order=(p, d, q), seasonal_order=(P, D, Q, s_val), trend=trend_cfg, enforce_stationarity=False, enforce_invertibility=False)
        model_fit = sarima_model.fit(disp=False)
        fitted = model_fit.fittedvalues
        residuals = model_fit.resid
        forecast_res = model_fit.get_forecast(steps=forecast_horizon)
        forecast = forecast_res.predicted_mean
        ci = forecast_res.conf_int(alpha=1.0 - confidence_level)
        lower_ci = ci[:, 0]
        upper_ci = ci[:, 1]
        
        model_df_val = p + q + P + Q
        p_names = getattr(model_fit, "param_names", [f"param_{i}" for i in range(len(model_fit.params))])
        param_estimates = {str(k): round(float(v), 5) for k, v in zip(p_names, model_fit.params)}
        ic_dict = {
            "aic": float(model_fit.aic),
            "bic": float(model_fit.bic),
            "log_likelihood": float(model_fit.llf)
        }
    else:
        raise ValueError(f"Unknown or unsupported model type '{model_type}'.")

    # In-sample metrics calculation
    metrics = compute_metrics(y, fitted, naive_series=y)
    metrics.update(ic_dict)
    
    # Diagnostics calculation
    diagnostics = compute_residual_diagnostics(residuals, model_df=model_df_val)
    
    # Add generated Python reproducibility code snippet
    python_code = generate_python_reproducibility_code(model_type, parameters, forecast_horizon)

    analysis_id = str(uuid.uuid4())[:8]
    result = {
        "analysis_id": analysis_id,
        "dataset_id": dataset_id,
        "target_column": target_column,
        "model": model_type,
        "parameters": parameters,
        "timestamps": timestamps,
        "actual": [float(val) for val in y],
        "fitted": [float(val) if not np.isnan(val) else None for val in fitted],
        "residuals": [float(val) if not np.isnan(val) else None for val in residuals],
        "forecast_timestamps": forecast_timestamps,
        "forecast": [float(val) if not np.isnan(val) else None for val in forecast],
        "lower_interval": [float(val) if not np.isnan(val) else None for val in lower_ci],
        "upper_interval": [float(val) if not np.isnan(val) else None for val in upper_ci],
        "metrics": metrics,
        "param_estimates": param_estimates,
        "diagnostics": diagnostics,
        "warnings": warnings,
        "python_code": python_code
    }
    
    ANALYSES_STORE[analysis_id] = result
    return clean_for_json(result)

def search_optimal_arima(
    dataset_id: str,
    target_column: str,
    max_p: int = 3,
    max_d: int = 2,
    max_q: int = 3,
    seasonal: bool = False,
    s: int = 12
) -> Dict[str, Any]:
    """
    Automated grid search minimizing Akaike Information Criterion (AIC).
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
    s_series = pd.to_numeric(ds["df"][target_column], errors='coerce').dropna().values
    
    best_aic = float("inf")
    best_order = (1, 1, 1)
    best_seasonal_order = None
    results_table = []

    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                if p == 0 and d == 0 and q == 0:
                    continue
                try:
                    fit = ARIMA(s_series, order=(p, d, q)).fit()
                    aic_val = float(fit.aic)
                    bic_val = float(fit.bic)
                    results_table.append({"p": p, "d": d, "q": q, "aic": round(aic_val, 2), "bic": round(bic_val, 2)})
                    if aic_val < best_aic:
                        best_aic = aic_val
                        best_order = (p, d, q)
                except Exception:
                    continue

    sorted_results = sorted(results_table, key=lambda x: x["aic"])[:8]
    return clean_for_json({
        "dataset_id": dataset_id,
        "best_p": best_order[0],
        "best_d": best_order[1],
        "best_q": best_order[2],
        "best_aic": round(best_aic, 2),
        "top_candidates": sorted_results
    })

def generate_python_reproducibility_code(model_type: str, parameters: Dict[str, Any], horizon: int) -> str:
    if model_type in ["arma", "arima", "ar", "ma"]:
        p = parameters.get("p", 1)
        d = parameters.get("d", 0)
        q = parameters.get("q", 0)
        return f"""# ATSA Reproducibility Script for {model_type.upper()}
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

# Load data and prepare series
df = pd.read_csv("your_timeseries.csv")
y = df["target_column"].dropna().values

# Fit {model_type.upper()}({p}, {d}, {q})
model = ARIMA(y, order=({p}, {d}, {q}))
results = model.fit()

# Forecast {horizon} steps ahead
forecast_res = results.get_forecast(steps={horizon})
forecast = forecast_res.predicted_mean
conf_int = forecast_res.conf_int(alpha=0.05)

print(results.summary())
"""
    elif model_type == "sarima":
        return f"""# ATSA Reproducibility Script for SARIMA
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

df = pd.read_csv("your_timeseries.csv")
y = df["target_column"].dropna().values

# Fit Seasonal ARIMA
model = SARIMAX(y, order=({parameters.get('p',1)}, {parameters.get('d',0)}, {parameters.get('q',1)}),
                seasonal_order=({parameters.get('P',1)}, {parameters.get('D',0)}, {parameters.get('Q',1)}, {parameters.get('s',12)}))
results = model.fit()
forecast = results.get_forecast(steps={horizon}).predicted_mean
print(results.summary())
"""
    elif model_type == "holt_winters":
        return f"""# ATSA Reproducibility Script for Holt-Winters
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

df = pd.read_csv("your_timeseries.csv")
y = df["target_column"].dropna().values

model = ExponentialSmoothing(y, trend='{parameters.get("trend","add")}', seasonal='{parameters.get("seasonal","add")}', seasonal_periods={parameters.get("period",12)})
results = model.fit()
forecast = results.forecast({horizon})
print(results.summary())
"""
    return """# ATSA Model Script
import pandas as pd
df = pd.read_csv("your_timeseries.csv")
print("Model fitted successfully.")
"""

def get_analysis_result(analysis_id: str) -> Optional[Dict[str, Any]]:
    return ANALYSES_STORE.get(analysis_id)
