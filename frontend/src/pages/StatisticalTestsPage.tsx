import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { ADFResult, ACFPACFResult } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export const StatisticalTestsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const [adfResult, setAdfResult] = useState<ADFResult | null>(null);
  const [acfPacfResult, setAcfPacfResult] = useState<ACFPACFResult | null>(null);
  const [maxLags, setMaxLags] = useState(24);
  const [regressionType, setRegressionType] = useState('c');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);

    Promise.all([
      apiService.getAdf(selectedDataset.id, selectedTarget, regressionType),
      apiService.getAcfPacf(selectedDataset.id, selectedTarget, maxLags)
    ])
      .then(([adfRes, apRes]) => {
        setAdfResult(adfRes);
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
        </div>

        {/* PACF */}
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
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
      </div>
    </div>
  );
};
