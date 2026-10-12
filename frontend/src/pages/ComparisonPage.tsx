import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { ModelComparisonResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import { GitCompare, Trophy, Play, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

const CANDIDATE_MODELS = [
  { key: 'naive', label: 'Naive Baseline' },
  { key: 'linear_trend', label: 'Linear Trend' },
  { key: 'ses', label: 'Simple Exp. Smoothing (SES)' },
  { key: 'holt', label: "Holt's Linear Trend" },
  { key: 'holt_winters', label: 'Holt-Winters' },
  { key: 'ar', label: 'AR(1) Autoregressive' },
  { key: 'ma', label: 'MA(1) Moving Average' },
  { key: 'arma', label: 'ARMA(1, 1)' },
  { key: 'arima', label: 'ARIMA(1, 1, 1)' },
  { key: 'sarima', label: 'SARIMA' }
];

export const ComparisonPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
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
    Actual: '#3b82f6',
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
        <h1 className="text-2xl font-bold tracking-tight text-white">Model Comparison Lab</h1>
        <p className="text-sm text-slate-400">
          Strict chronological train/test out-of-sample benchmarking across ATSA models
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Test Set Size (observations):</span>
              <input
                type="number"
                min="5"
                max="50"
                value={testSize}
                onChange={(e) => setTestSize(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Seasonal Period:</span>
              <input
                type="number"
                min="2"
                max="365"
                value={seasonalPeriod}
                onChange={(e) => setSeasonalPeriod(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || selectedKeys.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Evaluating Models...' : 'Run Out-of-Sample Benchmark'}
          </button>
        </div>

        {/* Model Checkbox Selector */}
        <div className="pt-3 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-300 block mb-2">Select Candidate Models to Train & Benchmark:</span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {CANDIDATE_MODELS.map(m => {
              const checked = selectedKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModel(m.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                    checked
                      ? 'bg-blue-950/30 border-blue-500/50 text-blue-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {checked ? <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Workspace */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Best Model Banner */}
          {comparisonResult.best_model && (
            <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-blue-950/30 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-400">
                    Optimal Held-Out Model
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {comparisonResult.best_model.toUpperCase()} achieved lowest out-of-sample RMSE
                  </h3>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Evaluated on {comparisonResult.test_size} out-of-sample points
              </span>
            </div>
          )}

          {/* Actual vs Forecast Overlay */}
          <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-1">Test Horizon Forecast Comparison</h2>
            <p className="text-xs text-slate-400 mb-4">True unseen test observations versus simultaneous candidate model forecasts</p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
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
              summary="This graph visualizes out-of-sample backtesting: every model was trained strictly on the historical training segment, then asked to forecast the unseen test horizon without data leakage."
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
                  text: "Observe which model anticipates real inflection points and seasonal swings versus projecting a flat horizontal mean line."
                },
                {
                  badge: "Lagging Tendency",
                  badgeColor: "amber",
                  label: "Phase Delay",
                  text: "Naive models often simply repeat the previous step, resulting in a 1-step lag delay behind the blue actual curve."
                }
              ]}
              takeaway="The winning model is the one whose dashed trajectory hugs the solid blue actual curve most faithfully across the entire test horizon."
            />
          </div>

          {/* Comparison Metrics Table */}
          <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-3">Model Accuracy Leaderboard (Held-Out Test Set)</h2>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
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
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {comparisonResult.comparison_table.map((row, idx) => {
                    const isBest = idx === 0;
                    return (
                      <tr key={row.model} className={isBest ? 'bg-emerald-950/20' : 'hover:bg-slate-800/30'}>
                        <td className="p-3 text-slate-400">
                          {isBest ? <span className="text-emerald-400 font-bold">#1 Best</span> : `#${idx + 1}`}
                        </td>
                        <td className="p-3 font-bold text-white">{row.label}</td>
                        <td className="p-3 text-cyan-400 font-bold">{row.rmse?.toFixed(4) ?? '—'}</td>
                        <td className="p-3 text-slate-300">{row.mae?.toFixed(4) ?? '—'}</td>
                        <td className="p-3 text-slate-300">{row.mape !== null ? `${row.mape}%` : '—'}</td>
                        <td className="p-3 text-slate-300">{row.smape !== null ? `${row.smape}%` : '—'}</td>
                        <td className="p-3 text-slate-300">{row.mase?.toFixed(4) ?? '—'}</td>
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
                  text: "Σ|Y - Ŷ| / n. The average absolute magnitude of forecast errors in the original measurement units. Less sensitive to outliers."
                },
                {
                  badge: "MAPE / sMAPE",
                  badgeColor: "amber",
                  label: "Percentage Errors",
                  text: "Measures error as a percentage of actual values. sMAPE (Symmetric MAPE) bounds errors between 0% and 200% to prevent infinite division issues."
                },
                {
                  badge: "MASE < 1.0",
                  badgeColor: "emerald",
                  label: "Mean Absolute Scaled Error",
                  text: "Scales MAE relative to a naive random walk. If MASE < 1.0, the model is proven to beat simple persistence guessing. If MASE > 1.0, a simple naive guess would have been better!"
                }
              ]}
              takeaway="Look for models with MASE < 1.0 and low RMSE. The #1 ranked model achieves the best overall balance of trajectory tracking and outlier resilience."
            />
          </div>
        </div>
      )}
    </div>
  );
};
