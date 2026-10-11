import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { ModelFitResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter
} from 'recharts';
import {
  Play, RotateCcw, Download, CheckCircle, AlertTriangle,
  Info, Cpu, Layers, Activity
} from 'lucide-react';

interface ModelConfig {
  title: string;
  math: string;
  description: string;
  defaultParams: Record<string, any>;
  paramFields: { key: string; label: string; type: 'number' | 'select'; options?: { label: string; value: any }[]; min?: number; max?: number }[];
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  naive: {
    title: 'Naive Random Walk Baseline',
    math: 'Ŷ_{t+h} = Y_t',
    description: 'Carries the most recent observation forward into all forecast horizons. Standard ATSA baseline.',
    defaultParams: {},
    paramFields: []
  },
  linear_trend: {
    title: 'Deterministic Linear Trend Regression',
    math: 'Y_t = β_0 + β_1 \\cdot t + \\epsilon_t',
    description: 'Models the time series as a linear function of time index t with standard OLS regression.',
    defaultParams: {},
    paramFields: []
  },
  ses: {
    title: 'Simple Exponential Smoothing (SES)',
    math: 'Ŷ_{t+1|t} = α Y_t + (1 - α) Ŷ_{t|t-1}',
    description: 'Exponentially weighted moving average suitable for non-seasonal series with no clear trend.',
    defaultParams: { alpha: 'auto' },
    paramFields: [
      {
        key: 'alpha',
        label: 'Smoothing Parameter (α)',
        type: 'select',
        options: [
          { label: 'Auto (Maximum Likelihood)', value: 'auto' },
          { label: '0.1 (Slow adaptation)', value: 0.1 },
          { label: '0.3', value: 0.3 },
          { label: '0.5 (Moderate)', value: 0.5 },
          { label: '0.8 (Rapid adaptation)', value: 0.8 }
        ]
      }
    ]
  },
  holt: {
    title: "Holt's Linear Trend Method",
    math: 'L_t = α Y_t + (1 - α)(L_{t-1} + b_{t-1}), \\quad b_t = β(L_t - L_{t-1}) + (1 - β)b_{t-1}',
    description: 'Two-parameter exponential smoothing accommodating level (α) and slope trend (β).',
    defaultParams: { alpha: 'auto', beta: 'auto' },
    paramFields: [
      {
        key: 'alpha',
        label: 'Level Smoothing (α)',
        type: 'select',
        options: [
          { label: 'Auto (Estimated)', value: 'auto' },
          { label: '0.2', value: 0.2 },
          { label: '0.5', value: 0.5 },
          { label: '0.8', value: 0.8 }
        ]
      },
      {
        key: 'beta',
        label: 'Trend Smoothing (β)',
        type: 'select',
        options: [
          { label: 'Auto (Estimated)', value: 'auto' },
          { label: '0.1', value: 0.1 },
          { label: '0.3', value: 0.3 },
          { label: '0.5', value: 0.5 }
        ]
      }
    ]
  },
  holt_winters: {
    title: 'Holt-Winters Exponential Smoothing',
    math: 'Ŷ_{t+h} = (L_t + h b_t) \\cdot S_{t+h-m(k+1)}',
    description: 'Triple exponential smoothing capturing level, trend, and cyclical seasonal patterns.',
    defaultParams: { trend: 'add', seasonal: 'add', period: 12 },
    paramFields: [
      {
        key: 'trend',
        label: 'Trend Type',
        type: 'select',
        options: [{ label: 'Additive', value: 'add' }]
      },
      {
        key: 'seasonal',
        label: 'Seasonal Type',
        type: 'select',
        options: [
          { label: 'Additive', value: 'add' },
          { label: 'Multiplicative', value: 'mul' }
        ]
      },
      { key: 'period', label: 'Seasonal Period (s)', type: 'number', min: 2, max: 365 }
    ]
  },
  ar: {
    title: 'Autoregressive Model — AR(p)',
    math: 'Y_t = c + \\sum_{i=1}^p \\phi_i Y_{t-i} + \\epsilon_t',
    description: 'Models current observation as a linear combination of its own previous p lags.',
    defaultParams: { p: 1, trend: 'c' },
    paramFields: [
      { key: 'p', label: 'Autoregressive Order (p)', type: 'number', min: 1, max: 10 },
      {
        key: 'trend',
        label: 'Trend / Intercept',
        type: 'select',
        options: [
          { label: "Constant ('c')", value: 'c' },
          { label: "None ('n')", value: 'n' }
        ]
      }
    ]
  },
  ma: {
    title: 'Moving Average Model — MA(q)',
    math: 'Y_t = \\mu + \\epsilon_t + \\sum_{j=1}^q \\theta_j \\epsilon_{t-j}',
    description: 'Models series based on past white-noise forecast errors (innovations). (Not a moving average filter)',
    defaultParams: { q: 1, trend: 'c' },
    paramFields: [
      { key: 'q', label: 'Moving Average Order (q)', type: 'number', min: 1, max: 10 },
      {
        key: 'trend',
        label: 'Constant / Mean',
        type: 'select',
        options: [
          { label: "Constant ('c')", value: 'c' },
          { label: "None ('n')", value: 'n' }
        ]
      }
    ]
  },
  arma: {
    title: 'Autoregressive Moving Average — ARMA(p, q)',
    math: 'Y_t = c + \\sum_{i=1}^p \\phi_i Y_{t-i} + \\epsilon_t + \\sum_{j=1}^q \\theta_j \\epsilon_{t-j}',
    description: 'Combined stationary stochastic process for time series satisfying weakly stationary conditions.',
    defaultParams: { p: 1, q: 1, trend: 'c' },
    paramFields: [
      { key: 'p', label: 'AR Order (p)', type: 'number', min: 1, max: 8 },
      { key: 'q', label: 'MA Order (q)', type: 'number', min: 1, max: 8 },
      {
        key: 'trend',
        label: 'Constant Term',
        type: 'select',
        options: [
          { label: "Constant ('c')", value: 'c' },
          { label: "None ('n')", value: 'n' }
        ]
      }
    ]
  },
  arima: {
    title: 'Autoregressive Integrated Moving Average — ARIMA(p, d, q)',
    math: '\\Phi(B)(1 - B)^d Y_t = c + \\Theta(B) \\epsilon_t',
    description: 'General classical model for non-stationary series stationarized through order-d differencing.',
    defaultParams: { p: 1, d: 1, q: 1, trend: 'n' },
    paramFields: [
      { key: 'p', label: 'AR Order (p)', type: 'number', min: 0, max: 8 },
      { key: 'd', label: 'Differencing Order (d)', type: 'number', min: 0, max: 2 },
      { key: 'q', label: 'MA Order (q)', type: 'number', min: 0, max: 8 }
    ]
  },
  sarima: {
    title: 'Seasonal ARIMA — SARIMA(p, d, q)(P, D, Q)[s]',
    math: '\\Phi_p(B) \\tilde{\\Phi}_P(B^s) (1 - B)^d (1 - B^s)^D Y_t = \\Theta_q(B) \\tilde{\\Theta}_Q(B^s) \\epsilon_t',
    description: 'Multiplicative seasonal ARIMA capturing both short-run autocorrelation and long-run seasonal recurrence.',
    defaultParams: { p: 1, d: 0, q: 1, P: 1, D: 0, Q: 1, s: 12 },
    paramFields: [
      { key: 'p', label: 'Non-seasonal AR (p)', type: 'number', min: 0, max: 4 },
      { key: 'd', label: 'Non-seasonal Diff (d)', type: 'number', min: 0, max: 2 },
      { key: 'q', label: 'Non-seasonal MA (q)', type: 'number', min: 0, max: 4 },
      { key: 'P', label: 'Seasonal AR (P)', type: 'number', min: 0, max: 2 },
      { key: 'D', label: 'Seasonal Diff (D)', type: 'number', min: 0, max: 1 },
      { key: 'Q', label: 'Seasonal MA (Q)', type: 'number', min: 0, max: 2 },
      { key: 's', label: 'Seasonal Period (s)', type: 'number', min: 2, max: 365 }
    ]
  }
};

export const ModelWorkspacePage: React.FC = () => {
  const { modelType = 'arma' } = useParams<{ modelType: string }>();
  const { selectedDataset, selectedTarget } = useApp();
  const config = MODEL_CONFIGS[modelType] || MODEL_CONFIGS['arma'];

  const [parameters, setParameters] = useState<Record<string, any>>(config.defaultParams);
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [fitResult, setFitResult] = useState<ModelFitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forecast' | 'diagnostics' | 'parameters' | 'metrics'>('forecast');

  // Sync default parameters when switching models
  React.useEffect(() => {
    setParameters(config.defaultParams);
    setFitResult(null);
    setErrorMsg(null);
  }, [modelType]);

  const handleFit = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.fitModel(
        selectedDataset.id,
        selectedTarget,
        modelType,
        parameters,
        forecastHorizon,
        confidenceLevel
      );
      setFitResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Model estimation failed');
    } finally {
      setLoading(false);
    }
  };

  // Prepare Forecast Overlay Chart Data
  const forecastChartData = () => {
    if (!fitResult) return [];
    const historical = fitResult.timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: fitResult.actual[idx],
      fitted: fitResult.fitted[idx],
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null
    }));

    const future = fitResult.forecast_timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: null as number | null,
      fitted: null as number | null,
      forecast: fitResult.forecast[idx],
      lower: fitResult.lower_interval[idx],
      upper: fitResult.upper_interval[idx]
    }));

    // Connect the last historical point with the first forecast point
    if (historical.length > 0 && future.length > 0) {
      const lastHist = historical[historical.length - 1];
      future.unshift({
        time: lastHist.time,
        actual: lastHist.actual,
        fitted: null,
        forecast: lastHist.actual,
        lower: lastHist.actual,
        upper: lastHist.actual
      });
    }

    return [...historical.slice(-60), ...future];
  };

  // Residual series for diagnostics
  const residualChartData = () => {
    if (!fitResult) return [];
    return fitResult.timestamps.slice(-60).map((t, idx) => {
      const origIdx = fitResult.timestamps.length - 60 + idx;
      return {
        time: t.slice(0, 10),
        residual: fitResult.residuals[origIdx]
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Model Header */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-semibold">
                {modelType.toUpperCase()}
              </span>
              <h1 className="text-xl font-bold text-white">{config.title}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{config.description}</p>
            <div className="mt-2 text-xs font-mono text-cyan-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
              {config.math}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setParameters(config.defaultParams)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleFit}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Estimating Model...' : 'Fit Model'}
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          {config.paramFields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">{field.label}:</span>
              {field.type === 'number' ? (
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={parameters[field.key] ?? ''}
                  onChange={(e) => setParameters({ ...parameters, [field.key]: Number(e.target.value) })}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                />
              ) : (
                <select
                  value={parameters[field.key] ?? ''}
                  onChange={(e) => setParameters({ ...parameters, [field.key]: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Horizon (h):</span>
            <input
              type="number"
              min="1"
              max="100"
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">CI Level:</span>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
            >
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warnings & Errors */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Model Estimation Error:</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {fitResult && fitResult.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs text-amber-300 space-y-1">
          {fitResult.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results Workspace */}
      {fitResult && (
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'forecast', label: '1. Forecast & Fitted Overlay' },
              { id: 'diagnostics', label: '2. Residual Diagnostics' },
              { id: 'parameters', label: '3. Estimated Parameters' },
              { id: 'metrics', label: '4. Evaluation Metrics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Forecast Chart */}
          {activeTab === 'forecast' && (
            <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Observed, Fitted & Out-of-Sample Forecast</h2>
                  <p className="text-xs text-slate-400">
                    Confidence interval: {(confidenceLevel * 100).toFixed(0)}% shaded boundary
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-3 h-0.5 bg-blue-500 rounded"></span> Actual
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-500 rounded"></span> In-Sample Fitted
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-0.5 bg-rose-500 rounded"></span> Forecast
                  </span>
                  <a
                    href={apiService.getForecastCsvUrl(fitResult.analysis_id)}
                    download
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono ml-2"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </a>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#38bdf8" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#38bdf8" fillOpacity={0.15} />
                    <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fitted" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 2: Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Residual Time Plot */}
              <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Residuals Over Time e_t</h3>
                <p className="text-xs text-slate-400 mb-3">Checking for mean zero and homoscedasticity</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={residualChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="residual" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ljung-Box Test & Distribution */}
              <div className="bg-[#101728] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Ljung-Box White Noise Test</h3>
                  <p className="text-xs text-slate-400 mb-3">Hypothesis test for independence of residuals</p>
                  {fitResult.diagnostics.ljung_box && (
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Statistic (Q):</span>
                        <span className="text-white font-bold">{fitResult.diagnostics.ljung_box.statistic.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">p-value:</span>
                        <span className={fitResult.diagnostics.ljung_box.p_value > 0.05 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {fitResult.diagnostics.ljung_box.p_value.toFixed(4)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                        {fitResult.diagnostics.ljung_box.interpretation}
                      </div>
                    </div>
                  )}
                </div>

                {fitResult.diagnostics.histogram && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">Residual Histogram</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fitResult.diagnostics.histogram.bins.map((b, i) => ({
                          bin: b.toFixed(1),
                          count: fitResult.diagnostics.histogram?.counts[i]
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                          <Bar dataKey="count" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Estimated Parameters */}
          {activeTab === 'parameters' && (
            <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-semibold text-white mb-1">Estimated Model Coefficients</h3>
              <p className="text-xs text-slate-400 mb-4">Maximum likelihood / OLS parameter estimates</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(fitResult.param_estimates).map(([name, val]) => (
                  <div key={name} className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">{name}</span>
                    <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                      {typeof val === 'number' ? val.toFixed(5) : val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Evaluation Metrics */}
          {activeTab === 'metrics' && (
            <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-semibold text-white mb-1">In-Sample Fit Metrics & Information Criteria</h3>
              <p className="text-xs text-slate-400 mb-4">Error metrics calculated over valid historical observations</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400">MAE</span>
                  <div className="text-xl font-bold text-white font-mono mt-1">{fitResult.metrics.mae ?? '—'}</div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400">RMSE</span>
                  <div className="text-xl font-bold text-white font-mono mt-1">{fitResult.metrics.rmse ?? '—'}</div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400">MAPE (%)</span>
                  <div className="text-xl font-bold text-white font-mono mt-1">
                    {fitResult.metrics.mape !== null ? `${fitResult.metrics.mape}%` : '—'}
                  </div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400">AIC</span>
                  <div className="text-xl font-bold text-violet-400 font-mono mt-1">
                    {fitResult.metrics.aic?.toFixed(2) ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
