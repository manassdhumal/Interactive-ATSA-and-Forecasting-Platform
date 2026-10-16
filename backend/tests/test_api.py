import pytest
import numpy as np
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

def test_model_fitting_auto():
    response = client.post("/api/models/fit", json={
        "dataset_id": "sample-seasonal-monthly",
        "target_column": "sales",
        "model": "auto",
        "parameters": {},
        "forecast_horizon": 12
    })
    assert response.status_code == 200
    res = response.json()
    assert res["model"] == "auto"
    assert len(res["forecast"]) == 12
    # Ensure forecast is not a flat straight line
    forecast = res["forecast"]
    assert np.std(forecast) > 0.5
    assert "chosen_model" in res["param_estimates"]

def test_seasonal_auto_arima():
    response = client.get("/api/models/auto-arima/sample-seasonal-monthly/sales?seasonal=true&s=12")
    assert response.status_code == 200
    res = response.json()
    assert "best_p" in res
    assert "best_d" in res
    assert "best_q" in res
    assert res.get("is_seasonal") is True
    assert len(res["top_candidates"]) > 0

def test_executive_report():
    response = client.get("/api/reports/executive/sample-seasonal-monthly/sales?horizon=12")
    assert response.status_code == 200
    res = response.json()
    assert "executive_summary" in res
    assert "descriptive_statistics" in res
    assert "hypothesis_tests" in res
    assert "model_tournament" in res
    assert "forecast_table" in res
    assert len(res["forecast_table"]) == 12

    # Test HTML report endpoint
    html_res = client.get("/api/reports/executive/sample-seasonal-monthly/sales/html?horizon=12")
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers["content-type"]
    assert "ATSA Executive Report" in html_res.text

def test_delete_dataset():
    # Test deleting a dataset
    del_res = client.delete("/api/datasets/sample-daily-demand")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Verify it is no longer listed
    list_res = client.get("/api/datasets")
    assert "sample-daily-demand" not in [d["id"] for d in list_res.json()]

    # Test deleting nonexistent returns 404
    del_again = client.delete("/api/datasets/sample-daily-demand")
    assert del_again.status_code == 404
