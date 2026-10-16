import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ModelFitResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, BarChart, Bar, Brush, ReferenceLine
} from 'recharts';
import {
  Play, RotateCcw, Download, AlertTriangle,
  Info, Sparkles, Code2, Copy, Check
} from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { TimeZoomControls } from '../components/common/TimeZoomControls';
import { ModelFittedExplanation } from '../components/common/ModelFittedExplanation';
import { withSeasonalDefaults } from '../utils/seasonality';

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
    math: 'Y_t = β_0 + β_1 · t + ε_t',
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
    math: 'L_t = α Y_t + (1 - α)(L_{t-1} + b_{t-1}),  b_t = β(L_t - L_{t-1}) + (1 - β)b_{t-1}',
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
    math: 'Ŷ_{t+h} = (L_t + h b_t) · S_{t+h-m(k+1)}',
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
    math: 'Y_t = c + ∑ φ_i Y_{t-i} + ε_t',
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
    math: 'Y_t = μ + ε_t + ∑ θ_j ε_{t-j}',
    description: 'Models series based on past white-noise forecast errors (innovations). (Not a rolling average filter)',
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
    math: 'Y_t = c + ∑ φ_i Y_{t-i} + ε_t + ∑ θ_j ε_{t-j}',
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
    math: 'Φ(B)(1 - B)^d Y_t = c + Θ(B) ε_t',
    description: 'General classical model for non-stationary series stationarized through order-d differencing.',
    defaultParams: { p: 1, d: 1, q: 1, trend: 'auto' },
    paramFields: [
      { key: 'p', label: 'AR Order (p)', type: 'number', min: 0, max: 8 },
      { key: 'd', label: 'Differencing Order (d)', type: 'number', min: 0, max: 2 },
      { key: 'q', label: 'MA Order (q)', type: 'number', min: 0, max: 8 },
      {
        key: 'trend',
        label: 'Drift / Trend',
        type: 'select',
        options: [
          { label: 'Auto (drift when d = 1)', value: 'auto' },
          { label: "Drift / Linear ('t')", value: 't' },
          { label: "Constant ('c', d = 0 only)", value: 'c' },
          { label: "None ('n')", value: 'n' }
        ]
      }
    ]
  },
  sarima: {
    title: 'Seasonal ARIMA — SARIMA(p, d, q)(P, D, Q)[s]',
    math: 'Φ_p(B) Φ̃_P(B^s)(1 - B)^d (1 - B^s)^D Y_t = Θ_q(B) Θ̃_Q(B^s) ε_t',
    description: 'Multiplicative seasonal ARIMA capturing both short-run autocorrelation and long-run seasonal recurrence.',
    defaultParams: { p: 1, d: 1, q: 1, P: 1, D: 1, Q: 1, s: 12 },
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
  const { isDark, chartTheme } = useTheme();
  const config = MODEL_CONFIGS[modelType] || MODEL_CONFIGS['arma'];
  const defaultParams = useMemo(
    () => withSeasonalDefaults(config.defaultParams, selectedDataset?.inferred_freq, selectedDataset?.total_rows ?? 0),
    [config, selectedDataset?.inferred_freq, selectedDataset?.total_rows]
  );

  const [parameters, setParameters] = useState<Record<string, any>>(defaultParams);
  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [fitResult, setFitResult] = useState<ModelFitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forecast' | 'explanation' | 'diagnostics' | 'parameters' | 'metrics' | 'code'>('forecast');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Auto-ARIMA search state
  const [autoSearching, setAutoSearching] = useState(false);

  // Time Zoom states
  const [forecastZoomCount, setForecastZoomCount] = useState<number>(0);
  const [residualZoomCount, setResidualZoomCount] = useState<number>(0);

  // Sync default parameters when switching models or datasets
  React.useEffect(() => {
    setParameters(defaultParams);
    setFitResult(null);
    setErrorMsg(null);
    setForecastZoomCount(0);
    setResidualZoomCount(0);
  }, [modelType, defaultParams]);

  const handleAutoArimaSearch = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setAutoSearching(true);
    try {
      const isSarima = modelType === 'sarima';
      const sVal = parameters.s || defaultParams.s || 12;
      const res = await apiService.getAutoArima(
        selectedDataset.id,
        selectedTarget,
        3,
        2,
        3,
        isSarima,
        sVal
      );
      if (isSarima) {
        setParameters({
          ...parameters,
          p: res.best_p,
          d: res.best_d,
          q: res.best_q,
          P: res.best_P ?? 1,
          D: res.best_D ?? 1,
          Q: res.best_Q ?? 1,
          s: res.best_s ?? sVal
        });
      } else {
        setParameters({ ...parameters, p: res.best_p, d: res.best_d, q: res.best_q });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Auto-search failed');
    } finally {
      setAutoSearching(false);
    }
  };

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
      const totalLen = (res.timestamps?.length || 0) + (res.forecast_timestamps?.length || 0);
      setForecastZoomCount(totalLen > 100 ? 100 : 0);
      setResidualZoomCount(res.timestamps?.length > 100 ? 100 : 0);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Model estimation failed');
    } finally {
      setLoading(false);
    }
  };

  // Full merged dataset for forecast chart
  const fullForecastData = useMemo(() => {
    if (!fitResult) return [];
    const historical = fitResult.timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: fitResult.actual[idx],
      fitted: fitResult.fitted[idx],
      forecast: null as number | null,
      band: null as [number, number] | null
    }));

    const future = fitResult.forecast_timestamps.map((t, idx) => {
      const lo = fitResult.lower_interval[idx];
      const hi = fitResult.upper_interval[idx];
      return {
        time: t.slice(0, 10),
        actual: null as number | null,
        fitted: null as number | null,
        forecast: fitResult.forecast[idx],
        band: lo != null && hi != null ? ([lo, hi] as [number, number]) : null
      };
    });

    if (historical.length > 0 && future.length > 0) {
      const lastHist = historical[historical.length - 1];
      future.unshift({
        time: lastHist.time,
        actual: lastHist.actual,
        fitted: lastHist.fitted,
        forecast: lastHist.actual,
        band: [lastHist.actual, lastHist.actual]
      });
      // Avoid duplicate category: drop the bridge point's actual from the historical row
      historical.pop();
    }

    return [...historical, ...future];
  }, [fitResult]);

  const visibleForecastData = useMemo(() => {
    if (fullForecastData.length === 0) return [];
    const count = forecastZoomCount === 0 || forecastZoomCount >= fullForecastData.length
      ? fullForecastData.length
      : forecastZoomCount;
    const startIdx = Math.max(0, fullForecastData.length - count);
    return fullForecastData.slice(startIdx);
  }, [fullForecastData, forecastZoomCount]);

  // Full residual points
  const fullResidualData = useMemo(() => {
    if (!fitResult) return [];
    return fitResult.timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      residual: fitResult.residuals[idx]
    }));
  }, [fitResult]);

  const visibleResidualData = useMemo(() => {
    if (fullResidualData.length === 0) return [];
    const count = residualZoomCount === 0 || residualZoomCount >= fullResidualData.length
      ? fullResidualData.length
      : residualZoomCount;
    const startIdx = Math.max(0, fullResidualData.length - count);
    return fullResidualData.slice(startIdx);
  }, [fullResidualData, residualZoomCount]);

  // Residual ACF points
  const residualAcfPoints = useMemo(() => {
    if (!fitResult?.diagnostics?.acf) return [];
    const acfData = fitResult.diagnostics.acf;
    return acfData.lags.map((lag, i) => ({
      lag: `L${lag}`,
      val: acfData.values[i]
    }));
  }, [fitResult]);

  const handleCopyCode = () => {
    if (fitResult?.python_code) {
      navigator.clipboard.writeText(fitResult.python_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Header & Controls */}
      <div className={`p-5 rounded-2xl border transition ${
        isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-cyan-300 border border-blue-500/20 uppercase">
                {modelType.toUpperCase()}
              </span>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{config.title}</h1>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">{config.description}</p>
            <div className={`mt-2 text-xs font-mono px-3 py-1.5 rounded-lg border inline-block ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-cyan-300' : 'bg-slate-50 border-slate-200 text-blue-700'
            }`}>
              {config.math}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(modelType === 'arima' || modelType === 'arma' || modelType === 'sarima') && (
              <button
                onClick={handleAutoArimaSearch}
                disabled={autoSearching}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                }`}
                title={modelType === 'sarima' ? 'Automated seasonal SARIMA grid search minimizing AIC' : 'Automated grid search minimizing AIC'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {autoSearching ? 'Searching...' : modelType === 'sarima' ? 'Auto-Tune SARIMA' : 'Auto-Search'}
              </button>
            )}
            <button
              onClick={() => setParameters(defaultParams)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleFit}
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Estimating...' : 'Fit Model'}
            </button>
          </div>
        </div>

        {/* Minimal Parameter Configuration Bar */}
        <div className={`mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-xs ${
          isDark ? 'border-slate-800/80' : 'border-slate-200/80'
        }`}>
          {config.paramFields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="text-[var(--text-tertiary)] font-medium">{field.label}:</span>
              {field.type === 'number' ? (
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={parameters[field.key] ?? ''}
                  onChange={(e) => setParameters({ ...parameters, [field.key]: Number(e.target.value) })}
                  className={`w-16 border rounded-lg px-2 py-1 font-mono text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              ) : (
                <select
                  value={parameters[field.key] ?? ''}
                  onChange={(e) => setParameters({ ...parameters, [field.key]: e.target.value })}
                  className={`border rounded-lg px-2.5 py-1 text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
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
            <span className="text-[var(--text-tertiary)] font-medium">Horizon:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(Number(e.target.value))}
              className={`w-16 border rounded-lg px-2 py-1 font-mono text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)] font-medium">Confidence:</span>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              className={`border rounded-lg px-2.5 py-1 text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
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
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
          isDark ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Model Estimation Error:</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {fitResult && fitResult.warnings.length > 0 && (
        <div className={`p-4 rounded-xl border text-xs space-y-1 ${
          isDark ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {fitResult.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results Workspace */}
      {fitResult && (
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className={`flex items-center gap-1.5 border-b pb-2 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {[
              { id: 'forecast', label: '1. Forecast & Fitted Overlay' },
              { id: 'explanation', label: '2. Model Explanation & Dynamics' },
              { id: 'diagnostics', label: '3. Residual Diagnostics (ACF & Tests)' },
              { id: 'parameters', label: '4. Parameters' },
              { id: 'metrics', label: '5. Evaluation Metrics' },
              { id: 'code', label: '6. Python Script' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Forecast Chart with Time Zoom & Brush */}
          {activeTab === 'forecast' && (
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    Observed, In-Sample Fitted & Forward Forecast
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Confidence interval: {(confidenceLevel * 100).toFixed(0)}% shaded boundary
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <TimeZoomControls
                    onZoomIn={() => setForecastZoomCount(prev => Math.max(14, Math.floor((prev === 0 ? fullForecastData.length : prev) * 0.65)))}
                    onZoomOut={() => setForecastZoomCount(prev => {
                      const next = Math.ceil((prev === 0 ? fullForecastData.length : prev) * 1.5);
                      return next >= fullForecastData.length ? 0 : next;
                    })}
                    onReset={() => setForecastZoomCount(0)}
                    onSelectPreset={(c) => setForecastZoomCount(c === 0 ? 0 : Math.min(c, fullForecastData.length))}
                    currentCount={visibleForecastData.length}
                    totalCount={fullForecastData.length}
                  />

                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-2.5 h-1 bg-blue-500 rounded-full"></span> Actual
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-1 bg-emerald-500 rounded-full"></span> Fitted
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-2.5 h-1 bg-rose-500 rounded-full"></span> Forecast
                    </span>
                    <a
                      href={apiService.getForecastCsvUrl(fitResult.analysis_id)}
                      download
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono ml-1 transition ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </a>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleForecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 10 }} />
                    <YAxis stroke={chartTheme.axis} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderColor: chartTheme.tooltipBorder,
                        color: chartTheme.tooltipText,
                        borderRadius: '10px',
                        fontSize: '11px',
                        boxShadow: chartTheme.tooltipShadow
                      }}
                    />
                    <Area type="monotone" dataKey="band" stroke="none" fill={chartTheme.confidenceFill} name="Interval" />
                    <Line type="monotone" dataKey="actual" stroke={chartTheme.actual} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fitted" stroke={chartTheme.fitted} strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Brush dataKey="time" height={20} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} tickFormatter={(t) => t.slice(5, 10)} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <ChartExplanation
                title="How to Read the Model Fit & Forecast Graph"
                summary="This visualization overlays the model's in-sample fitted trajectory against empirical ground truth, followed by forward out-of-sample projections and confidence uncertainty intervals."
                items={[
                  {
                    badge: "Blue Curve",
                    badgeColor: "blue",
                    label: "Actual History (Y_t)",
                    text: "Empirical historical observations used for statistical parameter estimation and training."
                  },
                  {
                    badge: "Green Curve",
                    badgeColor: "emerald",
                    label: "Fitted Values (Ŷ_t)",
                    text: "The model's in-sample expectations. Tight alignment indicates strong explanatory power."
                  },
                  {
                    badge: "Rose Red Curve",
                    badgeColor: "rose",
                    label: "Forecast (Ŷ_{T+h})",
                    text: "Multi-step forward chronological projections computed using estimated model coefficients."
                  },
                  {
                    badge: "Time Zoom Slider",
                    badgeColor: "cyan",
                    label: "Zoom Horizon",
                    text: "Drag the slider handles at the bottom or use the (+ / -) controls above to zoom into the forecast cutoff."
                  }
                ]}
                takeaway="A well-specified model tracks turning points in actual data without excessive lag, while maintaining realistic expanding prediction intervals."
              />

              {/* Dedicated Model-Specific Explanation for the Active Fitted Architecture */}
              <ModelFittedExplanation
                modelType={modelType}
                fitResult={fitResult}
                parameters={parameters}
                forecastHorizon={forecastHorizon}
                confidenceLevel={confidenceLevel}
              />
            </div>
          )}

          {/* TAB 2: Model-Specific Explanation & Mathematics */}
          {activeTab === 'explanation' && (
            <div className="space-y-4">
              <ModelFittedExplanation
                modelType={modelType}
                fitResult={fitResult}
                parameters={parameters}
                forecastHorizon={forecastHorizon}
                confidenceLevel={confidenceLevel}
              />
            </div>
          )}

          {/* TAB 3: Diagnostics (with Residual ACF & Time Zoom) */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {/* Residual Time Plot with Zoom & Brush */}
              <div className={`p-5 rounded-2xl border transition ${
                isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Residuals Over Time (e_t)</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Checking for mean zero and constant variance</p>
                  </div>

                  <TimeZoomControls
                    onZoomIn={() => setResidualZoomCount(prev => Math.max(14, Math.floor((prev === 0 ? fullResidualData.length : prev) * 0.65)))}
                    onZoomOut={() => setResidualZoomCount(prev => {
                      const next = Math.ceil((prev === 0 ? fullResidualData.length : prev) * 1.5);
                      return next >= fullResidualData.length ? 0 : next;
                    })}
                    onReset={() => setResidualZoomCount(0)}
                    onSelectPreset={(c) => setResidualZoomCount(c === 0 ? 0 : Math.min(c, fullResidualData.length))}
                    currentCount={visibleResidualData.length}
                    totalCount={fullResidualData.length}
                  />
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleResidualData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                      <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                      <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                      <ReferenceLine y={0} stroke={chartTheme.zeroLine} strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="residual" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                      <Brush dataKey="time" height={18} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} tickFormatter={(t) => t.slice(5, 10)} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Residual ACF Correlogram + Ljung-Box + Histogram Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Residual Autocorrelation (ACF) */}
                <div className={`p-5 rounded-2xl border transition ${
                  isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      Residual ACF Correlogram
                    </h3>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                      95% Bartlett: ±{fitResult.diagnostics.acf?.ci_bound?.toFixed(3) ?? '0.196'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Errors must be uncorrelated (spikes strictly inside dashed bands)
                  </p>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={residualAcfPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="lag" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                        <YAxis stroke={chartTheme.axis} domain={[-1, 1]} tick={{ fontSize: 9 }} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
                        <ReferenceLine y={fitResult.diagnostics.acf?.ci_bound || 0.196} stroke="#f59e0b" strokeDasharray="3 3" />
                        <ReferenceLine y={-(fitResult.diagnostics.acf?.ci_bound || 0.196)} stroke="#f59e0b" strokeDasharray="3 3" />
                        <Bar dataKey="val" fill={chartTheme.forecast} />
                        <Brush dataKey="lag" height={18} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ljung-Box Test & Distribution */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                  isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
                }`}>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Ljung-Box White Noise Test</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">Formal hypothesis test for residual independence</p>
                    {fitResult.diagnostics.ljung_box && (
                      <div className={`p-3 rounded-xl border space-y-1.5 text-xs font-mono ${
                        isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                      }`}>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Statistic (Q):</span>
                          <span className="text-[var(--text-primary)] font-bold">{fitResult.diagnostics.ljung_box.statistic.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">p-value:</span>
                          <span className={`font-bold ${
                            fitResult.diagnostics.ljung_box.p_value > 0.05
                              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                              : isDark ? 'text-amber-400' : 'text-amber-600'
                          }`}>
                            {fitResult.diagnostics.ljung_box.p_value.toFixed(4)}
                          </span>
                        </div>
                        <div className={`text-[11px] font-sans pt-2 border-t text-[var(--text-secondary)] ${
                          isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          {fitResult.diagnostics.ljung_box.interpretation}
                        </div>
                      </div>
                    )}
                  </div>

                  {fitResult.diagnostics.histogram && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">Residual Normality Histogram</h4>
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fitResult.diagnostics.histogram.bins.map((b, i) => ({
                            bin: b.toFixed(1),
                            count: fitResult.diagnostics.histogram?.counts[i]
                          }))} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="bin" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                            <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                            <Bar dataKey="count" fill={chartTheme.actual} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <ChartExplanation
                title="Interpreting Residual Diagnostics & White Noise"
                summary="Residuals (e_t = Y_t - Ŷ_t) measure whatever remains unexplained by the model. Diagnostic adequacy requires errors to be strictly independent white noise."
                formula="e_t ~ i.i.d. N(0, σ²)"
                items={[
                  {
                    badge: "Zero Mean Oscillation",
                    badgeColor: "rose",
                    label: "Residual Line (e_t)",
                    text: "Errors should fluctuate symmetrically around zero (0.0). A sloped residual line indicates missed trend."
                  },
                  {
                    badge: "Residual ACF",
                    badgeColor: "cyan",
                    label: "White Noise Bands",
                    text: "All residual ACF bars should stay comfortably inside the amber dashed 95% Bartlett bounds."
                  },
                  {
                    badge: "Ljung-Box (p > 0.05)",
                    badgeColor: "emerald",
                    label: "White Noise Test",
                    text: "Null hypothesis H₀: residuals are uncorrelated. If p > 0.05, you cannot reject H₀ (pass)."
                  },
                  {
                    badge: "Bell-Shaped Curve",
                    badgeColor: "purple",
                    label: "Histogram Normality",
                    text: "The histogram should resemble a symmetric Gaussian bell curve centered at zero."
                  }
                ]}
                takeaway="A passing Ljung-Box test (p > 0.05) and residual ACF values within bounds confirm that your model captured all systematic predictability."
              />
            </div>
          )}

          {/* TAB 3: Estimated Parameters */}
          {activeTab === 'parameters' && (
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Estimated Model Coefficients</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Maximum likelihood / OLS parameter estimates</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(fitResult.param_estimates).map(([name, val]) => (
                  <div key={name} className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{name}</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-cyan-400 font-mono mt-1">
                      {typeof val === 'number' ? val.toFixed(5) : val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Evaluation Metrics */}
          {activeTab === 'metrics' && (
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">In-Sample Fit Metrics & Information Criteria</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Error metrics calculated over valid historical observations</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">MAE</span>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">{fitResult.metrics.mae ?? '—'}</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">RMSE</span>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">{fitResult.metrics.rmse ?? '—'}</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">MAPE (%)</span>
                  <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
                    {fitResult.metrics.mape !== null ? `${fitResult.metrics.mape}%` : '—'}
                  </div>
                </div>
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">AIC</span>
                  <div className="text-lg font-bold text-violet-600 dark:text-violet-400 font-mono mt-1">
                    {fitResult.metrics.aic?.toFixed(2) ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Python Reproducibility Script */}
          {activeTab === 'code' && (
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    Executable Python Code
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Standalone Python snippet using statsmodels and pandas reproducing this exact statistical model fit.
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <pre className={`p-4 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed ${
                isDark ? 'bg-slate-950 border-slate-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-emerald-400'
              }`}>
                {fitResult.python_code || '# Code unavailable for this model.'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
