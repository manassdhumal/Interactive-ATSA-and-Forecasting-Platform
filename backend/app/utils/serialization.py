import math
import numpy as np
import pandas as pd
from typing import Any, List, Dict, Union

def clean_for_json(obj: Any) -> Any:
    """
    Recursively converts float NaN, Inf, -Inf, numpy numbers, and timestamps to JSON-serializable types.
    """
    if obj is None:
        return None
    if isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or np.isnan(obj):
            return None
        if math.isinf(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, np.ndarray, pd.Series, pd.Index)):
        return [clean_for_json(v) for v in obj]
    return obj
