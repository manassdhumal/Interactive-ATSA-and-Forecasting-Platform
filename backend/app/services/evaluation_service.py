import numpy as np
from typing import Dict, Optional

def compute_metrics(actual: np.ndarray, predicted: np.ndarray, naive_series: Optional[np.ndarray] = None) -> Dict[str, Optional[float]]:
    """
    Computes standard forecasting error metrics:
    MAE, MSE, RMSE, MAPE, sMAPE, MASE (if naive series provided).
    Explicitly handles zero denominators, NaNs, and infinite values.
    """
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    
    # Filter valid pairs
    mask = ~np.isnan(actual) & ~np.isnan(predicted) & ~np.isinf(actual) & ~np.isinf(predicted)
    y_true = actual[mask]
    y_pred = predicted[mask]
    
    if len(y_true) == 0:
        return {
            "mae": None,
            "mse": None,
            "rmse": None,
            "mape": None,
            "smape": None,
            "mase": None,
            "n_obs": 0
        }
        
    errors = y_true - y_pred
    mae = float(np.mean(np.abs(errors)))
    mse = float(np.mean(errors ** 2))
    rmse = float(np.sqrt(mse))
    
    # MAPE: avoid div by zero
    non_zero = y_true != 0
    if np.any(non_zero):
        mape = float(np.mean(np.abs(errors[non_zero] / y_true[non_zero])) * 100.0)
    else:
        mape = None
        
    # sMAPE: 200 * |y - yhat| / (|y| + |yhat|)
    denom = np.abs(y_true) + np.abs(y_pred)
    valid_denom = denom > 1e-9
    if np.any(valid_denom):
        smape = float(np.mean(200.0 * np.abs(errors[valid_denom]) / denom[valid_denom]))
    else:
        smape = None
        
    # MASE: relative to naive 1-step forecast of historical in-sample
    mase = None
    if naive_series is not None and len(naive_series) > 1:
        naive_diff = np.abs(np.diff(naive_series))
        scale = np.mean(naive_diff)
        if scale > 1e-9:
            mase = float(mae / scale)
            
    return {
        "mae": round(mae, 4) if mae is not None else None,
        "mse": round(mse, 4) if mse is not None else None,
        "rmse": round(rmse, 4) if rmse is not None else None,
        "mape": round(mape, 2) if mape is not None else None,
        "smape": round(smape, 2) if smape is not None else None,
        "mase": round(mase, 4) if mase is not None else None,
        "n_obs": len(y_true)
    }
