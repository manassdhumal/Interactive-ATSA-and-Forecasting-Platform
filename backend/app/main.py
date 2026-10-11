from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import io
import pandas as pd
from app.config import settings
from app.schemas.schemas import (
    PreprocessRequest, ExplorationPlotRequest, DecompositionRequest,
    LagAnalysisRequest, ADFRequest, ACFPACFRequest, ModelFitRequest,
    ModelComparisonRequest
)
from app.services.dataset_service import (
    get_all_datasets, get_dataset, upload_dataset
)
from app.services.preprocessing_service import preprocess_dataset
from app.services.suggestion_service import analyze_and_suggest_transformations
from app.services.exploration_service import (
    get_descriptive_statistics, get_rolling_and_trend, compute_decomposition, compute_lags
)
from app.services.diagnostic_service import compute_adf_test, compute_acf_pacf
from app.services.model_service import fit_time_series_model, get_analysis_result
from app.services.comparison_service import compare_models

app = FastAPI(
    title=settings.APP_NAME,
    description="Interactive Advanced Time Series Analysis and Forecasting API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Chronos ATSA Engine",
        "version": "1.0.0"
    }

# Dataset Endpoints
@app.get("/api/datasets")
def list_datasets():
    return get_all_datasets()

@app.get("/api/datasets/{dataset_id}")
def dataset_details(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds["metadata"]

@app.get("/api/datasets/{dataset_id}/preview")
def dataset_preview(dataset_id: str, limit: int = 50):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    preview_df = ds["df"].head(limit)
    return {
        "columns": list(preview_df.columns),
        "rows": preview_df.astype(str).to_dict(orient="records"),
        "total_rows": len(ds["df"])
    }

@app.post("/api/datasets/upload")
async def upload_dataset_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        meta = upload_dataset(file.filename, content)
        return meta
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/datasets/{dataset_id}/preprocess")
def preprocess_endpoint(dataset_id: str, req: PreprocessRequest):
    try:
        res = preprocess_dataset(dataset_id, req.target_col, req.time_col, req.action, req.params)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/datasets/{dataset_id}/suggestions/{target_col}")
def suggestions_endpoint(dataset_id: str, target_col: str):
    try:
        return analyze_and_suggest_transformations(dataset_id, target_col)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/datasets/{dataset_id}/download")
def download_dataset_csv(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    csv_bytes = ds["df"].to_csv(index=False).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dataset_id}.csv"}
    )

# Exploration Endpoints
@app.get("/api/exploration/statistics/{dataset_id}/{target_col}")
def descriptive_stats_endpoint(dataset_id: str, target_col: str):
    try:
        return get_descriptive_statistics(dataset_id, target_col)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/exploration/plot")
def exploration_plot_endpoint(req: ExplorationPlotRequest):
    try:
        return get_rolling_and_trend(req.dataset_id, req.target_col, req.window)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/exploration/decomposition")
def decomposition_endpoint(req: DecompositionRequest):
    try:
        return compute_decomposition(req.dataset_id, req.target_col, req.model_type, req.period)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/exploration/lags")
def lag_analysis_endpoint(req: LagAnalysisRequest):
    try:
        return compute_lags(req.dataset_id, req.target_col, req.lags)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Diagnostics Endpoints
@app.post("/api/diagnostics/adf")
def adf_endpoint(req: ADFRequest):
    try:
        return compute_adf_test(req.dataset_id, req.target_col, req.regression)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/diagnostics/acf_pacf")
def acf_pacf_endpoint(req: ACFPACFRequest):
    try:
        return compute_acf_pacf(req.dataset_id, req.target_col, req.nlags)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Modeling Endpoints
@app.post("/api/models/fit")
def fit_model_endpoint(req: ModelFitRequest):
    try:
        return fit_time_series_model(
            dataset_id=req.dataset_id,
            target_column=req.target_column,
            model_type=req.model,
            parameters=req.parameters,
            forecast_horizon=req.forecast_horizon,
            confidence_level=req.confidence_level
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analyses/{analysis_id}")
def get_analysis_endpoint(analysis_id: str):
    res = get_analysis_result(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis session not found")
    return res

@app.get("/api/analyses/{analysis_id}/forecast.csv")
def download_forecast_csv(analysis_id: str):
    res = get_analysis_result(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis session not found")
    df = pd.DataFrame({
        "timestamp": res["forecast_timestamps"],
        "forecast": res["forecast"],
        "lower_ci": res["lower_interval"],
        "upper_ci": res["upper_interval"]
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=forecast_{analysis_id}.csv"}
    )

# Model Comparison Endpoint
@app.post("/api/models/compare")
def compare_models_endpoint(req: ModelComparisonRequest):
    try:
        return compare_models(
            dataset_id=req.dataset_id,
            target_column=req.target_column,
            model_keys=req.model_keys,
            test_size=req.test_size,
            seasonal_period=req.seasonal_period
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
