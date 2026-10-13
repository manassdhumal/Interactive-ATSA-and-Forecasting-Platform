import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData } from '../types';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, Database, ArrowRight,
  GitCompare, BarChart2, Sparkles
} from 'lucide-react';
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, Brush
} from 'recharts';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { TimeZoomControls } from '../components/common/TimeZoomControls';

export const DashboardPage: React.FC = () => {
  const { selectedDataset, selectedTarget, datasets } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [plotData, setPlotData] = useState<RollingTrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomCount, setZoomCount] = useState<number>(90);

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
          // Default zoom to 90 or all observations if fewer
          const total = plotRes?.timestamps?.length || 90;
          setZoomCount(Math.min(90, total));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedDataset, selectedTarget]);

  const totalPoints = plotData?.timestamps?.length || 0;

  const chartPoints = useMemo(() => {
    if (!plotData || !plotData.timestamps) return [];
    const timestamps = plotData.timestamps;
    const count = zoomCount === 0 || zoomCount >= timestamps.length ? timestamps.length : zoomCount;
    const startIdx = Math.max(0, timestamps.length - count);

    return timestamps.slice(startIdx).map((t, idx) => {
      const origIdx = startIdx + idx;
      return {
        time: t.slice(0, 10),
        value: plotData.values[origIdx],
        rolling: plotData.rolling_mean[origIdx],
        trend: plotData.trend_line[origIdx]
      };
    });
  }, [plotData, zoomCount]);

  const handleZoomIn = () => {
    const current = zoomCount === 0 ? totalPoints : zoomCount;
    const next = Math.max(14, Math.floor(current * 0.65));
    setZoomCount(next);
  };

  const handleZoomOut = () => {
    const current = zoomCount === 0 ? totalPoints : zoomCount;
    const next = Math.min(totalPoints, Math.ceil(current * 1.5));
    setZoomCount(next >= totalPoints ? 0 : next);
  };

  const handleResetZoom = () => {
    setZoomCount(0);
  };

  const handleSelectPreset = (count: number) => {
    setZoomCount(count === 0 ? 0 : Math.min(count, totalPoints));
  };

  return (
    <div className="space-y-6">
      {/* Minimalist Top Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark
          ? 'bg-slate-900/60 border-slate-800/80 shadow-md'
          : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider flex items-center gap-1 ${
                isDark
                  ? 'bg-blue-500/10 text-cyan-300 border border-blue-500/20'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <Sparkles className="w-3 h-3 text-blue-500" />
                ATSA Statistical Engine
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Time Series Analysis & Forecasting Workbench
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
              Real-time statistical estimation, unit-root hypothesis testing, classical decomposition, and out-of-sample model evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/datasets"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              Manage Data
            </Link>
            <Link
              to="/model-comparison"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare Models
            </Link>
          </div>
        </div>
      </div>

      {/* Clean KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] text-xs font-medium">
            <span>Datasets in Hub</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">{datasets.length}</div>
          <div className="mt-1 text-[11px] text-[var(--text-tertiary)] truncate">Library & benchmarks</div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] text-xs font-medium">
            <span>Series Observations</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">
            {stats?.count ?? selectedDataset?.total_rows ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-tertiary)] truncate">
            Target: <span className="font-semibold text-blue-600 dark:text-cyan-400">{selectedTarget || 'None'}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] text-xs font-medium">
            <span>Mean & Dispersion</span>
            <BarChart2 className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-[var(--text-primary)]">
            {stats ? stats.mean.toFixed(2) : '—'}
            <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1">
              (±{stats?.std.toFixed(2)})
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-[var(--text-tertiary)] truncate">
            [{stats?.min.toFixed(1)} … {stats?.max.toFixed(1)}]
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] text-xs font-medium">
            <span>Estimated Trend</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-semibold truncate text-[var(--text-primary)]">
            {plotData?.trend_summary?.interpretation || 'Computing...'}
          </div>
          <div className="mt-1 text-[11px] font-mono text-[var(--text-tertiary)]">
            R² = {plotData?.trend_summary?.r_squared?.toFixed(3) ?? '0.000'}
          </div>
        </div>
      </div>

      {/* Main Trajectory Chart Card with Time Zoom Controls & Brush */}
      <div className={`p-5 rounded-2xl border transition ${
        isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Active Series Trajectory & Moving Dynamics
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Historical observations with 7-period moving average and fitted OLS trend line
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TimeZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              onSelectPreset={handleSelectPreset}
              currentCount={chartPoints.length}
              totalCount={totalPoints}
            />

            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-1 bg-blue-500 rounded-full"></span> Actual
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-1 bg-amber-500 rounded-full"></span> Rolling
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-1 bg-emerald-500 border-dashed rounded-full"></span> Trend
              </span>
            </div>
          </div>
        </div>

        <div className="h-76 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] text-xs font-mono">
              Computing trajectory...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.actual} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartTheme.actual} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
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
                <Area type="monotone" dataKey="value" stroke={chartTheme.actual} strokeWidth={2} fillOpacity={1} fill="url(#actualGrad)" dot={false} />
                <Line type="monotone" dataKey="rolling" stroke={chartTheme.rolling} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="trend" stroke={chartTheme.trend} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Brush
                  dataKey="time"
                  height={22}
                  stroke={chartTheme.brushStroke}
                  fill={chartTheme.brushFill}
                  tickFormatter={(t) => t.slice(5, 10)}
                />
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
              badge: "Time Zoom Bar",
              badgeColor: "cyan",
              label: "Interactive Timeline Zoom",
              text: "Drag the slider handles at the bottom of the chart or use the (+ / - / Presets) buttons above to zoom into specific time intervals."
            }
          ]}
          takeaway="If the actual values drift steadily away from a flat horizontal mean line, your series is non-stationary. Explore stationarity tests (ADF/KPSS) and consider differencing before fitting ARMA models."
        />
      </div>

      {/* Model Quick Access Cards (Minimalist 3-col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/models/arma"
          className={`p-4.5 rounded-xl border transition group ${
            isDark
              ? 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
              : 'bg-white hover:border-blue-300 border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
              ARMA(p, q)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
          </div>
          <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition">
            Autoregressive Moving Average
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Stationary stochastic process modeling with statsmodels exact likelihood estimation.
          </p>
        </Link>

        <Link
          to="/models/arima"
          className={`p-4.5 rounded-xl border transition group ${
            isDark
              ? 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
              : 'bg-white hover:border-cyan-300 border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
              ARIMA(p, d, q)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-cyan-500 group-hover:translate-x-0.5 transition" />
          </div>
          <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-600 transition">
            Integrated ARIMA & Auto-Search
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Accommodates non-stationary series with order-d differencing and 1-click AIC grid search.
          </p>
        </Link>

        <Link
          to="/models/sarima"
          className={`p-4.5 rounded-xl border transition group ${
            isDark
              ? 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800'
              : 'bg-white hover:border-violet-300 border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
              SARIMA(p,d,q)(P,D,Q)s
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-violet-500 group-hover:translate-x-0.5 transition" />
          </div>
          <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-violet-600 transition">
            Seasonal Multiplicative ARIMA
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Captures periodic weekly, monthly, and annual recurrence in seasonality.
          </p>
        </Link>
      </div>
    </div>
  );
};
