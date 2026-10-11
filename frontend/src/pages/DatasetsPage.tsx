import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import {
  Upload, Download, CheckCircle, AlertTriangle,
  Sparkles, ArrowRight, ShieldCheck, Activity, Zap, Trash2
} from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  const { datasets, selectedDataset, selectedTarget, setSelectedDataset, refreshDatasets } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[]; total_rows: number } | null>(null);
  const [preprocessAction, setPreprocessAction] = useState('interpolate');
  const [preprocessResult, setPreprocessResult] = useState<string | null>(null);

  // Recommendation engine state
  const [suggestionsData, setSuggestionsData] = useState<{
    profile: Record<string, any>;
    suggestions: {
      action: string;
      title: string;
      priority: 'high' | 'medium' | 'info';
      reason: string;
      params: Record<string, any>;
      button_label: string;
    }[];
  } | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch intelligent suggestions whenever active dataset or target column changes
  useEffect(() => {
    if (selectedDataset && selectedTarget) {
      setLoadingSuggestions(true);
      apiService.getSuggestions(selectedDataset.id, selectedTarget)
        .then((res) => {
          setSuggestionsData(res);
        })
        .catch((err) => {
          console.error("Failed to load suggestions", err);
          setSuggestionsData(null);
        })
        .finally(() => setLoadingSuggestions(false));
    }
  }, [selectedDataset, selectedTarget]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const meta = await apiService.uploadDataset(file);
      await refreshDatasets();
      setSelectedDataset(meta);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const loadPreview = async (id: string) => {
    try {
      const res = await apiService.getPreview(id, 25);
      setPreviewData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreprocess = async (actionToUse?: string, paramsToUse: Record<string, any> = {}) => {
    if (!selectedDataset) return;
    const action = actionToUse || preprocessAction;
    try {
      const res = await apiService.preprocess(
        selectedDataset.id,
        selectedDataset.target_col,
        selectedDataset.time_col,
        action,
        paramsToUse
      );
      setPreprocessResult(res.note);
      await refreshDatasets();
      setSelectedDataset(res.dataset);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Preprocessing error');
    }
  };

  const handleDeleteDataset = async (datasetId: string, datasetName: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${datasetName}"?`)) {
      return;
    }
    try {
      await apiService.deleteDataset(datasetId);
      await refreshDatasets();
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete dataset');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Data Management & Ingestion</h1>
        <p className="text-sm text-slate-400">
          Upload custom CSV/Excel time series, review automated statistical suggestions, or select synthetic ATSA benchmarks
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-[#101728] border-2 border-dashed border-slate-700/80 hover:border-blue-500/60 rounded-xl p-6 text-center transition">
        <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-white">Upload Time Series File</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Supports CSV (.csv) and Excel (.xlsx, .xls) files. Automatically parses timestamps, detects target columns, and provides diagnostic transformation suggestions.
        </p>
        <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer shadow-md shadow-blue-600/20 transition">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          {uploading ? 'Processing & Validating...' : 'Select File from Device'}
        </label>
        {uploadError && (
          <div className="mt-3 text-xs text-rose-400 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {uploadError}
          </div>
        )}
      </div>

      {/* INTELLIGENT SUGGESTIONS & AUTO-RECOMMENDATIONS */}
      {selectedDataset && (
        <div className="bg-gradient-to-br from-[#10192e] to-[#0c1322] border border-blue-500/40 rounded-xl p-5 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Dataset Diagnostics & Preprocessing Recommendations
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Auto-Detected
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Data-driven statistical recommendations based on unit-root tests, skewness, dispersion, and autocorrelation
                </p>
              </div>
            </div>
            {suggestionsData?.profile && (
              <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>Obs: {suggestionsData.profile.total_observations}</span>
                <span>Missing: {suggestionsData.profile.missing_count} ({suggestionsData.profile.missing_percentage}%)</span>
                <span>Positive: {suggestionsData.profile.is_positive ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>

          {loadingSuggestions ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Analyzing series structure and computing diagnostic stationarity...
            </div>
          ) : suggestionsData && suggestionsData.suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {suggestionsData.suggestions.map((sug, idx) => {
                const isHigh = sug.priority === 'high';
                const isInfo = sug.priority === 'info';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isHigh
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : isInfo
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                          isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isInfo
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {sug.priority === 'high' ? 'Recommended Action' : sug.priority === 'info' ? 'Verified Status' : 'Optimization Suggestion'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">{sug.title}</h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {sug.reason}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      {sug.action !== 'already_stationary' && sug.action !== 'none' ? (
                        <button
                          onClick={() => handlePreprocess(sug.action, sug.params)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 transition"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          {sug.button_label}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ready for Model Fitting</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No anomalies detected. The series is ready for time-series modeling.
            </div>
          )}
        </div>
      )}

      {/* Manual Preprocessing Tools Panel */}
      {selectedDataset && (
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-1">Manual Transformation & Cleaning Controls</h2>
          <p className="text-xs text-slate-400 mb-4">
            Select a custom transformation to apply to the active series:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={preprocessAction}
              onChange={(e) => setPreprocessAction(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="interpolate">Linear Interpolation (Fill NaNs)</option>
              <option value="drop_na">Drop Missing Values</option>
              <option value="diff">First-Order Differencing (d=1)</option>
              <option value="seasonal_diff">Seasonal Differencing (Period=12)</option>
              <option value="log">Logarithmic Transformation (Y &gt; 0)</option>
              <option value="ffill">Forward Fill</option>
              <option value="bfill">Backward Fill</option>
            </select>

            <button
              onClick={() => handlePreprocess()}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
            >
              Apply Manual Transformation
            </button>

            {preprocessResult && (
              <span className="text-xs text-emerald-400 font-mono">
                ✓ {preprocessResult}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((d) => {
          const isSelected = selectedDataset?.id === d.id;
          return (
            <div
              key={d.id}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-blue-950/20 border-blue-500/60 shadow-lg shadow-blue-500/5'
                  : 'bg-[#101728] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    d.is_sample ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {d.is_sample ? 'Synthetic Benchmark' : 'Uploaded'}
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-1.5">{d.name}</h3>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{d.description}</p>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{d.total_rows} rows</span>
                <span>Target: {d.target_col}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setSelectedDataset(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isSelected ? 'Active Dataset' : 'Select'}
                </button>
                <button
                  onClick={() => loadPreview(d.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Preview
                </button>
                <a
                  href={apiService.getDownloadUrl(d.id)}
                  download
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white"
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDeleteDataset(d.id, d.name)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition"
                  title="Delete Dataset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Preview Table */}
      {previewData && (
        <div className="bg-[#101728] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Dataset Preview (First 25 observations)</h2>
            <span className="text-xs text-slate-400">Total Observations: {previewData.total_rows}</span>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 sticky top-0 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  {previewData.columns.map(col => (
                    <th key={col} className="p-2.5 font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {previewData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    {previewData.columns.map(col => (
                      <td key={col} className="p-2.5 whitespace-nowrap">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
