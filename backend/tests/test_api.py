import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_datasets():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    ids = [d["id"] for d in data]
    assert "sample-stationary-ar" in ids
    assert "sample-stationary-arma" in ids

def test_descriptive_stats():
    response = client.get("/api/exploration/statistics/sample-stationary-ar/value")
    assert response.status_code == 200
    res = response.json()
    assert "mean" in res
    assert "std" in res
    assert res["count"] > 100

def test_adf_test():
    response = client.post("/api/diagnostics/adf", json={
        "dataset_id": "sample-stationary-ar",
        "target_col": "value",
        "regression": "c"
    })
    assert response.status_code == 200
    res = response.json()
    assert "test_statistic" in res
    assert "p_value" in res
    assert res["is_stationary"] is True

def test_acf_pacf():
    response = client.post("/api/diagnostics/acf_pacf", json={
        "dataset_id": "sample-stationary-ar",
        "target_col": "value",
        "nlags": 20
    })
    assert response.status_code == 200
    res = response.json()
    assert len(res["acf"]) > 5
    assert len(res["pacf"]) > 5

def test_decomposition():
    response = client.post("/api/exploration/decomposition", json={
        "dataset_id": "sample-seasonal-monthly",
        "target_col": "sales",
        "model_type": "additive",
        "period": 12
    })
    assert response.status_code == 200
    res = response.json()
    assert len(res["trend"]) > 50
    assert len(res["seasonal"]) > 50

def test_model_fitting_arma():
    response = client.post("/api/models/fit", json={
        "dataset_id": "sample-stationary-arma",
        "target_column": "value",
        "model": "arma",
        "parameters": {"p": 1, "q": 1},
        "forecast_horizon": 10
    })
    assert response.status_code == 200
    res = response.json()
    assert res["model"] == "arma"
    assert len(res["forecast"]) == 10
    assert "mae" in res["metrics"]
    assert "ljung_box" in res["diagnostics"]

def test_model_fitting_arima():
    response = client.post("/api/models/fit", json={
        "dataset_id": "sample-trend-series",
        "target_column": "value",
        "model": "arima",
        "parameters": {"p": 1, "d": 1, "q": 1},
        "forecast_horizon": 8
    })
    assert response.status_code == 200
    res = response.json()
    assert len(res["forecast"]) == 8

def test_model_fitting_holt_winters():
    response = client.post("/api/models/fit", json={
        "dataset_id": "sample-seasonal-monthly",
        "target_column": "sales",
        "model": "holt_winters",
        "parameters": {"trend": "add", "seasonal": "add", "period": 12},
        "forecast_horizon": 12
    })
    assert response.status_code == 200
    res = response.json()
    assert len(res["forecast"]) == 12

def test_model_comparison():
    response = client.post("/api/models/compare", json={
        "dataset_id": "sample-stationary-ar",
        "target_column": "value",
        "model_keys": ["naive", "linear_trend", "ses", "ar", "arma"],
        "test_size": 15
    })
    assert response.status_code == 200
    res = response.json()
    assert "comparison_table" in res
    assert len(res["comparison_table"]) >= 3
    assert res["best_model"] is not None
