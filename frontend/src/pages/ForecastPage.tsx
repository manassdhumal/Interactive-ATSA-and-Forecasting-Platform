import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { ModelFitResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area
} from 'recharts';
import { Compass, Download, Play, Calendar, Layers } from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const [modelType, setModelType] = useState('sarima');
  const [horizon, setHorizon] = useState(24);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [fitResult, setFitResult] = useState<ModelFitResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateForecast = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);
    try {
      const defaultParams: Record<string, any> = {
        naive: {},
        linear_trend: {},
        ses: { alpha: 'auto' },
        holt: { alpha: 'auto', beta: 'auto' },
        holt_winters: { trend: 'add', seasonal: 'add', period: 12 },
        ar: { p: 1, trend: 'c' },
        ma: { q: 1, trend: 'c' },
        arma: { p: 1, q: 1, trend: 'c' },
        arima: { p: 1, d: 1, q: 1 },
        sarima: { p: 1, d: 0, q: 1, P: 1, D: 0, Q: 1, s: 12 }
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
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Forecast generation failed');
    } finally {
      setLoading(false);
    }
  };

  const chartData = () => {
    if (!fitResult) return [];
    const historical = fitResult.timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: fitResult.actual[idx],
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null
    }));

    const future = fitResult.forecast_timestamps.map((t, idx) => ({
      time: t.slice(0, 10),
      actual: null as number | null,
      forecast: fitResult.forecast[idx],
      lower: fitResult.lower_interval[idx],
      upper: fitResult.upper_interval[idx]
    }));

    if (historical.length > 0 && future.length > 0) {
      const lastHist = historical[historical.length - 1];
      future.unshift({
        time: lastHist.time,
        actual: lastHist.actual,
        forecast: lastHist.actual,
        lower: lastHist.actual,
        upper: lastHist.actual
      });
    }

    return [...historical.slice(-80), ...future];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Forecast Explorer</h1>
        <p className="text-sm text-slate-400">
          Dedicated out-of-sample forward horizon visualizer with prediction confidence intervals
        </p>
      </div>

      {/* Configuration Bar */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Model Architecture:</span>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200"
            >
              <option value="sarima">SARIMA (Seasonal ARIMA)</option>
              <option value="arima">ARIMA(p, d, q)</option>
              <option value="arma">ARMA(p, q)</option>
              <option value="holt_winters">Holt-Winters Exponential Smoothing</option>
              <option value="holt">Holt's Linear Trend</option>
              <option value="ses">Simple Exp. Smoothing (SES)</option>
              <option value="ar">AR(p) Autoregressive</option>
              <option value="ma">MA(q) Moving Average</option>
              <option value="linear_trend">Linear Trend Regression</option>
              <option value="naive">Naive Random Walk</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Forward Horizon (steps):</span>
            <input
              type="number"
              min="1"
              max="120"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Confidence Interval:</span>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value={0.90}>90% Confidence Interval</option>
              <option value={0.95}>95% Confidence Interval</option>
              <option value={0.99}>99% Confidence Interval</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateForecast}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Forecasting...' : 'Compute Forward Forecast'}
        </button>
      </div>

      {/* Forecast Chart */}
      {fitResult && (
        <div className="space-y-6">
          <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Out-of-Sample Prediction Trajectory</h2>
                <p className="text-xs text-slate-400">
                  Forecast horizon: {horizon} steps ahead with {(confidenceLevel * 100).toFixed(0)}% confidence bounds
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-0.5 bg-blue-500 rounded"></span> Historical
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-0.5 bg-rose-500 rounded"></span> Forecast
                </span>
                <a
                  href={apiService.getForecastCsvUrl(fitResult.analysis_id)}
                  download
                  className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Forecast CSV
                </a>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#38bdf8" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#38bdf8" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Predictions Table */}
          <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-3">Predicted Timestamp Values</h2>
            <div className="overflow-x-auto max-h-64 border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 font-sans">
                  <tr>
                    <th className="p-3">Step</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Predicted Value</th>
                    <th className="p-3">Lower Bound ({confidenceLevel * 100}%)</th>
                    <th className="p-3">Upper Bound ({confidenceLevel * 100}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {fitResult.forecast_timestamps.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400">+{idx + 1}</td>
                      <td className="p-3 text-white">{t}</td>
                      <td className="p-3 text-cyan-400 font-bold">{fitResult.forecast[idx]?.toFixed(4)}</td>
                      <td className="p-3 text-slate-300">{fitResult.lower_interval[idx]?.toFixed(4) ?? '—'}</td>
                      <td className="p-3 text-slate-300">{fitResult.upper_interval[idx]?.toFixed(4) ?? '—'}</td>
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
