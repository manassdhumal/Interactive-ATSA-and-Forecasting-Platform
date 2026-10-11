import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.services.dataset_service import get_dataset, register_dataset

def preprocess_dataset(
    dataset_id: str,
    target_col: str,
    time_col: str,
    action: str,
    params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Applies real preprocessing transformations:
    - 'drop_na': drops missing values in target
    - 'ffill': forward fill
    - 'bfill': backward fill
    - 'interpolate': linear interpolation
    - 'log': log transformation (requires positive values)
    - 'diff': first differencing (order d)
    - 'seasonal_diff': seasonal differencing with period s
    - 'resample': frequency resample with aggregation ('mean', 'sum', 'min', 'max')
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")
        
    df = ds["df"].copy()
    initial_rows = len(df)
    target_series = df[target_col].copy()
    
    transformed_note = ""
    
    if action == "drop_na":
        df = df.dropna(subset=[target_col]).reset_index(drop=True)
        transformed_note = f"Dropped {initial_rows - len(df)} missing observations."
        
    elif action == "ffill":
        missing_cnt = df[target_col].isna().sum()
        df[target_col] = df[target_col].ffill()
        transformed_note = f"Forward-filled {missing_cnt} missing observation(s)."
        
    elif action == "bfill":
        missing_cnt = df[target_col].isna().sum()
        df[target_col] = df[target_col].bfill()
        transformed_note = f"Backward-filled {missing_cnt} missing observation(s)."
        
    elif action == "interpolate":
        missing_cnt = df[target_col].isna().sum()
        df[target_col] = df[target_col].interpolate(method="linear")
        transformed_note = f"Linearly interpolated {missing_cnt} missing observation(s)."
        
    elif action == "log":
        if (df[target_col] <= 0).any():
            raise ValueError("Log transformation requires all values to be strictly positive (> 0).")
        df[f"{target_col}_log"] = np.log(df[target_col])
        target_col = f"{target_col}_log"
        transformed_note = f"Created log-transformed target: {target_col}."
        
    elif action == "diff":
        order = int(params.get("order", 1))
        diff_name = f"{target_col}_diff{order}"
        df[diff_name] = df[target_col].diff(order)
        df = df.dropna(subset=[diff_name]).reset_index(drop=True)
        target_col = diff_name
        transformed_note = f"Applied order-{order} differencing. Target is now {target_col} ({initial_rows - len(df)} rows dropped)."
        
    elif action == "seasonal_diff":
        period = int(params.get("period", 12))
        sdiff_name = f"{target_col}_sdiff{period}"
        df[sdiff_name] = df[target_col].diff(period)
        df = df.dropna(subset=[sdiff_name]).reset_index(drop=True)
        target_col = sdiff_name
        transformed_note = f"Applied seasonal differencing (period={period}). Target is now {target_col} ({initial_rows - len(df)} rows dropped)."
        
    elif action == "resample":
        freq = params.get("freq", "D")
        agg = params.get("agg", "mean")
        df[time_col] = pd.to_datetime(df[time_col])
        df = df.set_index(time_col)
        if agg == "mean":
            df = df.resample(freq).mean()
        elif agg == "sum":
            df = df.resample(freq).sum()
        elif agg == "min":
            df = df.resample(freq).min()
        elif agg == "max":
            df = df.resample(freq).max()
        df = df.reset_index()
        transformed_note = f"Resampled series to frequency '{freq}' using '{agg}' aggregation."
        
    else:
        raise ValueError(f"Unsupported preprocessing action: '{action}'.")
        
    # Create or update transformed dataset
    new_id = f"{dataset_id}-processed"
    new_meta = register_dataset(
        new_id,
        f"{ds['metadata']['name']} (Preprocessed)",
        df,
        time_col,
        target_col,
        transformed_note
    )
    return {
        "dataset": new_meta,
        "action": action,
        "note": transformed_note,
        "rows_before": initial_rows,
        "rows_after": len(df)
    }
