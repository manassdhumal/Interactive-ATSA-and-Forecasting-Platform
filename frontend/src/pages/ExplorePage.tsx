import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData, DecompositionData, ACFPACFResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ScatterChart, Scatter, Brush, BarChart, Bar, ReferenceLine
} from 'recharts';
import { Layers, TrendingUp, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { TimeZoomControls } from '../components/common/TimeZoomControls';

export const ExplorePage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'decomp' | 'rolling' | 'acfpacf' | 'lags'>('decomp');
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [rollingData, setRollingData] = useState<RollingTrendData | null>(null);
  const [decompData, setDecompData] = useState<DecompositionData | null>(null);
  const [acfPacfResult, setAcfPacfResult] = useState<ACFPACFResult | null>(null);
  const [lagsData, setLagsData] = useState<Record<string, { x: number; y: number }[]> | null>(null);
  const [rollingWindow, setRollingWindow] = useState(7);
  const [decompPeriod, setDecompPeriod] = useState(12);
  const [decompModel, setDecompModel] = useState<'additive' | 'multiplicative' | 'stl'>('additive');
  const [maxAcfLags, setMaxAcfLags] = useState(24);
  const [loading, setLoading] = useState(false);
  const [zoomCount, setZoomCount] = useState<number>(0);

  useEffect(() => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);

    Promise.all([
      apiService.getStats(selectedDataset.id, selectedTarget),
      apiService.getPlot(selectedDataset.id, selectedTarget, rollingWindow),
      apiService.getDecomposition(selectedDataset.id, selectedTarget, decompModel, decompPeriod).catch(() => null),
      apiService.getAcfPacf(selectedDataset.id, selectedTarget, maxAcfLags).catch(() => null),
      apiService.getLags(selectedDataset.id, selectedTarget, [1, 2, 7])
    ])
      .then(([sRes, rRes, dRes, apRes, lRes]) => {
        setStats(sRes);
        setRollingData(rRes);
        setDecompData(dRes);
        setAcfPacfResult(apRes);
        setLagsData(lRes.lags);
        const total = rRes?.timestamps?.length || 0;
        setZoomCount(total > 120 ? 120 : total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDataset, selectedTarget, rollingWindow, decompPeriod, decompModel, maxAcfLags]);

  const totalPoints = rollingData?.timestamps?.length || decompData?.timestamps?.length || 0;

  const seriesPoints = useMemo(() => {
    if (!rollingData || !rollingData.timestamps) return [];
    const timestamps = rollingData.timestamps;
    const count = zoomCount === 0 || zoomCount >= timestamps.length ? timestamps.length : zoomCount;
    const startIdx = Math.max(0, timestamps.length - count);

    return timestamps.slice(startIdx).map((t, idx) => {
      const origIdx = startIdx + idx;
      return {
        time: t.slice(0, 10),
        actual: rollingData.values[origIdx],
        rolling: rollingData.rolling_mean[origIdx],
        std: rollingData.rolling_std[origIdx]
      };
    });
  }, [rollingData, zoomCount]);

  const decompPoints = useMemo(() => {
    if (!decompData || !decompData.timestamps) return [];
    const timestamps = decompData.timestamps;
    const count = zoomCount === 0 || zoomCount >= timestamps.length ? timestamps.length : zoomCount;
    const startIdx = Math.max(0, timestamps.length - count);

    return timestamps.slice(startIdx).map((t, idx) => {
      const origIdx = startIdx + idx;
      return {
        time: t.slice(0, 10),
        observed: decompData.observed[origIdx],
        trend: decompData.trend[origIdx],
        seasonal: decompData.seasonal[origIdx],
        residual: decompData.residual[origIdx]
      };
    });
  }, [decompData, zoomCount]);

  const acfPoints = useMemo(() => {
    return (acfPacfResult?.lags || []).map((lag, i) => ({
      lag: `L${lag}`,
      val: acfPacfResult?.acf[i]
    }));
  }, [acfPacfResult]);

  const pacfPoints = useMemo(() => {
    return (acfPacfResult?.lags || []).map((lag, i) => ({
      lag: `L${lag}`,
      val: acfPacfResult?.pacf[i]
    }));
  }, [acfPacfResult]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Exploratory Time Series Analysis
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Statistical moments, classical decomposition, rolling dispersion, correlograms (ACF/PACF), and lag phase dynamics
          </p>
        </div>

        {/* Minimalist Tab Navigation */}
        <div className={`flex flex-wrap items-center p-1 rounded-xl border text-xs font-medium self-start ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('decomp')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'decomp'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Decomposition
          </button>
          <button
            onClick={() => setActiveTab('rolling')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'rolling'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Rolling Dynamics
          </button>
          <button
            onClick={() => setActiveTab('acfpacf')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'acfpacf'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            ACF & PACF
          </button>
          <button
            onClick={() => setActiveTab('lags')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'lags'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Lag Phase Plots
          </button>
        </div>
      </div>

      {/* Summary Statistical Moments Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Observations</span>
            <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">{stats.count}</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Mean</span>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">{stats.mean.toFixed(2)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Median</span>
            <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">{stats.median.toFixed(2)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Std Dev</span>
            <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">{stats.std.toFixed(2)}</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Skewness</span>
            <div className="text-base font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{stats.skewness?.toFixed(2) ?? '—'}</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)]">Kurtosis</span>
            <div className="text-base font-bold text-violet-600 dark:text-violet-400 font-mono mt-0.5">{stats.kurtosis?.toFixed(2) ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Tab 1: Classical & STL Decomposition */}
      {activeTab === 'decomp' && (
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                Time Series Decomposition (Observed = Trend + Seasonal + Residual)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Separates underlying secular trend, cyclical periodicity, and irregular innovations
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TimeZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetZoom}
                onSelectPreset={handleSelectPreset}
                currentCount={decompPoints.length}
                totalCount={totalPoints}
              />

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={decompModel}
                  onChange={(e) => setDecompModel(e.target.value as any)}
                  className={`border rounded-lg px-2 py-1 text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="additive">Additive (Y = T + S + R)</option>
                  <option value="multiplicative">Multiplicative (Y = T × S × R)</option>
                </select>
                <input
                  type="number"
                  min="2"
                  max="365"
                  value={decompPeriod}
                  onChange={(e) => setDecompPeriod(Number(e.target.value))}
                  title="Seasonal Period (s)"
                  className={`w-14 border rounded-lg px-2 py-1 font-mono text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {loading || !decompData ? (
            <div className="py-16 text-center text-xs text-[var(--text-tertiary)] font-mono">
              Estimating decomposition components...
            </div>
          ) : (
            <div className="space-y-4">
              {/* 4-Panel Subplots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">1. Observed Series</span>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={decompPoints} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="observed" stroke={chartTheme.actual} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">2. Smoothed Trend</span>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={decompPoints} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="trend" stroke={chartTheme.trend} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">3. Seasonal Pattern</span>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={decompPoints} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="seasonal" stroke={chartTheme.rolling} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">4. Irregular Residual</span>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={decompPoints} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="residual" stroke="#8b5cf6" strokeWidth={1} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <ChartExplanation
                title="Decomposition Mechanics & Mathematical Formulations"
                summary="Time series decomposition partitions raw data into distinct deterministic and stochastic components to guide whether you need trend detrending, seasonal adjustment, or Holt-Winters/SARIMA models."
                items={[
                  {
                    badge: "Additive Model",
                    badgeColor: "blue",
                    label: "Constant Amplitude",
                    text: "Used when seasonal fluctuations remain constant in size regardless of the overall series level (Y = T + S + R)."
                  },
                  {
                    badge: "Multiplicative",
                    badgeColor: "amber",
                    label: "Proportional Amplitude",
                    text: "Used when seasonal swings grow proportionally larger as the series trends upward (Y = T × S × R)."
                  },
                  {
                    badge: "Time Zooming",
                    badgeColor: "cyan",
                    label: "Cycle Zoom",
                    text: "Use the zoom in/out buttons above to narrow in on specific years or quarters across all 4 subplots simultaneously."
                  },
                  {
                    badge: "Residuals (R_t)",
                    badgeColor: "purple",
                    label: "White Noise Check",
                    text: "If residuals look like random noise around zero, the decomposition successfully extracted all systematic structure."
                  }
                ]}
                takeaway="Examine the residuals: If systematic cycles remain in the residual plot, increase or calibrate the seasonal period 's'."
                formula="Additive: Y_t = T_t + S_t + R_t  |  Multiplicative: Y_t = T_t · S_t · R_t"
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Rolling Statistics */}
      {activeTab === 'rolling' && (
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Rolling Mean & Volatility Dynamics
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Moving window statistics detecting local mean shifts and time-varying heteroskedasticity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TimeZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetZoom}
                onSelectPreset={handleSelectPreset}
                currentCount={seriesPoints.length}
                totalCount={totalPoints}
              />

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-tertiary)]">Window (w):</span>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={rollingWindow}
                  onChange={(e) => setRollingWindow(Number(e.target.value))}
                  className={`w-14 border rounded-lg px-2 py-1 font-mono text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="h-76 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 10 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '10px', fontSize: '11px', boxShadow: chartTheme.tooltipShadow }} />
                <Line type="monotone" dataKey="actual" stroke={chartTheme.actual} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="rolling" stroke={chartTheme.rolling} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="std" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                <Brush
                  dataKey="time"
                  height={22}
                  stroke={chartTheme.brushStroke}
                  fill={chartTheme.brushFill}
                  tickFormatter={(t) => t.slice(5, 10)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ChartExplanation
            title="Detecting Non-Stationarity via Rolling Dynamics"
            summary="For a series to be covariance-stationary, its mean and variance must remain constant over time. Rolling statistics provide direct visual verification."
            items={[
              {
                badge: "Blue Line",
                badgeColor: "blue",
                label: "Raw Observations",
                text: "The underlying high-frequency series."
              },
              {
                badge: "Amber Line",
                badgeColor: "amber",
                label: "Rolling Mean (μ_w)",
                text: "If this line wanders upward or downward rather than oscillating around a horizontal axis, the mean is non-stationary."
              },
              {
                badge: "Purple Dashed",
                badgeColor: "purple",
                label: "Rolling Std Dev (σ_w)",
                text: "If standard deviation fluctuates substantially across time, the process is heteroskedastic."
              },
              {
                badge: "Time Brush",
                badgeColor: "cyan",
                label: "Timeline Slider",
                text: "Use the bottom slider or zoom buttons above to inspect local segments and volatility spikes."
              }
            ]}
            takeaway="Stationary series have flat rolling means and constant standard deviation bounds across the entire timeline."
          />
        </div>
      )}

      {/* Tab 3: Dedicated ACF & PACF Correlograms */}
      {activeTab === 'acfpacf' && (
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Autocorrelation (ACF) & Partial Autocorrelation (PACF)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Evaluates lag memory, autoregressive AR(p) order, and moving-average MA(q) innovation cutoffs
              </p>
            </div>

            {/* Lag Zoom Buttons */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center rounded-lg border p-0.5 ${
                isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setMaxAcfLags((prev) => Math.max(8, Math.floor(prev * 0.7)))}
                  title="Zoom In (fewer lags)"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setMaxAcfLags((prev) => Math.min(60, Math.ceil(prev * 1.4)))}
                  title="Zoom Out (more lags)"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setMaxAcfLags(24)}
                  title="Reset to 24 lags"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {[12, 24, 36, 48].map((l) => (
                  <button
                    key={l}
                    onClick={() => setMaxAcfLags(l)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                      maxAcfLags === l
                        ? isDark ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-white border-blue-300 text-blue-700 font-bold shadow-2xs'
                        : isDark ? 'border-slate-800 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l}L
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACF Chart Card with Brush */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  ACF — Autocorrelation Function
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  95% Bartlett: ±{acfPacfResult?.ci_bound?.toFixed(3) ?? '0.196'}
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acfPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="lag" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                    <YAxis stroke={chartTheme.axis} domain={[-1, 1]} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                    <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
                    <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Bar dataKey="val" fill={chartTheme.forecast} />
                    <Brush dataKey="lag" height={18} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PACF Chart Card with Brush */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  PACF — Partial Autocorrelation Function
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  AR(p) Order Identification
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pacfPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="lag" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                    <YAxis stroke={chartTheme.axis} domain={[-1, 1]} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                    <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
                    <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Bar dataKey="val" fill={chartTheme.actual} />
                    <Brush dataKey="lag" height={18} stroke={chartTheme.brushStroke} fill={chartTheme.brushFill} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <ChartExplanation
            title="How to Identify ATSA Models via Correlograms"
            summary="Autocorrelation (ACF) measures linear association with past lags. Partial Autocorrelation (PACF) isolates the net correlation after removing the linear influence of intermediate periods."
            items={[
              {
                badge: "AR(p)",
                badgeColor: "blue",
                label: "Autoregressive Process",
                text: "PACF cuts off sharply after lag p, while ACF decays gradually as an exponential wave."
              },
              {
                badge: "MA(q)",
                badgeColor: "cyan",
                label: "Moving Average Process",
                text: "ACF cuts off sharply after lag q, while PACF decays smoothly towards zero."
              },
              {
                badge: "ARMA(p, q)",
                badgeColor: "purple",
                label: "Combined Structure",
                text: "Both ACF and PACF decay smoothly without immediate hard cutoffs."
              },
              {
                badge: "Amber Bounds",
                badgeColor: "amber",
                label: "Bartlett Significance",
                text: "Spikes poking beyond the dashed lines (±1.96 / √N) are statistically significant at the 5% level."
              }
            ]}
            takeaway="Count the significant spikes in the PACF to select the AR order p, and the spikes in ACF to select the MA order q."
            formula="ρ_k = Cov(Y_t, Y_{t-k}) / Var(Y_t) \quad | \quad Bounds: \pm 1.96 / \sqrt{N}"
          />
        </div>
      )}

      {/* Tab 4: Lag Phase Space Analysis */}
      {activeTab === 'lags' && (
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Lag Phase Space Scatter Plots (Y_t vs Y_{'{t-k}'})
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Visualizes autoregressive correlation and serial dependence across discrete time shifts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['1', '2', '7'].map((lagKey) => {
              const points = lagsData?.[lagKey] || [];
              return (
                <div key={lagKey} className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Lag k = {lagKey} ({lagKey === '1' ? 'Immediate predecessor' : lagKey === '7' ? 'Weekly cycle' : 'Secondary lag'})
                  </span>
                  <div className="h-52 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis type="number" dataKey="x" name={`Y_{t-${lagKey}}`} stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <YAxis type="number" dataKey="y" name="Y_t" stroke={chartTheme.axis} tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '8px', fontSize: '10px' }} />
                        <Scatter data={points} fill={chartTheme.actual} opacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>

          <ChartExplanation
            title="Interpreting Phase Space Geometry"
            summary="Phase scatter plots map observations against their predecessors. The tighter and narrower the cluster along the 45-degree diagonal, the stronger the serial dependence."
            items={[
              {
                badge: "Tight Diagonal",
                badgeColor: "emerald",
                label: "High Autocorrelation",
                text: "Points clustered tightly along a 45° angle indicate strong positive autoregression (e.g. AR(1) with high φ)."
              },
              {
                badge: "Spherical Cloud",
                badgeColor: "blue",
                label: "White Noise",
                text: "A dispersed circular cloud indicates zero serial correlation; past values provide zero predictive power."
              }
            ]}
            takeaway="A narrow oval cluster at lag 1 confirms the rationale for fitting an Autoregressive AR(1) model."
          />
        </div>
      )}
    </div>
  );
};
