import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { ADFResult, ACFPACFResult } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ChartExplanation } from '../components/common/ChartExplanation';

export const StatisticalTestsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Statistical Tests & Stationarity</h1>
        <p className="text-sm text-slate-400">
          Augmented Dickey-Fuller (ADF) hypothesis test, Autocorrelation (ACF), and Partial Autocorrelation (PACF)
        </p>
      </div>

      {/* ADF Test Results Panel */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Augmented Dickey-Fuller (ADF) Test
            </h2>
            <p className="text-xs text-slate-400">
              Null hypothesis (H₀): The series possesses a unit root (is non-stationary).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Regression Specification:</span>
            <select
              value={regressionType}
              onChange={(e) => setRegressionType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
            >
              <option value="c">Constant only ('c')</option>
              <option value="ct">Constant and Linear Trend ('ct')</option>
              <option value="nc">No constant or trend ('nc')</option>
            </select>
          </div>
        </div>

        {adfResult && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Test Statistic (t)</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {adfResult.test_statistic.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Lags used: {adfResult.lags_used} (N={adfResult.n_obs})
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">p-value</span>
              <div className={`text-xl font-bold font-mono mt-1 ${adfResult.p_value < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {adfResult.p_value < 0.0001 ? '< 0.0001' : adfResult.p_value.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Threshold: α = 0.05
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">MacKinnon Critical Values</span>
              <div className="text-xs font-mono text-slate-300 mt-1 space-y-0.5">
                <div>1%: {adfResult.critical_values['1%']?.toFixed(3)}</div>
                <div>5%: {adfResult.critical_values['5%']?.toFixed(3)}</div>
                <div>10%: {adfResult.critical_values['10%']?.toFixed(3)}</div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border flex flex-col justify-between ${
              adfResult.is_stationary
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-amber-950/20 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-2">
                {adfResult.is_stationary ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {adfResult.is_stationary ? 'Stationary' : 'Non-Stationary'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                {adfResult.interpretation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPSS Stationarity Test Results Panel */}
      {kpssResult && (
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Kwiatkowski–Phillips–Schmidt–Shin (KPSS) Test
            </h2>
            <p className="text-xs text-slate-400">
              Null hypothesis (H₀): The series is level/trend stationary. (Opposite orientation of ADF)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Test Statistic (LM)</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {kpssResult.test_statistic.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Lags used: {kpssResult.lags_used}
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">p-value</span>
              <div className={`text-xl font-bold font-mono mt-1 ${kpssResult.p_value >= 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {kpssResult.p_value.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Threshold: α = 0.05
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Critical Values</span>
              <div className="text-xs font-mono text-slate-300 mt-1 space-y-0.5">
                <div>1%: {kpssResult.critical_values['1%']?.toFixed(3)}</div>
                <div>5%: {kpssResult.critical_values['5%']?.toFixed(3)}</div>
                <div>10%: {kpssResult.critical_values['10%']?.toFixed(3)}</div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border flex flex-col justify-between ${
              kpssResult.is_stationary
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-amber-950/20 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-2">
                {kpssResult.is_stationary ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {kpssResult.is_stationary ? 'Stationary' : 'Non-Stationary'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                {kpssResult.interpretation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACF and PACF Side-by-Side Correlograms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ACF */}
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-white">Autocorrelation Function (ACF)</h2>
              <p className="text-xs text-slate-400">Total correlation between Y_t and lagged observations</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              CI ±{(acfPacfResult?.ci_bound || 0.196).toFixed(3)}
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acfPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="lag" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[-1, 1]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#38bdf8" strokeDasharray="3 3" />
                <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#38bdf8" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="val" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartExplanation
            title="How to Read the ACF Correlogram"
            summary="The ACF measures gross linear correlation between observations separated by lag k, capturing both direct dependence and indirect effects cascading through intermediate time periods."
            formula="ρ_k = Cov(Y_t, Y_{t-k}) / Var(Y_t)"
            items={[
              {
                badge: "Blue Vertical Bars",
                badgeColor: "blue",
                label: "Autocorrelation (ρ_k)",
                text: "The height of each bar represents correlation strength from -1.0 to +1.0 for each time displacement k."
              },
              {
                badge: "Dashed Cyan Lines",
                badgeColor: "cyan",
                label: "95% Bartlett CI (±1.96/√N)",
                text: "Confidence boundaries for white noise. Bars that stay inside the dashed lines are statistically negligible (random noise)."
              },
              {
                badge: "Slow Gradual Decay",
                badgeColor: "amber",
                label: "Non-Stationary Unit Root",
                text: "If positive bars decay very slowly across 15+ lags, the series has persistence/trend and requires first-differencing (d=1)."
              },
              {
                badge: "Sharp Cutoff at Lag q",
                badgeColor: "emerald",
                label: "Moving Average MA(q)",
                text: "If bars abruptly plunge inside the bounds after lag q, it suggests an MA(q) process order."
              }
            ]}
            takeaway="Use the ACF cutoff to select the Moving Average order q. If ACF decays slowly without cutting off, difference the series (d ≥ 1)."
          />
        </div>

        {/* PACF */}
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white">Partial Autocorrelation Function (PACF)</h2>
                <p className="text-xs text-slate-400">Direct correlation between Y_t and Y_{'t-k'}, controlling for intermediate lags</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                CI ±{(acfPacfResult?.ci_bound || 0.196).toFixed(3)}
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pacfPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="lag" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[-1, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <ReferenceLine y={acfPacfResult?.ci_bound || 0.196} stroke="#38bdf8" strokeDasharray="3 3" />
                  <ReferenceLine y={-(acfPacfResult?.ci_bound || 0.196)} stroke="#38bdf8" strokeDasharray="3 3" />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="val" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ChartExplanation
            title="How to Read the PACF Correlogram"
            summary="The PACF isolates the pure, direct relationship between Y_t and Y_{t-k} by mathematically partialling out (controlling for) all intermediate intervening observations Y_{t-1}, ..., Y_{t-k+1}."
            formula="ϕ_{kk} = Corr(Y_t, Y_{t-k} | Y_{t-1}, ..., Y_{t-k+1})"
            items={[
              {
                badge: "Purple Vertical Bars",
                badgeColor: "purple",
                label: "Partial Autocorrelation",
                text: "The direct linear contribution of lag k alone after removing intermediary collinearity."
              },
              {
                badge: "Dashed Cyan Lines",
                badgeColor: "cyan",
                label: "Significance Threshold",
                text: "Any purple bar extending beyond the dashed lines is statistically significant at α = 0.05."
              },
              {
                badge: "Sharp Cutoff at Lag p",
                badgeColor: "emerald",
                label: "Autoregressive AR(p)",
                text: "If bars 1 to p breach the confidence bound and then plunge to zero at lag p+1, the series is an AR(p) process."
              },
              {
                badge: "Damped Sine Waves",
                badgeColor: "slate",
                label: "Moving Average Signature",
                text: "Oscillatory decaying bars in PACF accompanied by a sharp cutoff in ACF indicate an MA process."
              }
            ]}
            takeaway="Count the number of statistically significant purple bars before the cutoff to determine the autoregressive order p in AR(p) or ARIMA(p, d, q)."
          />
        </div>
      </div>

      {/* Box-Jenkins Model Identification Summary Card */}
      <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Box-Jenkins Model Identification Cheatsheet
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          How to combine ACF and PACF correlograms to identify the candidate time series model architecture:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-blue-500/20">
            <div className="font-bold text-blue-400 font-mono mb-1">AR(p) — Autoregressive</div>
            <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
              <li><strong className="text-white">ACF:</strong> Tapers off exponentially or as damped sine wave</li>
              <li><strong className="text-white">PACF:</strong> Cuts off sharply after lag <code className="text-blue-300">p</code></li>
              <li><span className="text-slate-400">Action: Set ARIMA order (p, 0, 0)</span></li>
            </ul>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-purple-500/20">
            <div className="font-bold text-purple-400 font-mono mb-1">MA(q) — Moving Average</div>
            <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
              <li><strong className="text-white">ACF:</strong> Cuts off sharply after lag <code className="text-purple-300">q</code></li>
              <li><strong className="text-white">PACF:</strong> Tapers off exponentially or oscillates</li>
              <li><span className="text-slate-400">Action: Set ARIMA order (0, 0, q)</span></li>
            </ul>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/20">
            <div className="font-bold text-emerald-400 font-mono mb-1">ARMA(p, q) / ARIMA(p, d, q)</div>
            <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
              <li><strong className="text-white">ACF:</strong> Tapers off after lag (q - p)</li>
              <li><strong className="text-white">PACF:</strong> Tapers off after lag (p - q)</li>
              <li><span className="text-slate-400">Action: Use AIC/BIC search or compare models</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
