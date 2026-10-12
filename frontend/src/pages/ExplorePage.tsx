import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { DescriptiveStats, RollingTrendData, DecompositionData } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ScatterChart, Scatter, Brush
} from 'recharts';
import { Layers, Activity, Sliders, TrendingUp } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

export const ExplorePage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Exploratory Time Series Analysis</h1>
        <p className="text-sm text-slate-400">
          Decomposition, rolling statistics, moment metrics, and lag phase plots
        </p>
      </div>

      {/* Summary Metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Observations</span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{stats.count}</div>
          </div>
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Mean</span>
            <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">{stats.mean.toFixed(2)}</div>
          </div>
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Median</span>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{stats.median.toFixed(2)}</div>
          </div>
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Std Dev</span>
            <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{stats.std.toFixed(2)}</div>
          </div>
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Skewness</span>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{stats.skewness?.toFixed(2) ?? '—'}</div>
          </div>
          <div className="bg-[#101728] border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400">Kurtosis</span>
            <div className="text-lg font-bold text-violet-400 font-mono mt-0.5">{stats.kurtosis?.toFixed(2) ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Rolling Stats Chart */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Rolling Window Dynamics</h2>
            <p className="text-xs text-slate-400">Rolling mean and rolling dispersion across temporal windows</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Rolling Window (w):</span>
            <input
              type="number"
              min="2"
              max="60"
              value={rollingWindow}
              onChange={(e) => setRollingWindow(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Actual" />
              <Line type="monotone" dataKey="rolling" stroke="#f59e0b" strokeWidth={2} dot={false} name="Rolling Mean" />
              <Line type="monotone" dataKey="std" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Rolling Std" />
              <Brush dataKey="time" height={25} stroke="#38bdf8" fill="#0f172a" tickFormatter={(t) => t.slice(5)} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <ChartExplanation
          title="Interpreting Rolling Statistics & Volatility"
          summary="Rolling statistics evaluate local stationarity. By computing moving moments inside a sliding window, you can determine whether the level (mean) and variance (volatility) remain stable across time."
          items={[
            {
              badge: "Blue Line",
              badgeColor: "blue",
              label: "Actual Series",
              text: "Raw chronological values. Sharp fluctuations highlight high-frequency noise or rapid regime shifts."
            },
            {
              badge: "Amber Line",
              badgeColor: "amber",
              label: "Rolling Mean (μ_t)",
              text: "Sliding window central tendency. A horizontal rolling mean indicates mean-stationarity, whereas an upward or downward slant indicates a drift/trend."
            },
            {
              badge: "Purple Dashed",
              badgeColor: "purple",
              label: "Rolling Std Dev (σ_t)",
              text: "Local dispersion measurement. If this curve flares up during certain periods, the series has heteroscedasticity (volatility clustering)."
            },
            {
              badge: "Interactive Brush",
              badgeColor: "cyan",
              label: "Timeline Slider",
              text: "Click and drag the bottom navigator handles to zoom in on specific sub-periods and inspect local cyclical patterns."
            }
          ]}
          takeaway="Stationary time series maintain a flat horizontal rolling mean and a stable rolling standard deviation. Flaring purple lines or sloped amber lines suggest transformations (log or differencing) are required."
        />
      </div>

      {/* 4-Panel Time Series Decomposition */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Time Series Decomposition (Observed = Trend + Seasonal + Residual)</h2>
            <p className="text-xs text-slate-400">Classical Additive/Multiplicative or LOESS-based STL decomposition</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <select
              value={decompModel}
              onChange={(e) => setDecompModel(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
            >
              <option value="additive">Classical Additive</option>
              <option value="multiplicative">Classical Multiplicative</option>
              <option value="stl">STL (LOESS Robust Decomposition)</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Period (s):</span>
              <input
                type="number"
                min="2"
                max="365"
                value={decompPeriod}
                onChange={(e) => setDecompPeriod(Number(e.target.value))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {decompData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
              <h3 className="text-xs font-semibold text-blue-400 mb-2">1. Observed Series</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decompPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="observed" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
              <h3 className="text-xs font-semibold text-emerald-400 mb-2">2. Trend Component</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decompPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="trend" stroke="#10b981" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
              <h3 className="text-xs font-semibold text-amber-400 mb-2">3. Seasonal Component</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decompPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="seasonal" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
              <h3 className="text-xs font-semibold text-rose-400 mb-2">4. Residual Component</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={decompPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={false} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="residual" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Series requires at least 2 full periods (2 × {decompPeriod} = {2 * decompPeriod} observations) for decomposition.
          </div>
        )}

        <ChartExplanation
          title="Understanding Time Series Decomposition"
          summary="Decomposition isolates latent structural components to reveal how much of the series' movement is driven by secular growth, predictable recurring cycles, or random shocks."
          formula={decompModel === 'additive' ? "Observed_t = Trend_t + Seasonal_t + Residual_t" : decompModel === 'multiplicative' ? "Observed_t = Trend_t × Seasonal_t × Residual_t" : "Observed_t = Trend(LOESS)_t + Seasonal(LOESS)_t + Residual_t"}
          items={[
            {
              badge: "1. Observed",
              badgeColor: "blue",
              label: "Composite Series",
              text: "The raw empirical time series containing all combined trend, seasonal, and stochastic forces."
            },
            {
              badge: "2. Trend",
              badgeColor: "emerald",
              label: "Secular Direction",
              text: "The smooth long-term trajectory isolated by filtering out seasonal cycles. Shows underlying expansion or contraction."
            },
            {
              badge: "3. Seasonal",
              badgeColor: "amber",
              label: "Periodic Recurrence",
              text: `Oscillations that repeat exactly every ${decompPeriod} timestamps. If amplitude grows over time, Multiplicative model is preferred over Additive.`
            },
            {
              badge: "4. Residual",
              badgeColor: "rose",
              label: "Stochastic Noise (e_t)",
              text: "The irregular noise left after subtracting trend and seasonal components. A good decomposition leaves purely random white noise."
            }
          ]}
          takeaway="If the Residual panel displays visible sinusoidal waves or a sloped drift, the chosen seasonal period or model type is misspecified. Residuals should look like unstructured white noise."
        />
      </div>

      {/* Lag Plots */}
      {lagsData && (
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-1">Lag Phase Analysis (Y_t vs Y_{'t-k'})</h2>
          <p className="text-xs text-slate-400 mb-4">Pairwise phase scatter plots evaluating linear and non-linear memory</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(lagsData).map(([lagKey, points]) => (
              <div key={lagKey} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">Lag k = {lagKey}</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" dataKey="x" stroke="#64748b" tick={{ fontSize: 10 }} name={`Y_{t-${lagKey}}`} />
                      <YAxis type="number" dataKey="y" stroke="#64748b" tick={{ fontSize: 10 }} name="Y_t" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Scatter data={points} fill="#38bdf8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <ChartExplanation
            title="How to Read Lag Phase Scatter Plots"
            summary="Lag plots graph each observation Y_t against an earlier observation Y_{t-k} to visually diagnose serial dependence, autocorrelation strength, and potential non-linearities."
            items={[
              {
                badge: "Diagonal Ellipse",
                badgeColor: "cyan",
                label: "Positive Autocorrelation",
                text: "Points clustering along a tight 45° upward diagonal indicate strong serial memory: high values today strongly follow high values from k steps ago."
              },
              {
                badge: "Circular Cloud",
                badgeColor: "slate",
                label: "Zero Autocorrelation",
                text: "A random, uniform circular scatter shows that observations k steps apart are mutually uncorrelated (independent innovations)."
              },
              {
                badge: "Ring or Loop",
                badgeColor: "amber",
                label: "Seasonal Cycling",
                text: "An elliptical ring or periodic pattern reveals deterministic seasonal cycles repeating at lag k."
              },
              {
                badge: "Curved Parabola",
                badgeColor: "rose",
                label: "Non-Linear Dynamics",
                text: "Non-linear curves reveal non-linear dependencies or regime shifts that standard linear autoregression cannot capture alone."
              }
            ]}
            takeaway="A tight diagonal cluster at Lag 1 confirms strong short-run persistence, providing visual justification for an Autoregressive AR(1) or ARIMA model."
          />
        </div>
      )}
    </div>
  );
};
