import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData, DecompositionData } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ScatterChart, Scatter
} from 'recharts';
import { Layers, Activity, Sliders, TrendingUp } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

export const ExplorePage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'decomp' | 'rolling' | 'lags'>('decomp');
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [rollingData, setRollingData] = useState<RollingTrendData | null>(null);
  const [decompData, setDecompData] = useState<DecompositionData | null>(null);
  const [lagsData, setLagsData] = useState<Record<string, { x: number; y: number }[]> | null>(null);
  const [rollingWindow, setRollingWindow] = useState(7);
  const [decompPeriod, setDecompPeriod] = useState(12);
  const [decompModel, setDecompModel] = useState<'additive' | 'multiplicative' | 'stl'>('additive');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);

    Promise.all([
      apiService.getStats(selectedDataset.id, selectedTarget),
      apiService.getPlot(selectedDataset.id, selectedTarget, rollingWindow),
      apiService.getDecomposition(selectedDataset.id, selectedTarget, decompModel, decompPeriod).catch(() => null),
      apiService.getLags(selectedDataset.id, selectedTarget, [1, 2, 7])
    ])
      .then(([sRes, rRes, dRes, lRes]) => {
        setStats(sRes);
        setRollingData(rRes);
        setDecompData(dRes);
        setLagsData(lRes.lags);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDataset, selectedTarget, rollingWindow, decompPeriod, decompModel]);

  const seriesPoints = (rollingData?.timestamps || []).map((t, i) => ({
    time: t.slice(0, 10),
    actual: rollingData?.values[i],
    rolling: rollingData?.rolling_mean[i],
    std: rollingData?.rolling_std[i]
  }));

  const decompPoints = (decompData?.timestamps || []).map((t, i) => ({
    time: t.slice(0, 10),
    observed: decompData?.observed[i],
    trend: decompData?.trend[i],
    seasonal: decompData?.seasonal[i],
    residual: decompData?.residual[i]
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Exploratory Time Series Analysis
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Statistical moments, classical decomposition, rolling dispersion, and lag phase dynamics
          </p>
        </div>

        {/* Minimalist Tab Navigation */}
        <div className={`flex items-center p-1 rounded-xl border text-xs font-medium self-start ${
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
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-tertiary)]">Model:</span>
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
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-tertiary)]">Period:</span>
                <input
                  type="number"
                  min="2"
                  max="365"
                  value={decompPeriod}
                  onChange={(e) => setDecompPeriod(Number(e.target.value))}
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
                    badge: "Trend (T_t)",
                    badgeColor: "emerald",
                    label: "Long-run Trajectory",
                    text: "Estimated using centered moving averages. Isolates secular secular shifts."
                  },
                  {
                    badge: "Residuals (R_t)",
                    badgeColor: "purple",
                    label: "White Noise Check",
                    text: "If residuals look like random noise around zero, the decomposition successfully extracted all systematic structure."
                  }
                ]}
                takeaway="Examine the residuals: If systematic cycles remain in the residual plot, increase or calibrate the seasonal period 's'."
                formula="Additive: Y_t = T_t + S_t + R_t \quad | \quad Multiplicative: Y_t = T_t \cdot S_t \cdot R_t"
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

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="time" stroke={chartTheme.axis} tick={{ fontSize: 10 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.tooltipText, borderRadius: '10px', fontSize: '11px', boxShadow: chartTheme.tooltipShadow }} />
                <Line type="monotone" dataKey="actual" stroke={chartTheme.actual} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="rolling" stroke={chartTheme.rolling} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="std" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
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
                text: "If standard deviation fluctuates substantially across time, the process is heteroskedastic. Logarithmic or Box-Cox transformations are recommended."
              }
            ]}
            takeaway="Stationary series have flat rolling means and constant standard deviation bounds across the entire timeline."
          />
        </div>
      )}

      {/* Tab 3: Lag Phase Space Analysis */}
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
