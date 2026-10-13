import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { FileText, Download, Database, ShieldCheck } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Reports & Documentation Hub
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Export verified ATSA statistical summaries, cleaned dataset tables, and model forecast outputs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Dataset CSV Export */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Processed Dataset Export</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Download the current preprocessed time-series data table with regularized timestamps and transformed target series.
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
              <h3 className="text-sm font-bold text-[var(--text-primary)]">ATSA Methodology Documentation</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Technical summary of statistical methods implemented in the Chronos computational engine.
            </p>
            <div className={`mt-3 p-3 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Stationarity: Augmented Dickey-Fuller (ADF) with MacKinnon p-values</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Estimation: Statsmodels Exact Kalman Filter & Maximum Likelihood</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Diagnostics: Ljung-Box Q-statistic white noise residual test</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Validation: Strict chronological held-out splitting (zero data leakage)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-[var(--text-tertiary)]">
            Export individual model forecasts as CSV directly from any model page or Forecast Explorer.
          </div>
        </div>
      </div>
    </div>
  );
};
