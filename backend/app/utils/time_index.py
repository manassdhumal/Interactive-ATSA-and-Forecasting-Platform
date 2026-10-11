import re
import numpy as np
import pandas as pd
from typing import Optional, Tuple

def infer_and_regularize_time_index(df: pd.DataFrame, time_col: str) -> Tuple[pd.DataFrame, Optional[str], list[str]]:
    """
    Parses timestamps, sorts chronologically, checks monotonicity and duplicates,
    and infers the frequency if possible.
    Returns: (cleaned_df, inferred_freq_str, list_of_warning_messages)
    """
    warnings = []
    df = df.copy()
    
    # Try parsing dates
    try:
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
    except Exception as e:
        warnings.append(f"Failed to convert {time_col} to datetime: {str(e)}")
        return df, None, warnings
        
    # Drop rows with unparseable timestamps
    initial_len = len(df)
    df = df.dropna(subset=[time_col])
    dropped_null_dates = initial_len - len(df)
    if dropped_null_dates > 0:
        warnings.append(f"Dropped {dropped_null_dates} rows with unparseable dates.")
        
    # Sort chronologically
    df = df.sort_values(by=time_col).reset_index(drop=True)
    
    # Check for duplicates
    dup_count = df.duplicated(subset=[time_col]).sum()
    if dup_count > 0:
        warnings.append(f"Detected {dup_count} duplicate timestamp(s). Aggregating duplicates by mean.")
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        df = df.groupby(time_col)[numeric_cols].mean().reset_index()
        
    # Infer frequency
    inferred_freq = None
    if len(df) >= 3:
        try:
            inferred_freq = pd.infer_freq(df[time_col])
        except Exception:
            inferred_freq = None
            
    return df, inferred_freq, warnings
