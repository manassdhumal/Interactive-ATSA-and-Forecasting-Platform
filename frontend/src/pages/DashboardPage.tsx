import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData } from '../types';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, Calendar, AlertCircle, Database,
  ArrowRight, ShieldCheck, Cpu, GitCompare, BarChart2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { selectedDataset, selectedTarget, datasets } = useApp();
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [plotData, setPlotData] = useState<RollingTrendData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDataset && selectedTarget) {
      setLoading(true);
      Promise.all([
        apiService.getStats(selectedDataset.id, selectedTarget),
        apiService.getPlot(selectedDataset.id, selectedTarget, 7)
      ])
        .then(([statsRes, plotRes]) => {
          setStats(statsRes);
          setPlotData(plotRes);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedDataset, selectedTarget]);

  const chartPoints = (plotData?.timestamps || []).slice(-80).map((t, idx) => {
    const origIdx = (plotData?.timestamps.length || 0) - 80 + idx;
    return {
      time: t.slice(0, 10),
      value: plotData?.values[origIdx],
      rolling: plotData?.rolling_mean[origIdx],
      trend: plotData?.trend_line[origIdx]
    };
  });

  return (
    <div className="space-y-6">
      {/* Title & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Overview</h1>
          <p className="text-sm text-slate-400">
            Real-time ATSA statistical workbench & forecasting pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/datasets"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Upload Dataset
          </Link>
          <Link
            to="/model-comparison"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 transition"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare Models
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Loaded Datasets</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{datasets.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">5 built-in synthetic ATSA benchmarks</div>
        </div>

        <div className="bg-[#101728] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Observations in Series</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {stats?.count ?? selectedDataset?.total_rows ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Target: <span className="text-slate-300 font-medium">{selectedTarget || 'None'}</span>
          </div>
        </div>

        <div className="bg-[#101728] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mean & Std. Dev</span>
            <BarChart2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono">
            {stats ? `${stats.mean.toFixed(2)}` : '—'}
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              (±{stats?.std.toFixed(2)})
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Min: {stats?.min.toFixed(1)} / Max: {stats?.max.toFixed(1)}
          </div>
        </div>

        <div className="bg-[#101728] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Trend Trajectory</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-200">
            {plotData?.trend_summary?.interpretation || 'Calculating...'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            R² = {plotData?.trend_summary?.r_squared?.toFixed(3) ?? '0.000'}
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Active Series Trajectory</h2>
            <p className="text-xs text-slate-400">
              Observed historical values with 7-period rolling mean and linear trend line
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-0.5 bg-blue-500 rounded"></span> Actual
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-500 rounded"></span> Rolling (w=7)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-500 border-dashed rounded"></span> Trend
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Calculating statistical series...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rolling" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/models/arma"
          className="group bg-[#101728] border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ARMA(p, q)
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-semibold text-white">Autoregressive Moving Average</h3>
          <p className="text-xs text-slate-400 mt-1">
            Stationary stochastic process modeling with statsmodels state-space exact likelihood estimation.
          </p>
        </Link>

        <Link
          to="/models/arima"
          className="group bg-[#101728] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              ARIMA(p, d, q)
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-semibold text-white">Autoregressive Integrated MA</h3>
          <p className="text-xs text-slate-400 mt-1">
            Handles non-stationary series with order-d differencing and confidence interval forecasting.
          </p>
        </Link>

        <Link
          to="/models/sarima"
          className="group bg-[#101728] border border-slate-800 hover:border-violet-500/50 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
              SARIMA(p,d,q)(P,D,Q)s
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-400 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-semibold text-white">Seasonal ARIMA</h3>
          <p className="text-xs text-slate-400 mt-1">
            Multiplicative seasonal lag structure for annual, weekly, and monthly cyclical patterns.
          </p>
        </Link>
      </div>
    </div>
  );
};
