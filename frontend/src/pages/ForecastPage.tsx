import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ModelFitResult } from '../types';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Line, Brush
} from 'recharts';
import { Download, Play, Sparkles, Info } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { TimeZoomControls } from '../components/common/TimeZoomControls';
import { getDefaultSeasonalPeriod } from '../utils/seasonality';

export const ForecastPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [modelType, setModelType] = useState('auto');
  const [horizon, setHorizon] = useState(24);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [fitResult, setFitResult] = useState<ModelFitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomCount, setZoomCount] = useState<number>(0);

  const handleGenerateForecast = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);
    try {
      const period = getDefaultSeasonalPeriod(selectedDataset.inferred_freq, selectedDataset.total_rows ?? 0);
      const defaultParams: Record<string, any> = {
        auto: {},
        naive: {},
        linear_trend: {},
        ses: { alpha: 'auto' },
        holt: { alpha: 'auto', beta: 'auto' },
        holt_winters: { trend: 'add', seasonal: 'add', period },
        ar: { p: 1, trend: 'c' },
        ma: { q: 1, trend: 'c' },
        arma: { p: 1, q: 1, trend: 'c' },
        arima: { p: 1, d: 1, q: 1, trend: 'auto' },
        sarima: { p: 1, d: 1, q: 1, P: 1, D: 1, Q: 1, s: period }
      };

      const res = await apiService.fitModel(
        selectedDataset.id,
        selectedTarget,
        modelType,
        defaultParams[modelType] || {},
        horizon,
        confidenceLevel
      );
      setFitResult(res);
      const totalLen = (res.timestamps?.length || 0) + (res.forecast_timestamps?.length || 0);
      setZoomCount(totalLen > 100 ? 100 : 0);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Forecast generation failed');
    } finally {
      setLoading(false);
    }
  };

  const fullChartData = useMemo(() => {
    if (!fitResult) return [];
    const historical = fitResult.timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: fitResult.actual[idx],
      forecast: null as number | null,
      band: null as [number, number] | null
    }));

    const future = fitResult.forecast_timestamps.map((t, idx) => {
      const lo = fitResult.lower_interval[idx];
      const hi = fitResult.upper_interval[idx];
      return {
        time: t.slice(0, 10),
        actual: null as number | null,
        forecast: fitResult.forecast[idx],
        band: lo != null && hi != null ? ([lo, hi] as [number, number]) : null
      };
    });

    if (historical.length > 0 && future.length > 0) {
      const lastHist = historical.pop()!;
      future.unshift({
        time: lastHist.time,
        actual: lastHist.actual,
        forecast: lastHist.actual,
        band: [lastHist.actual, lastHist.actual]
      });
    }

    return [...historical, ...future];
  }, [fitResult]);

  const visibleChartData = useMemo(() => {
    if (fullChartData.length === 0) return [];
    const count = zoomCount === 0 || zoomCount >= fullChartData.length ? fullChartData.length : zoomCount;
    const startIdx = Math.max(0, fullChartData.length - count);
    return fullChartData.slice(startIdx);
  }, [fullChartData, zoomCount]);

  const totalPoints = fullChartData.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Forecast Horizon Explorer
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Dedicated out-of-sample forward horizon visualizer with probability prediction intervals
        </p>
      </div>

      {/* Configuration Bar */}
      <div className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition ${
        isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)] font-medium">Model:</span>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className={`border rounded-lg px-2.5 py-1.5 text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="auto">✨ Auto (Best Fit & Highest Accuracy)</option>
              <option value="sarima">SARIMA (Seasonal Multiplicative)</option>
              <option value="holt_winters">Holt-Winters Exponential Smoothing</option>
              <option value="arima">ARIMA(p, d, q)</option>
              <option value="arma">ARMA(p, q)</option>
              <option value="holt">Holt's Linear Trend</option>
              <option value="ses">Simple Exp. Smoothing (SES)</option>
              <option value="ar">AR(p) Autoregressive</option>
              <option value="ma">MA(q) Moving Average</option>
              <option value="linear_trend">Linear Trend Regression</option>
              <option value="naive">Naive Random Walk</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--text-tertiary)] font-medium">Horizon:</span>
            <input
              type="number"
              min="1"
              max="120"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
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
              className={`border rounded-lg px-2.5 py-1.5 text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value={0.90}>90% Interval</option>
              <option value={0.95}>95% Interval</option>
              <option value={0.99}>99% Interval</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateForecast}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Forecasting...' : 'Compute Forecast'}
        </button>
      </div>

      {/* Baseline mathematical explanation alert */}
      {(modelType === 'naive' || modelType === 'ses' || modelType === 'linear_trend' || modelType === 'holt') && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition ${
          isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}>
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Note on {modelType.replace('_', ' ').toUpperCase()}:</strong> By theoretical formulation, this baseline method produces a constant horizontal or straight-slope line. For realistic fluctuating patterns and cyclical seasonality, select <strong>✨ Auto</strong>, <strong>SARIMA</strong>, or <strong>Holt-Winters</strong>.
          </span>
        </div>
      )}

      {/* Auto Model Winner Badge */}
      {fitResult && (fitResult.param_estimates?.chosen_model_label || fitResult.model === 'auto') && (
        <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition ${
          isDark ? 'bg-blue-950/30 border-blue-800/50 text-blue-200' : 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              <strong>Auto Tournament Selected Architecture:</strong>{' '}
              <span className="font-semibold text-blue-600 dark:text-cyan-300">
                {fitResult.param_estimates?.chosen_model_label || fitResult.model.toUpperCase()}
              </span>
            </span>
          </div>
          {fitResult.metrics?.mape !== null && fitResult.metrics?.mape !== undefined && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-semibold text-blue-600 dark:text-cyan-300">
                In-sample MAPE: {fitResult.metrics.mape}%
              </span>
              {fitResult.metrics.aic != null && (
                <span className="bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded text-[var(--text-secondary)]">
                  AIC: {Number(fitResult.metrics.aic).toFixed(1)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Forecast Chart with Time Zoom & Brush */}
      {fitResult && (
        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border transition ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Out-of-Sample Prediction Trajectory
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Forecast horizon: {horizon} steps ahead with {(confidenceLevel * 100).toFixed(0)}% confidence bounds
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <TimeZoomControls
                  onZoomIn={() => setZoomCount(prev => Math.max(14, Math.floor((prev === 0 ? totalPoints : prev) * 0.65)))}
                  onZoomOut={() => setZoomCount(prev => {
                    const next = Math.ceil((prev === 0 ? totalPoints : prev) * 1.5);
                    return next >= totalPoints ? 0 : next;
                  })}
                  onReset={() => setZoomCount(0)}
                  onSelectPreset={(c) => setZoomCount(c === 0 ? 0 : Math.min(c, totalPoints))}
                  currentCount={visibleChartData.length}
                  totalCount={totalPoints}
                />

                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <span className="w-2.5 h-1 bg-blue-500 rounded-full"></span> Historical
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="w-2.5 h-1 bg-rose-500 rounded-full"></span> Forecast
                  </span>
                  <a
                    href={apiService.getForecastCsvUrl(fitResult.analysis_id)}
                    download
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono ml-1 transition ${
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
                <AreaChart data={visibleChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <Line type="monotone" dataKey="forecast" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Brush dataKey="time" height={20} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} tickFormatter={(t) => t.slice(5, 10)} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <ChartExplanation
              title="Understanding the Multi-Step Forecast & Confidence Cone"
              summary="This graph visualizes the projected chronological trajectory into unseen future periods, paired with analytical probability confidence boundaries."
              formula={`Ŷ_{T+h} ± z_{α/2} · σ_h  (${Math.round(confidenceLevel * 100)}% Confidence Interval)`}
              items={[
                {
                  badge: "Blue Curve",
                  badgeColor: "blue",
                  label: "Historical Actuals",
                  text: "Observed ground truth values up to the cutoff origin T, capturing real historical trends and seasonality."
                },
                {
                  badge: "Rose Red Curve",
                  badgeColor: "rose",
                  label: "Future Forecast",
                  text: `Expected conditional mean values for the next ${horizon} time periods (T+1 to T+${horizon}).`
                },
                {
                  badge: "Prediction Cone",
                  badgeColor: "cyan",
                  label: "Confidence Funnel",
                  text: `The ${Math.round(confidenceLevel * 100)}% probability band where the true future path is statistically expected to land.`
                },
                {
                  badge: "Time Zoom Slider",
                  badgeColor: "purple",
                  label: "Zoom Horizon",
                  text: "Use the zoom in/out buttons above or scrub the slider at the bottom to focus on the immediate forecast launch window."
                }
              ]}
              takeaway="The red line represents the most likely central path, but real outcomes can fall anywhere within the shaded cone. Always account for the uncertainty band when making decisions."
            />
          </div>

          {/* Forecast Predictions Table */}
          <div className={`p-5 rounded-2xl border transition ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Predicted Timestamp Values</h2>
            <div className="overflow-x-auto max-h-64 border rounded-xl border-[var(--border-subtle)]">
              <table className="w-full text-left text-xs font-mono">
                <thead className={`sticky top-0 text-[10px] uppercase tracking-wider font-semibold font-sans ${
                  isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  <tr>
                    <th className="p-3">Step</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Forecast Value</th>
                    <th className="p-3">Lower Bound ({confidenceLevel * 100}%)</th>
                    <th className="p-3">Upper Bound ({confidenceLevel * 100}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[11px]">
                  {fitResult.forecast_timestamps.map((t, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="p-3 text-[var(--text-tertiary)]">+{idx + 1}</td>
                      <td className="p-3 text-[var(--text-primary)] font-sans">{t}</td>
                      <td className="p-3 text-blue-600 dark:text-cyan-400 font-bold">{fitResult.forecast[idx]?.toFixed(4)}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{fitResult.lower_interval[idx]?.toFixed(4) ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{fitResult.upper_interval[idx]?.toFixed(4) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
