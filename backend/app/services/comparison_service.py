import numpy as np
import pandas as pd
from typing import Dict, Any, List
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, Holt, ExponentialSmoothing
from app.services.dataset_service import get_dataset
from app.services.evaluation_service import compute_metrics
from app.utils.serialization import clean_for_json

def compare_models(
    dataset_id: str,
    target_column: str,
    model_keys: List[str],
    test_size: int = 14,
    seasonal_period: int = 12
) -> Dict[str, Any]:
    """
    Performs out-of-sample chronological evaluation across selected models:
    Splits data chronologically: train = y[:-test_size], test = y[-test_size:]
    Fits each model on train, forecasts test_size steps, and evaluates on true test set.
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
        
    df = ds["df"].copy()
    time_col = ds["metadata"]["time_col"]
    s = pd.to_numeric(df[target_column], errors='coerce').dropna()
    y = s.values
    timestamps = [str(t) for t in df.loc[s.index, time_col].values]
    
    n = len(y)
    if n < test_size + 15:
        raise ValueError(f"Series too short for test size of {test_size}. Need at least {test_size + 15} observations.")
        
    y_train = y[:-test_size]
    y_test = y[-test_size:]
    test_timestamps = timestamps[-test_size:]
    
    results = []
    predictions_map = {}
    failed_models = []
    
    for key in model_keys:
        try:
            preds = None
            if key == "naive":
                preds = np.full(test_size, y_train[-1])
            elif key == "linear_trend":
                from scipy import stats
                slope, intercept, _, _, _ = stats.linregress(np.arange(len(y_train)), y_train)
                preds = slope * np.arange(len(y_train), len(y_train) + test_size) + intercept
            elif key == "ses":
                fit_m = SimpleExpSmoothing(y_train).fit()
                preds = fit_m.forecast(test_size)
            elif key == "holt":
                fit_m = Holt(y_train).fit()
                preds = fit_m.forecast(test_size)
            elif key == "holt_winters":
                p_val = seasonal_period if len(y_train) >= 2 * seasonal_period else 7
                fit_m = ExponentialSmoothing(y_train, trend="add", seasonal="add", seasonal_periods=p_val).fit()
                preds = fit_m.forecast(test_size)
            elif key == "ar":
                fit_m = ARIMA(y_train, order=(1, 0, 0), trend="c").fit()
                preds = fit_m.forecast(steps=test_size)
            elif key == "ma":
                fit_m = ARIMA(y_train, order=(0, 0, 1), trend="c").fit()
                preds = fit_m.forecast(steps=test_size)
            elif key == "arma":
                fit_m = ARIMA(y_train, order=(1, 0, 1), trend="c").fit()
                preds = fit_m.forecast(steps=test_size)
            elif key == "arima":
                fit_m = ARIMA(y_train, order=(1, 1, 1)).fit()
                preds = fit_m.forecast(steps=test_size)
            elif key == "sarima":
                p_val = seasonal_period if len(y_train) >= 2 * seasonal_period else 7
                fit_m = SARIMAX(y_train, order=(1, 1, 1), seasonal_order=(1, 0, 0, p_val), enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
                preds = fit_m.forecast(steps=test_size)
            else:
                continue
                
            metrics = compute_metrics(y_test, preds, naive_series=y_train)
            predictions_map[key] = [float(p) for p in preds]
            
            results.append({
                "model": key,
                "label": key.upper(),
                "mae": metrics["mae"],
                "rmse": metrics["rmse"],
                "mape": metrics["mape"],
                "smape": metrics["smape"],
                "mase": metrics["mase"]
            })
        except Exception as e:
            failed_models.append({"model": key, "error": str(e)})

    # Sort results by RMSE ascending
    sorted_results = sorted(results, key=lambda x: (x["rmse"] is None, x["rmse"] if x["rmse"] is not None else 999999))
    best_model = sorted_results[0]["model"] if sorted_results else None
    
    return clean_for_json({
        "dataset_id": dataset_id,
        "test_size": test_size,
        "test_timestamps": test_timestamps,
        "actual_test": [float(val) for val in y_test],
        "predictions": predictions_map,
        "comparison_table": sorted_results,
        "best_model": best_model,
        "failed_models": failed_models
    })
