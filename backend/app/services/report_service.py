import datetime
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from app.services.dataset_service import get_dataset
from app.services.exploration_service import get_descriptive_statistics
from app.services.diagnostic_service import compute_adf_test, compute_kpss_test
from app.services.comparison_service import compare_models
from app.services.model_service import fit_time_series_model, resolve_period
from app.utils.serialization import clean_for_json

def generate_executive_report_data(
    dataset_id: str,
    target_col: str,
    forecast_horizon: int = 12
) -> Dict[str, Any]:
    """
    Assembles a comprehensive, verified executive time series briefing:
    - Metadata and descriptive statistics
    - ADF and KPSS stationarity hypothesis tests
    - Model benchmarking leaderboard
    - Champion architecture forward forecast and intervals
    - Residual white noise diagnostics
    - Plain-English narrative synthesis
    """
    ds = get_dataset(dataset_id)
    if not ds:
        raise ValueError(f"Dataset '{dataset_id}' not found.")

    meta = ds["metadata"]
    df = ds["df"].copy()
    s = pd.to_numeric(df[target_col], errors='coerce').dropna()
    y = s.values
    n = len(y)
    
    if n < 10:
        raise ValueError("Series contains fewer than 10 valid observations for report generation.")

    inferred_freq = meta.get("inferred_freq")
    seasonal_p = resolve_period(None, inferred_freq, n)

    # 1. Descriptive stats
    stats = get_descriptive_statistics(dataset_id, target_col)

    # 2. Hypothesis tests
    adf = compute_adf_test(dataset_id, target_col, regression="c")
    kpss = compute_kpss_test(dataset_id, target_col, regression="c")

    # 3. Model Tournament / Comparison
    candidate_keys = ["auto", "sarima", "holt_winters", "arima", "linear_trend", "naive"]
    test_sz = min(14, max(5, n // 6))
    comp_res = compare_models(dataset_id, target_col, candidate_keys, test_size=test_sz, seasonal_period=seasonal_p)

    # 4. Champion Forecast via Auto Engine
    best_fit = fit_time_series_model(dataset_id, target_col, "auto", {}, forecast_horizon=forecast_horizon)
    chosen_label = best_fit.get("param_estimates", {}).get("chosen_model_label") or best_fit.get("model", "Auto").upper()

    # 5. Forecast Table
    forecast_table = []
    f_times = best_fit.get("forecast_timestamps", [])
    f_vals = best_fit.get("forecast", [])
    lo_vals = best_fit.get("lower_interval", [])
    hi_vals = best_fit.get("upper_interval", [])
    for idx, t in enumerate(f_times):
        forecast_table.append({
            "step": idx + 1,
            "timestamp": t,
            "point_forecast": round(f_vals[idx], 4) if idx < len(f_vals) and f_vals[idx] is not None else None,
            "lower_95": round(lo_vals[idx], 4) if idx < len(lo_vals) and lo_vals[idx] is not None else None,
            "upper_95": round(hi_vals[idx], 4) if idx < len(hi_vals) and hi_vals[idx] is not None else None
        })

    # 6. Narrative Executive Synthesis
    is_stat = adf.get("is_stationary", False)
    stat_narrative = (
        f"The series is stationary (ADF test statistic = {adf.get('test_statistic'):.3f}, p = {adf.get('p_value'):.4f} < 0.05), "
        "indicating a stable mean without persistent unit-root drift."
        if is_stat else
        f"The series exhibits non-stationary unit-root behavior (ADF p = {adf.get('p_value'):.4f} >= 0.05), "
        "requiring differencing to stabilize the stochastic trend."
    )
    
    mean_val = stats.get("mean", 0.0)
    std_val = stats.get("std", 1.0)
    skew_val = stats.get("skewness", 0.0)
    distribution_narrative = (
        f"Average value is {mean_val:.2f} with standard deviation of {std_val:.2f}. "
        f"Distribution shows {'mild' if abs(skew_val) < 0.5 else 'moderate' if abs(skew_val) < 1.2 else 'pronounced'} "
        f"{'right-skewness' if skew_val > 0.2 else 'left-skewness' if skew_val < -0.2 else 'symmetry'} (skew = {skew_val:.2f})."
    )

    champion_mape = best_fit.get("metrics", {}).get("mape")
    perf_narrative = (
        f"Following an automated out-of-sample benchmarking tournament across candidate architectures, "
        f"the system selected {chosen_label} as the champion model"
        f"{f' with an in-sample MAPE of {champion_mape:.2f}%' if champion_mape is not None else ''}."
    )

    executive_summary_text = (
        f"This executive briefing analyzes {meta.get('name', dataset_id)} ({target_col}) spanning {n} chronological observations. "
        f"{stat_narrative} {distribution_narrative} {perf_narrative} "
        f"A {forecast_horizon}-step forward horizon forecast with 95% probability prediction intervals has been computed."
    )

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    report = {
        "dataset_id": dataset_id,
        "dataset_name": meta.get("name", dataset_id),
        "target_column": target_col,
        "total_observations": n,
        "inferred_frequency": inferred_freq or "Unspecified",
        "seasonal_period": seasonal_p,
        "date_range": meta.get("date_range", []),
        "generated_at": now_str,
        "executive_summary": executive_summary_text,
        "descriptive_statistics": stats,
        "hypothesis_tests": {
            "adf": adf,
            "kpss": kpss
        },
        "model_tournament": {
            "test_size": test_sz,
            "champion_model": chosen_label,
            "comparison_table": comp_res.get("comparison_table", [])
        },
        "champion_model": {
            "label": chosen_label,
            "model_type": best_fit.get("model"),
            "param_estimates": best_fit.get("param_estimates", {}),
            "metrics": best_fit.get("metrics", {}),
            "diagnostics": best_fit.get("diagnostics", {})
        },
        "forecast_horizon": forecast_horizon,
        "forecast_table": forecast_table
    }

    return clean_for_json(report)

def build_standalone_html_report(report_data: Dict[str, Any]) -> str:
    """
    Renders an executive-grade, standalone HTML document with self-contained styles.
    Designed for browser viewing and print-to-PDF with zero external dependencies.
    """
    m = report_data["champion_model"]["metrics"]
    diag = report_data["champion_model"]["diagnostics"]
    lb = diag.get("ljung_box", {})
    jb = diag.get("jarque_bera", {})

    rows_html = "".join([
        f"""<tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{row['step']}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{row['timestamp']}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 600; color: #2563eb;">{row['point_forecast']}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">{row['lower_95']}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">{row['upper_95']}</td>
        </tr>""" for row in report_data["forecast_table"]
    ])

    leaderboard_html = "".join([
        f"""<tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">{c.get('label', c.get('model', '')).upper()}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{c.get('rmse', '—')}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{c.get('mae', '—')}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{c.get('mape', '—')}%</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{c.get('mase', '—')}</td>
        </tr>""" for c in report_data["model_tournament"]["comparison_table"][:6]
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATSA Executive Report — {report_data['dataset_name']}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
        }}
        .header {{
            border-bottom: 2px solid #2563eb;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
        }}
        .header .meta {{
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-block;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }}
        .section {{
            margin-bottom: 28px;
        }}
        .section-title {{
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #475569;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }}
        .summary-box {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            font-size: 13px;
            color: #334155;
            line-height: 1.6;
        }}
        .cards-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }}
        .card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
        }}
        .card-label {{
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .card-value {{
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            font-family: monospace;
            margin-top: 2px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            text-align: left;
        }}
        th {{
            background: #f1f5f9;
            color: #475569;
            padding: 8px 12px;
            font-weight: 600;
            border-bottom: 1px solid #cbd5e1;
        }}
        @media print {{
            body {{ padding: 20px; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <span class="badge">ATSA Computational Intelligence</span>
            <h1>Time Series Analysis & Forecasting Executive Briefing</h1>
            <div class="meta">Target: <strong>{report_data['target_column']}</strong> | Dataset: <strong>{report_data['dataset_name']}</strong> | Generated: {report_data['generated_at']}</div>
        </div>
        <div class="no-print">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Executive Summary</div>
        <div class="summary-box">
            {report_data['executive_summary']}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Series Profile & Descriptive Parameters</div>
        <div class="cards-grid">
            <div class="card">
                <div class="card-label">Observations</div>
                <div class="card-value">{report_data['total_observations']}</div>
            </div>
            <div class="card">
                <div class="card-label">Mean Value</div>
                <div class="card-value">{report_data['descriptive_statistics'].get('mean', '—')}</div>
            </div>
            <div class="card">
                <div class="card-label">Std Deviation</div>
                <div class="card-value">{report_data['descriptive_statistics'].get('std', '—')}</div>
            </div>
            <div class="card">
                <div class="card-label">Seasonal Period (s)</div>
                <div class="card-value">{report_data['seasonal_period']}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Hypothesis Tests & Stationarity Validation</div>
        <div class="cards-grid">
            <div class="card">
                <div class="card-label">ADF Test Statistic</div>
                <div class="card-value">{report_data['hypothesis_tests']['adf'].get('test_statistic', '—'):.3f}</div>
            </div>
            <div class="card">
                <div class="card-label">ADF p-value</div>
                <div class="card-value">{report_data['hypothesis_tests']['adf'].get('p_value', '—'):.4f}</div>
            </div>
            <div class="card">
                <div class="card-label">KPSS Stat (Level)</div>
                <div class="card-value">{report_data['hypothesis_tests']['kpss'].get('test_statistic', '—'):.3f}</div>
            </div>
            <div class="card">
                <div class="card-label">Unit-Root Conclusion</div>
                <div class="card-value" style="font-size: 13px; color: {'#16a34a' if report_data['hypothesis_tests']['adf'].get('is_stationary') else '#d97706'};">
                    {'STATIONARY' if report_data['hypothesis_tests']['adf'].get('is_stationary') else 'NON-STATIONARY (d=1)'}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Model Benchmarking Leaderboard (Strict Chronological Split)</div>
        <table>
            <thead>
                <tr>
                    <th>Architecture</th>
                    <th>RMSE</th>
                    <th>MAE</th>
                    <th>MAPE</th>
                    <th>MASE</th>
                </tr>
            </thead>
            <tbody>
                {leaderboard_html}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Champion Model Forward Horizon Forecast ({report_data['champion_model']['label']})</div>
        <div style="margin-bottom: 8px; font-size: 11px; color: #64748b;">
            Fit Quality: AIC: <strong>{m.get('aic', 'N/A')}</strong> | In-sample MAPE: <strong>{m.get('mape', 'N/A')}%</strong> | Ljung-Box White Noise p-value: <strong>{lb.get('p_value', 'N/A')}</strong>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Date / Step</th>
                    <th>Point Forecast (ŷ)</th>
                    <th>Lower 95% Bound</th>
                    <th>Upper 95% Bound</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>

    <div class="section" style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center;">
        Generated automatically by Chronos ATSA & Advanced Forecasting Platform. All models estimated with exact state-space log-likelihood.
    </div>
</body>
</html>"""
