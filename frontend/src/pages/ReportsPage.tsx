import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ExecutiveReportData } from '../types';
import {
  FileText, Download, Database, ShieldCheck, Printer,
  Sparkles, ExternalLink, Copy, Check, Play, AlertCircle,
  TrendingUp, Award, Activity, BarChart2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark } = useTheme();

  const [horizon, setHorizon] = useState<number>(12);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  const handleGenerateReport = async () => {
    if (!selectedDataset || !selectedTarget) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getExecutiveReport(selectedDataset.id, selectedTarget, horizon);
      setReportData(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Report compilation failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    if (!reportData) return;
    const md = `# ATSA Executive Briefing: ${reportData.dataset_name} (${reportData.target_column})
Generated: ${reportData.generated_at}

## Executive Summary
${reportData.executive_summary}

## Series Parameters
- Observations: ${reportData.total_observations}
- Seasonal Period: ${reportData.seasonal_period}
- Inferred Frequency: ${reportData.inferred_frequency}
- Mean: ${reportData.descriptive_statistics.mean} | Std: ${reportData.descriptive_statistics.std}
- Stationarity (ADF): ${reportData.hypothesis_tests.adf.is_stationary ? 'Stationary' : 'Non-Stationary (d=1)'} (p=${reportData.hypothesis_tests.adf.p_value})

## Model Tournament Winner
- Champion Architecture: ${reportData.champion_model.label}
- In-sample MAPE: ${reportData.champion_model.metrics.mape ?? 'N/A'}%
- AIC: ${reportData.champion_model.metrics.aic ?? 'N/A'}

## ${reportData.forecast_horizon}-Step Forward Horizon Forecast
| Step | Timestamp | Point Forecast | Lower 95% | Upper 95% |
|---|---|---|---|---|
${reportData.forecast_table.map(r => `| ${r.step} | ${r.timestamp} | ${r.point_forecast} | ${r.lower_95} | ${r.upper_95} |`).join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Reports & Executive Briefing Hub
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            One-click executive PDF/HTML report compilation with stationarity diagnostics, model tournament benchmarking, and forecast intervals
          </p>
        </div>

        {selectedDataset && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">Active:</span>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium border ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {selectedDataset.name} ({selectedTarget})
            </span>
          </div>
        )}
      </div>

      {/* Generator Controls Bar */}
      <div className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition ${
        isDark ? 'bg-slate-900/50 border-slate-800/80 shadow-md' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-tertiary)] font-medium">Forecast Horizon:</span>
            <input
              type="number"
              min="1"
              max="120"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className={`w-16 border rounded-lg px-2 py-1 font-mono text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
            <span className="text-[var(--text-tertiary)]">steps</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateReport}
            disabled={loading || !selectedDataset}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Compiling Report...' : 'Generate Executive Report'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Report Actions Toolbar (shown when reportData exists) */}
      {reportData && (
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 transition ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Executive briefing compiled successfully.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handlePrint}
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-blue-500" />
              Print / Save as PDF
            </button>

            <a
              href={apiService.getExecutiveReportHtmlUrl(selectedDataset!.id, selectedTarget, horizon)}
              target="_blank"
              rel="noreferrer"
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
              Open HTML View
            </a>

            <a
              href={apiService.getExecutiveReportDownloadHtmlUrl(selectedDataset!.id, selectedTarget, horizon)}
              download
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              Download HTML
            </a>

            <button
              onClick={handleCopyMarkdown}
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedMarkdown ? 'Copied MD!' : 'Copy Markdown'}
            </button>
          </div>
        </div>
      )}

      {/* Executive Report Document Card */}
      {reportData && (
        <div className={`p-6 sm:p-8 rounded-2xl border space-y-6 transition print:p-0 print:border-none ${
          isDark ? 'bg-slate-900/60 border-slate-800/90 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Document Header */}
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-[var(--border-color)]">
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                isDark ? 'bg-blue-500/10 text-cyan-300 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Verified ATSA Analysis Document
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-1.5">
                Executive Time Series & Forecasting Briefing
              </h2>
              <div className="text-xs text-[var(--text-secondary)] mt-1 space-x-2">
                <span>Dataset: <strong>{reportData.dataset_name}</strong></span>
                <span>•</span>
                <span>Target: <strong>{reportData.target_column}</strong></span>
                <span>•</span>
                <span>Compiled: {reportData.generated_at}</span>
              </div>
            </div>
          </div>

          {/* 1. Executive Summary Narrative */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Executive Narrative Summary
            </h3>
            <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {reportData.executive_summary}
            </div>
          </div>

          {/* 2. Series Parameters & Health */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Series Health & Statistical Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Total Observations</div>
                <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">{reportData.total_observations}</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Freq: {reportData.inferred_frequency}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Mean Value</div>
                <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">{reportData.descriptive_statistics.mean}</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Median: {reportData.descriptive_statistics.median}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Standard Deviation</div>
                <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">{reportData.descriptive_statistics.std}</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Min: {reportData.descriptive_statistics.min} | Max: {reportData.descriptive_statistics.max}</div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Seasonal Period (s)</div>
                <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">{reportData.seasonal_period}</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Cycles: {(reportData.total_observations / reportData.seasonal_period).toFixed(1)}x</div>
              </div>
            </div>
          </div>

          {/* 3. Stationarity & Hypothesis Tests */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Stationarity & Unit Root Hypothesis Tests
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">ADF Test</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    reportData.hypothesis_tests.adf.is_stationary
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {reportData.hypothesis_tests.adf.is_stationary ? 'Stationary' : 'Unit Root (d=1)'}
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-[var(--text-secondary)] space-y-0.5">
                  <div>Stat: {reportData.hypothesis_tests.adf.test_statistic?.toFixed(4)}</div>
                  <div>p-value: {reportData.hypothesis_tests.adf.p_value?.toFixed(4)}</div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">KPSS Test</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    reportData.hypothesis_tests.kpss.is_stationary
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {reportData.hypothesis_tests.kpss.is_stationary ? 'Stationary' : 'Non-Stationary'}
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-[var(--text-secondary)] space-y-0.5">
                  <div>Stat: {reportData.hypothesis_tests.kpss.test_statistic?.toFixed(4)}</div>
                  <div>p-value: {reportData.hypothesis_tests.kpss.p_value?.toFixed(4)}</div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-semibold text-[var(--text-primary)]">Transform Recommendation</div>
                <div className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {reportData.hypothesis_tests.adf.is_stationary
                    ? 'No differencing required; mean-reverting ARMA / SES architectures suitable.'
                    : 'First-order differencing (d=1) required to stationarize drift before AR/MA modeling.'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Model Tournament Benchmark Leaderboard */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Model Tournament Leaderboard (Holdout Cross-Validation)
              </h3>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Held-out test size: {reportData.model_tournament.test_size} observations
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-xs text-left">
                <thead className={isDark ? 'bg-slate-950/60 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                  <tr>
                    <th className="p-2.5">Architecture</th>
                    <th className="p-2.5">RMSE</th>
                    <th className="p-2.5">MAE</th>
                    <th className="p-2.5">MAPE</th>
                    <th className="p-2.5">MASE</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {reportData.model_tournament.comparison_table.map((c, idx) => (
                    <tr key={c.model} className={idx === 0 ? (isDark ? 'bg-blue-950/30 font-semibold' : 'bg-blue-50/70 font-semibold') : ''}>
                      <td className="p-2.5 flex items-center gap-1.5">
                        {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                        {c.label || c.model.toUpperCase()}
                      </td>
                      <td className="p-2.5 font-mono">{c.rmse ?? '—'}</td>
                      <td className="p-2.5 font-mono">{c.mae ?? '—'}</td>
                      <td className="p-2.5 font-mono">{c.mape != null ? `${c.mape}%` : '—'}</td>
                      <td className="p-2.5 font-mono">{c.mase ?? '—'}</td>
                      <td className="p-2.5">
                        {idx === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            CHAMPION
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)]">Evaluated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Champion Architecture Forward Horizon Forecast */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Champion Model Forward Forecast ({reportData.champion_model.label})
              </h3>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-secondary)]">
                {reportData.champion_model.metrics.aic != null && (
                  <span>AIC: {Number(reportData.champion_model.metrics.aic).toFixed(1)}</span>
                )}
                {reportData.champion_model.metrics.mape != null && (
                  <span>• In-sample MAPE: {reportData.champion_model.metrics.mape}%</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className={`sticky top-0 ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  <tr>
                    <th className="p-2.5">Step</th>
                    <th className="p-2.5">Date / Step</th>
                    <th className="p-2.5">Point Forecast (ŷ)</th>
                    <th className="p-2.5">Lower 95% Bound</th>
                    <th className="p-2.5">Upper 95% Bound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {reportData.forecast_table.map((r) => (
                    <tr key={r.step} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 font-mono text-[var(--text-tertiary)]">+{r.step}</td>
                      <td className="p-2.5 font-mono">{r.timestamp}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-cyan-300">{r.point_forecast}</td>
                      <td className="p-2.5 font-mono text-[var(--text-secondary)]">{r.lower_95}</td>
                      <td className="p-2.5 font-mono text-[var(--text-secondary)]">{r.upper_95}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Footer */}
          <div className="border-t pt-4 text-[10px] text-[var(--text-tertiary)] flex flex-col sm:flex-row items-center justify-between gap-2 border-[var(--border-color)]">
            <div>Verified Chronos ATSA Computational Report • Zero Data Leakage Out-of-Sample Protocol</div>
            <div>Generated {reportData.generated_at}</div>
          </div>
        </div>
      )}

      {/* Secondary Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Dataset CSV Export */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Cleaned Dataset CSV</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Download the active time-series data table with regularized timestamps and imputed/transformed target values.
            </p>
            {selectedDataset && (
              <div className={`mt-3 p-3 rounded-xl border text-xs font-mono space-y-1 ${
                isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
              }`}>
                <div>Dataset: <span className="font-semibold text-[var(--text-primary)]">{selectedDataset.name}</span></div>
                <div>Observations: {selectedDataset.total_rows}</div>
                <div>Target column: {selectedTarget}</div>
              </div>
            )}
          </div>

          <div className="mt-4">
            {selectedDataset ? (
              <a
                href={apiService.getDownloadUrl(selectedDataset.id)}
                download
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Dataset CSV
              </a>
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">No active dataset selected.</span>
            )}
          </div>
        </div>

        {/* ATSA Statistical Specification Documentation */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Statistical Method Reference</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Technical protocol implemented in the computational engine for academic and regulatory auditability.
            </p>
            <div className={`mt-3 p-3 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Stationarity: ADF with MacKinnon p-values & KPSS Level/Trend</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Estimation: Statsmodels Exact Kalman Filter & State-Space Log-Likelihood</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Diagnostics: Ljung-Box Q-statistic white noise residual verification</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Validation: Strict chronological held-out splitting (zero data leakage)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-[var(--text-tertiary)]">
            Export individual model predictions as CSV from any model workspace or the Forecast Explorer.
          </div>
        </div>
      </div>
    </div>
  );
};
