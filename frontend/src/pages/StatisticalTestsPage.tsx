import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ADFResult, ACFPACFResult } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Brush
} from 'recharts';
import { Activity, ShieldCheck, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

export const StatisticalTestsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark, chartTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'unitroot' | 'correlogram'>('unitroot');
  const [adfResult, setAdfResult] = useState<ADFResult | null>(null);
  const [kpssResult, setKpssResult] = useState<ADFResult | null>(null);
  const [acfPacfResult, setAcfPacfResult] = useState<ACFPACFResult | null>(null);
  const [maxLags, setMaxLags] = useState(24);
  const [regressionType, setRegressionType] = useState('c');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);

    Promise.all([
      apiService.getAdf(selectedDataset.id, selectedTarget, regressionType),
      apiService.getKpss(selectedDataset.id, selectedTarget, regressionType).catch(() => null),
      apiService.getAcfPacf(selectedDataset.id, selectedTarget, maxLags)
    ])
      .then(([adfRes, kpssRes, apRes]) => {
        setAdfResult(adfRes);
        setKpssResult(kpssRes);
        setAcfPacfResult(apRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDataset, selectedTarget, maxLags, regressionType]);

  const acfPoints = (acfPacfResult?.lags || []).map((lag, i) => ({
    lag: `L${lag}`,
    val: acfPacfResult?.acf[i]
  }));

  const pacfPoints = (acfPacfResult?.lags || []).map((lag, i) => ({
    lag: `L${lag}`,
    val: acfPacfResult?.pacf[i]
  }));

  const isStationary = adfResult ? adfResult.p_value < 0.05 : false;

  const handleZoomInLags = () => {
    setMaxLags((prev) => Math.max(8, Math.floor(prev * 0.7)));
  };

  const handleZoomOutLags = () => {
    setMaxLags((prev) => Math.min(60, Math.ceil(prev * 1.4)));
  };

  const handleResetLags = () => {
    setMaxLags(24);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Statistical Tests & Stationarity
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Augmented Dickey-Fuller (ADF) hypothesis testing, KPSS verification, and ACF/PACF correlograms
          </p>
        </div>

        {/* Minimalist Segmented Tabs */}
        <div className={`flex items-center p-1 rounded-xl border text-xs font-medium self-start ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('unitroot')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'unitroot'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Unit Root Tests
          </button>
          <button
            onClick={() => setActiveTab('correlogram')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'correlogram'
                ? isDark ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Correlograms (ACF / PACF)
          </button>
        </div>
      </div>

      {activeTab === 'unitroot' && (
        <div className="space-y-6">
          {/* ADF Test Results Panel */}
          <div className={`p-5 rounded-2xl border transition ${
            isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  Augmented Dickey-Fuller (ADF) Test
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Null hypothesis (H₀): The series possesses a unit root (is non-stationary).
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-tertiary)]">Specification:</span>
                <select
                  value={regressionType}
                  onChange={(e) => setRegressionType(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1 text-xs ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="c">Constant only ('c')</option>
                  <option value="ct">Constant and Linear Trend ('ct')</option>
                  <option value="nc">No constant or trend ('nc')</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-tertiary)]">
                Computing Dickey-Fuller test regression...
              </div>
            ) : adfResult ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Test Statistic (t)</span>
                    <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
                      {adfResult.test_statistic.toFixed(4)}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-1 font-mono">
                      Lags: {adfResult.lags_used} (N={adfResult.n_obs})
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[11px] text-[var(--text-tertiary)]">p-value</span>
                    <div className={`text-xl font-bold font-mono mt-1 ${
                      isStationary
                        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                        : isDark ? 'text-amber-400' : 'text-amber-600'
                    }`}>
                      {adfResult.p_value < 0.0001 ? '< 0.0001' : adfResult.p_value.toFixed(4)}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
                      Threshold α = 0.05
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Critical Values</span>
                    <div className="text-xs font-mono space-y-0.5 mt-1 text-[var(--text-secondary)]">
                      <div>1%: <span className="font-semibold">{adfResult.critical_values['1%'].toFixed(3)}</span></div>
                      <div>5%: <span className="font-semibold">{adfResult.critical_values['5%'].toFixed(3)}</span></div>
                      <div>10%: <span className="font-semibold">{adfResult.critical_values['10%'].toFixed(3)}</span></div>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isStationary
                      ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                      : isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Verdict</span>
                    <div className="flex items-center gap-2 mt-1">
                      {isStationary ? (
                        <>
                          <ShieldCheck className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            Stationary
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                            Non-Stationary
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {isStationary ? 'Reject H₀ (p < 0.05)' : 'Fail to reject H₀ (p ≥ 0.05)'}
                    </div>
                  </div>
                </div>

                <ChartExplanation
                  title="How to Interpret ADF Unit-Root Hypothesis Results"
                  summary="The Augmented Dickey-Fuller (ADF) test evaluates whether a time series has a unit root, which causes mean/variance drift over time. A stationary process is mean-reverting with constant variance."
                  items={[
                    {
                      badge: "H₀ Null",
                      badgeColor: "amber",
                      label: "Unit Root Exists",
                      text: "The series is non-stationary. Shocks persist indefinitely and the series exhibits long-term drift."
                    },
                    {
                      badge: "p < 0.05",
                      badgeColor: "emerald",
                      label: "Stationary Result",
                      text: "Reject H₀ at the 5% level. The series reverts to a stable mean and is suitable for AR/MA/ARMA modeling."
                    },
                    {
                      badge: "t-Statistic",
                      badgeColor: "blue",
                      label: "Rejection Threshold",
                      text: "The test statistic must be more negative than the 5% critical value (e.g. -3.45 < -2.86) to reject non-stationarity."
                    },
                    {
                      badge: "Next Step",
                      badgeColor: "cyan",
                      label: "If Non-Stationary",
                      text: "Apply first-order differencing ΔY_t = Y_t - Y_{t-1} (or ARIMA with d ≥ 1) to stationarize the series."
                    }
                  ]}
                  takeaway={
                    isStationary
                      ? "The ADF test confirms your target series is stationary. You can proceed directly to AR, MA, or ARMA modeling without requiring differencing."
                      : "The series exhibits a unit root. Do not fit standard ARMA directly without first differencing (d=1) or using ARIMA(p, 1, q)."
                  }
                  formula="ΔY_t = α + β·t + γ·Y_{t-1} + ∑ δ_i ΔY_{t-i} + ε_t"
                />
              </>
            ) : null}
          </div>

          {/* Optional KPSS Test Panel */}
          {kpssResult && (
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  KPSS Confirmatory Test (Kwiatkowski–Phillips–Schmidt–Shin)
                </h3>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Null hypothesis (H₀): Series IS stationary
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">KPSS Stat</span>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {kpssResult.test_statistic.toFixed(4)}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">p-value</span>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {kpssResult.p_value.toFixed(4)}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">Interpretation</span>
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
                    {kpssResult.p_value >= 0.05 ? 'Stationary (p ≥ 0.05)' : 'Non-Stationary (p < 0.05)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'correlogram' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-secondary)]">
              Autocorrelation (ACF) & Partial Autocorrelation (PACF) with 95% Bartlett bounds (±1.96 / √N)
            </span>

            {/* Lag Zoom Controls */}
            <div className="flex items-center gap-2 text-xs">
              <div className={`flex items-center rounded-lg border p-0.5 ${
                isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={handleZoomInLags}
                  title="Zoom In (fewer lags)"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOutLags}
                  title="Zoom Out (more lags)"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
                <button
                  type="button"
                  onClick={handleResetLags}
                  title="Reset Lags (default 24)"
                  className="p-1 rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {[12, 24, 36, 48].map((l) => (
                  <button
                    key={l}
                    onClick={() => setMaxLags(l)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border transition cursor-pointer ${
                      maxLags === l
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
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Autocorrelation Function (ACF)
                </h3>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  Bounds: ±{acfPacfResult?.ci_bound?.toFixed(3) ?? '0.196'}
                </span>
              </div>
              <div className="h-68 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acfPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="lag" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                    <YAxis stroke={chartTheme.axis} domain={[-1, 1]} tick={{ fontSize: 9 }} />
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
                    <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
                    <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Bar dataKey="val" fill={chartTheme.forecast} />
                    <Brush
                      dataKey="lag"
                      height={20}
                      stroke={chartTheme.brushStroke}
                      fill={chartTheme.brushFill}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PACF Chart Card with Brush */}
            <div className={`p-5 rounded-2xl border transition ${
              isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Partial Autocorrelation Function (PACF)
                </h3>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  Order Determination
                </span>
              </div>
              <div className="h-68 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pacfPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="lag" stroke={chartTheme.axis} tick={{ fontSize: 9 }} />
                    <YAxis stroke={chartTheme.axis} domain={[-1, 1]} tick={{ fontSize: 9 }} />
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
                    <ReferenceLine y={0} stroke={chartTheme.zeroLine} />
                    <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Bar dataKey="val" fill={chartTheme.actual} />
                    <Brush
                      dataKey="lag"
                      height={20}
                      stroke={chartTheme.brushStroke}
                      fill={chartTheme.brushFill}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <ChartExplanation
            title="Box-Jenkins Order Identification via Correlograms"
            summary="Autocorrelation (ACF) measures the direct and indirect correlation with past lags, while Partial Autocorrelation (PACF) isolates the net correlation controlling for intermediate periods."
            items={[
              {
                badge: "Amber Dashed",
                badgeColor: "amber",
                label: "95% Bartlett Bounds",
                text: "Lags exceeding this band (±1.96 / √N) are statistically significant beyond white-noise chance."
              },
              {
                badge: "AR(p) Signature",
                badgeColor: "blue",
                label: "PACF Cuts Off",
                text: "If PACF drops sharply after lag p while ACF tails off exponentially, an Autoregressive AR(p) process is indicated."
              },
              {
                badge: "MA(q) Signature",
                badgeColor: "cyan",
                label: "ACF Cuts Off",
                text: "If ACF drops sharply after lag q while PACF decays smoothly, a Moving Average MA(q) process is indicated."
              },
              {
                badge: "Interactive Zoom",
                badgeColor: "purple",
                label: "Lag Range Control",
                text: "Use the zoom controls or the brush sliders at the bottom to focus on early lags (e.g. 1-12) or inspect long seasonal horizons."
              }
            ]}
            takeaway="Count the number of significant initial spikes in the PACF to select the AR order p, and the spikes in ACF to select the MA order q."
            formula="ρ_k = Cov(Y_t, Y_{t-k}) / Var(Y_t) \quad | \quad Bounds: \pm 1.96 / \sqrt{N}"
          />
        </div>
      )}
    </div>
  );
};
