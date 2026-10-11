import React from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { FileText, Download, Database, ShieldCheck, Cpu } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { selectedDataset, selectedTarget } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reports & Export Hub</h1>
        <p className="text-sm text-slate-400">
          Export verified ATSA statistical summaries, cleaned dataset tables, and model forecast outputs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Dataset CSV Export */}
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">Processed Dataset Export</h3>
            </div>
            <p className="text-xs text-slate-400">
              Download the current preprocessed time-series data table with regularized timestamps and transformed target series.
            </p>
            {selectedDataset && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
                <div>Dataset: {selectedDataset.name}</div>
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
              >
                <Download className="w-4 h-4" />
                Download Dataset CSV
              </a>
            ) : (
              <span className="text-xs text-slate-400">No active dataset selected.</span>
            )}
          </div>
        </div>

        {/* ATSA Statistical Specification Documentation */}
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">ATSA Methodology Documentation</h3>
            </div>
            <p className="text-xs text-slate-400">
              Technical summary of underlying statistical methods implemented in the Chronos platform.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Stationarity: Augmented Dickey-Fuller (ADF) with MacKinnon p-values</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Estimation: Statsmodels Exact Kalman Filter & Maximum Likelihood</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Diagnostics: Ljung-Box Q-statistic white noise residual test</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Validation: Strict chronological held-out splitting (zero data leakage)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Export individual model forecasts as CSV directly from any model page or Forecast Explorer.
          </div>
        </div>
      </div>
    </div>
  );
};
