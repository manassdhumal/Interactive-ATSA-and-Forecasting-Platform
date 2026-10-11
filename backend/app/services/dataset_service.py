import uuid
import io
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from app.utils.time_index import infer_and_regularize_time_index

# In-memory storage for datasets and sessions
DATASETS_STORE: Dict[str, Dict[str, Any]] = {}

def generate_synthetic_datasets():
    """Generates standard ATSA reproducible synthetic datasets with fixed seeds."""
    np.random.seed(42)
    
    # 1. Stationary AR(1) process: X_t = 0.7 * X_{t-1} + e_t
    n = 150
    dates = pd.date_range(start="2024-01-01", periods=n, freq="D")
    e = np.random.normal(0, 1, n)
    ar1 = np.zeros(n)
    for t in range(1, n):
        ar1[t] = 0.7 * ar1[t-1] + e[t]
    df_ar1 = pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "value": ar1.round(4)})
    register_dataset("sample-stationary-ar", "Synthetic Stationary AR(1) Series", df_ar1, "date", "value", "Stationary autoregressive series with phi=0.7 (seed=42)")

    # 2. Stationary ARMA(1, 1) process: X_t = 0.6 * X_{t-1} + e_t - 0.4 * e_{t-1}
    arma = np.zeros(n)
    for t in range(1, n):
        arma[t] = 0.6 * arma[t-1] + e[t] - 0.4 * e[t-1]
    df_arma = pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "value": arma.round(4)})
    register_dataset("sample-stationary-arma", "Synthetic Stationary ARMA(1, 1) Series", df_arma, "date", "value", "Stationary ARMA(1,1) with phi=0.6, theta=-0.4")

    # 3. Non-Stationary Linear Trend Series: Y_t = 25 + 0.35 * t + noise
    t_vals = np.arange(n)
    trend_vals = 25.0 + 0.35 * t_vals + np.random.normal(0, 2.5, n)
    df_trend = pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "value": trend_vals.round(4)})
    register_dataset("sample-trend-series", "Synthetic Non-Stationary Trend Series", df_trend, "date", "value", "Linear upward trend series with Gaussian noise")

    # 4. Seasonal Monthly Sales (s=12, 10 years = 120 months)
    n_m = 120
    dates_m = pd.date_range(start="2015-01-01", periods=n_m, freq="MS")
    t_m = np.arange(n_m)
    seasonality = 15.0 * np.sin(2 * np.pi * t_m / 12) + 8.0 * np.cos(2 * np.pi * t_m / 12)
    sales = 100.0 + 0.8 * t_m + seasonality + np.random.normal(0, 3.0, n_m)
    df_sales = pd.DataFrame({"date": dates_m.strftime("%Y-%m-%d"), "sales": sales.round(4)})
    register_dataset("sample-seasonal-monthly", "Synthetic Seasonal Monthly Sales (Period=12)", df_sales, "date", "sales", "Monthly series with deterministic annual seasonality and linear trend")

    # 5. Seasonal Trend Demand (Period=7, Daily, 200 days)
    n_d = 200
    dates_d = pd.date_range(start="2024-01-01", periods=n_d, freq="D")
    t_d = np.arange(n_d)
    weekly_season = 12.0 * np.sin(2 * np.pi * t_d / 7)
    demand = 50.0 + 0.15 * t_d + weekly_season + np.random.normal(0, 2.0, n_d)
    df_demand = pd.DataFrame({"date": dates_d.strftime("%Y-%m-%d"), "demand": demand.round(4)})
    register_dataset("sample-daily-demand", "Synthetic Daily Demand (Period=7)", df_demand, "date", "demand", "Daily demand series with strong 7-day cyclical pattern")

def register_dataset(dataset_id: str, name: str, df: pd.DataFrame, time_col: str, target_col: str, description: str = "") -> Dict[str, Any]:
    cleaned_df, freq, warnings = infer_and_regularize_time_index(df, time_col)
    
    numeric_cols = cleaned_df.select_dtypes(include=[np.number]).columns.tolist()
    if target_col not in numeric_cols and target_col in cleaned_df.columns:
        cleaned_df[target_col] = pd.to_numeric(cleaned_df[target_col], errors='coerce')
        numeric_cols = cleaned_df.select_dtypes(include=[np.number]).columns.tolist()

    metadata = {
        "id": dataset_id,
        "name": name,
        "description": description,
        "time_col": time_col,
        "target_col": target_col,
        "numeric_cols": numeric_cols,
        "all_cols": list(cleaned_df.columns),
        "inferred_freq": freq,
        "total_rows": len(cleaned_df),
        "date_range": [str(cleaned_df[time_col].min()), str(cleaned_df[time_col].max())] if len(cleaned_df) > 0 else [],
        "warnings": warnings,
        "is_sample": dataset_id.startswith("sample-")
    }
    
    DATASETS_STORE[dataset_id] = {
        "metadata": metadata,
        "original_df": df.copy(),
        "df": cleaned_df
    }
    return metadata

def get_all_datasets() -> List[Dict[str, Any]]:
    return [d["metadata"] for d in DATASETS_STORE.values()]

def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
    return DATASETS_STORE.get(dataset_id)

def delete_dataset(dataset_id: str) -> bool:
    if dataset_id in DATASETS_STORE:
        del DATASETS_STORE[dataset_id]
        return True
    return False

def upload_dataset(filename: str, content: bytes) -> Dict[str, Any]:
    dataset_id = str(uuid.uuid4())[:8]
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise ValueError("Unsupported format. Please upload CSV or Excel files (.xlsx, .xls).")
        
    if df.empty:
        raise ValueError("The uploaded file is empty.")
        
    # Detect timestamp column
    candidate_time_cols = [c for c in df.columns if any(k in str(c).lower() for k in ["date", "time", "timestamp", "year", "month", "day", "dt"])]
    time_col = candidate_time_cols[0] if candidate_time_cols else df.columns[0]
    
    # Detect numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    # If no numeric column, try converting other columns
    if not numeric_cols:
        for col in df.columns:
            if col != time_col:
                converted = pd.to_numeric(df[col], errors='coerce')
                if converted.notnull().sum() > 0:
                    df[col] = converted
                    numeric_cols.append(col)
                    
    target_col = numeric_cols[0] if numeric_cols else df.columns[1] if len(df.columns) > 1 else df.columns[0]
    
    return register_dataset(dataset_id, filename, df, time_col, target_col, f"Uploaded dataset: {filename}")

def fetch_public_ticker_data(ticker: str, period: str = "1y", interval: str = "1d") -> Dict[str, Any]:
    import yfinance as yf
    tk = yf.Ticker(ticker.strip().upper())
    hist = tk.history(period=period, interval=interval)
    if hist.empty:
        raise ValueError(f"No market data found for ticker '{ticker}' over period '{period}'.")
        
    hist = hist.reset_index()
    time_col = "Date" if "Date" in hist.columns else "Datetime" if "Datetime" in hist.columns else hist.columns[0]
    hist[time_col] = pd.to_datetime(hist[time_col]).dt.strftime("%Y-%m-%d")
    
    target_col = "Close"
    dataset_id = f"market-{ticker.lower()}-{period}"
    name = f"{ticker.upper()} Market History ({period})"
    desc = f"Direct Yahoo Finance market feed for {ticker.upper()} ({period}, interval: {interval})"
    
    return register_dataset(dataset_id, name, hist, time_col, target_col, desc)

# Initialize synthetic datasets on module load
generate_synthetic_datasets()
