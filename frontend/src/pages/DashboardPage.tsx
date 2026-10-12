import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData } from '../types';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, Calendar, AlertCircle, Database,
  ArrowRight, ShieldCheck, Cpu, GitCompare, BarChart2, Sparkles, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart
} from 'recharts';
import { ChartExplanation } from '../components/common/ChartExplanation';

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

  const chartPoints = (plotData?.timestamps || []).slice(-90).map((t, idx) => {
    const origIdx = (plotData?.timestamps.length || 0) - 90 + idx;
    return {
      time: t.slice(0, 10),
      value: plotData?.values[origIdx],
      rolling: plotData?.rolling_mean[origIdx],
      trend: plotData?.trend_line[origIdx]
    };
  });

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Actions Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 glass-panel border border-white/10 shadow-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Autonomous ATSA Engine
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Analytical Time Series & Forecasting Workbench
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Real-time statistical estimation, unit-root hypothesis testing, decomposition, and model benchmarking on genuine Python statsmodels computations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/datasets"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 shadow-md transition"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Ingest Data / Ticker
            </Link>
            <Link
              to="/model-comparison"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare Models
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Datasets in Library</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-mono">{datasets.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">Benchmarks & Market Feeds</div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Series Observations</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white font-mono">
            {stats?.count ?? selectedDataset?.total_rows ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Target: <span className="text-cyan-300 font-semibold">{selectedTarget || 'None'}</span>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mean & Dispersion</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-white font-mono">
            {stats ? `${stats.mean.toFixed(2)}` : '—'}
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              (±{stats?.std.toFixed(2)})
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            [{stats?.min.toFixed(1)} … {stats?.max.toFixed(1)}]
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-4.5 border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Estimated Drift</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-200 truncate">
            {plotData?.trend_summary?.interpretation || 'Calculating...'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            R² = {plotData?.trend_summary?.r_squared?.toFixed(3) ?? '0.000'}
          </div>
        </div>
      </div>

      {/* Main Trajectory Chart Card */}
      <div className="glass-panel rounded-2xl p-5 border border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500"></span>
              Active Series Trajectory & Moving Dynamics
            </h2>
            <p className="text-xs text-slate-400">
              Observed historical values with 7-period moving average and fitted OLS trend line
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-1 bg-blue-500 rounded-full"></span> Actual Series
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-1 bg-amber-500 rounded-full"></span> Rolling (w=7)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-1 bg-emerald-500 border-dashed rounded-full"></span> Trend
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono">
              Computing statistical series trajectory...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGrad)" dot={false} />
                <Line type="monotone" dataKey="rolling" stroke="#f59e0b" strokeWidth={1.75} dot={false} />
                <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <ChartExplanation
          title="Understanding the Series Trajectory"
          summary="This chart plots chronological observations against smoothed and secular components to help you identify whether the series has long-run trend, periodic cycles, or sudden structural breaks."
          items={[
            {
              badge: "Blue Area",
              badgeColor: "blue",
              label: "Actual Series (Y_t)",
              text: "The observed empirical values recorded at each timestamp. Rapid zigzag spikes represent high-frequency noise or short-term volatility."
            },
            {
              badge: "Amber Line",
              badgeColor: "amber",
              label: "7-Period Moving Average",
              text: "A rolling mean filter that dampens short-term noise to highlight intermediate cyclical momentum and directional swings."
            },
            {
              badge: "Green Dashed",
              badgeColor: "emerald",
              label: "Linear Trend (OLS)",
              text: "Global linear regression (Y_t = β₀ + β₁·t). A steep upward/downward slope indicates deterministic non-stationarity in mean."
            },
            {
              badge: "Divergence",
              badgeColor: "cyan",
              label: "Mean Drift",
              text: "When actual points consistently stray far from horizontal stability, difference transformations (d ≥ 1) or seasonal adjustment may be necessary."
            }
          ]}
          takeaway="If the actual values drift steadily away from a flat horizontal mean line, your series is non-stationary. Explore stationarity tests (ADF/KPSS) and consider differencing before fitting ARMA models."
        />
      </div>

      {/* Model Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/models/arma"
          className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/5 group transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
              ARMA(p, q)
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-800/80 group-hover:bg-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white transition">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
            Autoregressive Moving Average
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Stationary stochastic process modeling with statsmodels state-space exact likelihood estimation.
          </p>
        </Link>

        <Link
          to="/models/arima"
          className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/5 group transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              ARIMA(p, d, q)
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-800/80 group-hover:bg-cyan-600 flex items-center justify-center text-slate-400 group-hover:text-white transition">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
            Integrated ARIMA & Auto-Search
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Handles non-stationary series with order-d differencing and 1-click automated AIC grid search.
          </p>
        </Link>

        <Link
          to="/models/sarima"
          className="glass-panel glass-panel-hover rounded-2xl p-5 border border-white/5 group transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold">
              SARIMA(p,d,q)(P,D,Q)s
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-800/80 group-hover:bg-violet-600 flex items-center justify-center text-slate-400 group-hover:text-white transition">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition">
            Seasonal Multiplicative ARIMA
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Multiplicative seasonal lag structure capturing weekly, monthly, and annual cyclical patterns.
          </p>
        </Link>
      </div>
    </div>
  );
};
