from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PreprocessRequest(BaseModel):
    target_col: str
    time_col: str
    action: str
    params: Dict[str, Any] = {}

class ExplorationPlotRequest(BaseModel):
    dataset_id: str
    target_col: str
    window: int = 7

class DecompositionRequest(BaseModel):
    dataset_id: str
    target_col: str
    model_type: str = "additive"
    period: Optional[int] = None

class LagAnalysisRequest(BaseModel):
    dataset_id: str
    target_col: str
    lags: List[int] = [1, 2, 7, 14]

class ADFRequest(BaseModel):
    dataset_id: str
    target_col: str
    regression: str = "c"

class ACFPACFRequest(BaseModel):
    dataset_id: str
    target_col: str
    nlags: int = 30

class ModelFitRequest(BaseModel):
    dataset_id: str
    target_column: str
    model: str
    parameters: Dict[str, Any] = {}
    forecast_horizon: int = 12
    confidence_level: float = 0.95

class ModelComparisonRequest(BaseModel):
    dataset_id: str
    target_column: str
    model_keys: List[str]
    test_size: int = 14
    seasonal_period: int = 12
