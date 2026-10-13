import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ModelComparisonResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { Trophy, Play, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

const CANDIDATE_MODELS = [
  { key: 'naive', label: 'Naive Baseline' },
  { key: 'linear_trend', label: 'Linear Trend' },
  { key: 'ses', label: 'SES Exponential' },
  { key: 'holt', label: "Holt's Linear" },
  { key: 'holt_winters', label: 'Holt-Winters' },
  { key: 'ar', label: 'AR(1) Autoregressive' },
  { key: 'ma', label: 'MA(1) Moving Average' },
  { key: 'arma', label: 'ARMA(1, 1)' },
  { key: 'arima', label: 'ARIMA(1, 1, 1)' },
  { key: 'sarima', label: 'SARIMA' }
];

export const ComparisonPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    'naive', 'linear_trend', 'ses', 'holt', 'ar', 'arma', 'arima'
  ]);
  const [testSize, setTestSize] = useState(14);
  const [seasonalPeriod, setSeasonalPeriod] = useState(12);
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleModel = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter(k => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const handleCompare = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.compareModels(
        selectedDataset.id,
        selectedTarget,
        selectedKeys,
        testSize,
        seasonalPeriod
      );
      setComparisonResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const chartData = () => {
    if (!comparisonResult) return [];
    return comparisonResult.test_timestamps.map((t, idx) => {
      const row: Record<string, any> = {
        time: t.slice(0, 10),
        Actual: comparisonResult.actual_test[idx]
      };
      Object.entries(comparisonResult.predictions).forEach(([mKey, preds]) => {
        row[mKey.toUpperCase()] = preds[idx];
      });
      return row;
    });
  };

  const modelColors: Record<string, string> = {
    Actual: chartTheme.actual,
    NAIVE: '#94a3b8',
    LINEAR_TREND: '#10b981',
    SES: '#f59e0b',
    HOLT: '#ec4899',
    HOLT_WINTERS: '#8b5cf6',
    AR: '#06b6d4',
    MA: '#14b8a6',
    ARMA: '#6366f1',
    ARIMA: '#f43f5e',
    SARIMA: '#eab308'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Model Comparison Lab
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Strict chronological out-of-sample held-out benchmarking across ATSA candidate architectures
        </p>
      </div>

      {/* Configuration Panel */}
      <div className={`p-5 rounded-2xl border transition ${
        isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-tertiary)] font-medium">Test Set Size:</span>
              <input
                type="number"
                min="5"
                max="50"
                value={testSize}
                onChange={(e) => setTestSize(Number(e.target.value))}
                className={`w-16 border rounded-lg px-2 py-1 font-mono text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-tertiary)] font-medium">Seasonal Period:</span>
              <input
                type="number"
                min="2"
                max="365"
                value={seasonalPeriod}
                onChange={(e) => setSeasonalPeriod(Number(e.target.value))}
                className={`w-16 border rounded-lg px-2 py-1 font-mono text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || selectedKeys.length === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Evaluating...' : 'Run Benchmark'}
          </button>
        </div>

        {/* Model Chips Selector */}
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <span className="text-xs font-semibold text-[var(--text-primary)] block mb-2">
            Select Models to Train & Benchmark:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {CANDIDATE_MODELS.map(m => {
              const checked = selectedKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModel(m.key)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                    checked
                      ? isDark
                        ? 'bg-blue-950/30 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-xs'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {checked ? <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
          isDark ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Workspace */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Optimal Model Banner */}
          {comparisonResult.best_model && (
            <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
              isDark
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-emerald-50 border-emerald-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    Optimal Architecture
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {comparisonResult.best_model.toUpperCase()} achieved lowest out-of-sample RMSE
                  </h3>
                </div>
              </div>
              <span className="text-xs text-[var(--text-tertiary)] font-mono">
                Evaluated on {comparisonResult.test_size} held-out steps
              </span>
            </div>
          )}

          {/* Actual vs Forecast Overlay */}
          <div className={`p-5 rounded-2xl border transition ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Test Horizon Forecast Comparison</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-4">True unseen test observations versus simultaneous candidate model forecasts</p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Actual" stroke={chartTheme.actual} strokeWidth={3} dot={{ r: 4 }} />
                  {Object.keys(comparisonResult.predictions).map(key => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key.toUpperCase()}
                      stroke={modelColors[key.toUpperCase()] || '#94a3b8'}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <ChartExplanation
              title="How to Evaluate the Test Horizon Comparison"
              summary="This graph visualizes out-of-sample backtesting: every model was trained strictly on historical observations, then asked to forecast the unseen test horizon without data leakage."
              items={[
                {
                  badge: "Solid Blue with Dots",
                  badgeColor: "blue",
                  label: "Actual Ground Truth",
                  text: "The real observed values on the test set that were kept hidden from models during training."
                },
                {
                  badge: "Dashed Colored Curves",
                  badgeColor: "cyan",
                  label: "Candidate Model Forecasts",
                  text: "Out-of-sample forward projections generated by each fitted time-series algorithm."
                },
                {
                  badge: "Turning Point Accuracy",
                  badgeColor: "emerald",
                  label: "Shape Matching",
                  text: "Observe which model anticipates real inflection points and seasonal swings versus projecting a flat line."
                },
                {
                  badge: "Lagging Tendency",
                  badgeColor: "amber",
                  label: "Phase Delay",
                  text: "Naive models often repeat the previous step, resulting in a 1-step lag delay behind the blue actual curve."
                }
              ]}
              takeaway="The winning model is the one whose dashed trajectory hugs the solid blue actual curve most faithfully across the entire test horizon."
            />
          </div>

          {/* Comparison Metrics Table */}
          <div className={`p-5 rounded-2xl border transition ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Model Accuracy Leaderboard (Held-Out Test Set)</h2>
            <div className="overflow-x-auto border rounded-xl border-[var(--border-subtle)]">
              <table className="w-full text-left text-xs">
                <thead className={`text-[10px] uppercase tracking-wider font-semibold ${
                  isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">RMSE</th>
                    <th className="p-3">MAE</th>
                    <th className="p-3">MAPE (%)</th>
                    <th className="p-3">sMAPE (%)</th>
                    <th className="p-3">MASE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                  {comparisonResult.comparison_table.map((row, idx) => {
                    const isBest = idx === 0;
                    return (
                      <tr key={row.model} className={
                        isBest
                          ? isDark ? 'bg-emerald-950/20 font-bold' : 'bg-emerald-50/70 font-bold'
                          : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }>
                        <td className="p-3">
                          {isBest ? (
                            <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>#1 Best</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-sans font-semibold text-[var(--text-primary)]">{row.label}</td>
                        <td className="p-3 text-blue-600 dark:text-cyan-400 font-bold">{row.rmse?.toFixed(4) ?? '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{row.mae?.toFixed(4) ?? '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{row.mape !== null ? `${row.mape}%` : '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{row.smape !== null ? `${row.smape}%` : '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{row.mase?.toFixed(4) ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ChartExplanation
              title="Guide to Error Evaluation Metrics"
              summary="Models on the leaderboard are ranked from best (#1) to worst based on out-of-sample forecast accuracy across multiple error dimensions."
              items={[
                {
                  badge: "RMSE",
                  badgeColor: "cyan",
                  label: "Root Mean Squared Error",
                  text: "√(Σ(Y - Ŷ)² / n). Penalizes large outlier mistakes heavily due to squaring. Best when extreme errors carry severe consequences."
                },
                {
                  badge: "MAE",
                  badgeColor: "blue",
                  label: "Mean Absolute Error",
                  text: "Σ|Y - Ŷ| / n. The average absolute magnitude of forecast errors in original units. Less sensitive to outliers."
                },
                {
                  badge: "MAPE / sMAPE",
                  badgeColor: "amber",
                  label: "Percentage Errors",
                  text: "Measures error as a percentage of actual values. sMAPE bounds errors between 0% and 200% to prevent division issues."
                },
                {
                  badge: "MASE < 1.0",
                  badgeColor: "emerald",
                  label: "Mean Absolute Scaled Error",
                  text: "Scales MAE relative to a naive random walk. If MASE < 1.0, the model beats simple persistence guessing."
                }
              ]}
              takeaway="Look for models with MASE < 1.0 and low RMSE. The #1 ranked model achieves the best overall balance of trajectory tracking and resilience."
            />
          </div>
        </div>
      )}
    </div>
  );
};
