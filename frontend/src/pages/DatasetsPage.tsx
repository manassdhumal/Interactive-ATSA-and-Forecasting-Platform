import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import {
  Upload, Download, CheckCircle, AlertTriangle,
  Sparkles, Globe, Trash2, Zap, X
} from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  const { datasets, selectedDataset, selectedTarget, setSelectedDataset, refreshDatasets } = useApp();
  const { isDark } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[]; total_rows: number } | null>(null);
  const [preprocessAction, setPreprocessAction] = useState('interpolate');
  const [preprocessResult, setPreprocessResult] = useState<string | null>(null);

  // Direct Web/API ticker fetching state
  const [tickerInput, setTickerInput] = useState('');
  const [tickerPeriod, setTickerPeriod] = useState('1y');
  const [fetchingTicker, setFetchingTicker] = useState(false);

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

  const handleFetchTicker = async () => {
    if (!tickerInput.trim()) return;
    setFetchingTicker(true);
    try {
      const meta = await apiService.fetchTicker(tickerInput.trim(), tickerPeriod);
      await refreshDatasets();
      setSelectedDataset(meta);
      setTickerInput('');
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Market fetch failed');
    } finally {
      setFetchingTicker(false);
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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Data Hub & Time Series Ingestion
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Upload custom CSV/Excel files, fetch live Yahoo Finance ticker series, and apply statistical cleaning
        </p>
      </div>

      {/* Clean Ingestion Cards (Upload + Market Ticker) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Box */}
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Upload className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Upload Time Series File</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Upload CSV or Excel files with a chronological date/timestamp column and numeric value series.
          </p>

          <div className="mt-4">
            <label className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition ${
              isDark
                ? 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}>
              <Upload className="w-5 h-5 text-[var(--text-tertiary)] mb-2" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {uploading ? 'Processing & validating timestamps...' : 'Click to select CSV or Excel (.xlsx)'}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Auto-infers frequency and regularity</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploadError && (
              <div className="mt-2 text-xs text-rose-500 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {uploadError}
              </div>
            )}
          </div>
        </div>

        {/* Live Public Web & Financial Market API Fetch Box */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Fetch Public Market Data</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Fetch real-world time-series directly from public markets by ticker symbol (e.g. AAPL, NVDA, TSLA, BTC-USD, ^GSPC).
            </p>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ticker (e.g. AAPL, BTC-USD)"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
              <select
                value={tickerPeriod}
                onChange={(e) => setTickerPeriod(e.target.value)}
                className={`border rounded-lg px-2.5 py-2 text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="5y">5 Years</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-tertiary)]">Adjusted daily closing prices</span>
            <button
              onClick={handleFetchTicker}
              disabled={fetchingTicker || !tickerInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {fetchingTicker ? 'Fetching...' : 'Import Series'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Recommendations Panel */}
      {selectedDataset && (
        <div className={`p-5 rounded-2xl border transition ${
          isDark
            ? 'bg-gradient-to-r from-blue-950/20 to-slate-900/40 border-blue-500/30'
            : 'bg-blue-50/40 border-blue-200/80 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Dataset Diagnostics & Preprocessing Recommendations
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Statistical suggestions based on unit-root tests, skewness, dispersion, and autocorrelation
                </p>
              </div>
            </div>
            {suggestionsData?.profile && (
              <div className="flex items-center gap-2.5 text-[11px] font-mono text-[var(--text-tertiary)]">
                <span>Obs: {suggestionsData.profile.total_observations}</span>
                <span>Missing: {suggestionsData.profile.missing_count}</span>
              </div>
            )}
          </div>

          {loadingSuggestions ? (
            <div className="py-4 text-center text-xs text-[var(--text-tertiary)]">
              Analyzing series structure...
            </div>
          ) : suggestionsData && suggestionsData.suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {suggestionsData.suggestions.map((sug, idx) => {
                const isHigh = sug.priority === 'high';
                const isInfo = sug.priority === 'info';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                      isDark
                        ? isHigh
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : isInfo
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                        : isHigh
                        ? 'bg-amber-50/80 border-amber-200'
                        : isInfo
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                        isHigh
                          ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                          : isInfo
                          ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                          : isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isHigh ? 'Recommended' : isInfo ? 'Verified' : 'Optimization'}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{sug.title}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {sug.reason}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      {sug.action !== 'already_stationary' && sug.action !== 'none' ? (
                        <button
                          onClick={() => handlePreprocess(sug.action, sug.params)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          {sug.button_label}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ready for Modeling</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-2 text-xs text-[var(--text-secondary)]">
              No anomalies detected. Series is ready for time-series modeling.
            </div>
          )}
        </div>
      )}

      {/* Manual Cleaning Toolbar */}
      {selectedDataset && (
        <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">Transform Active Series:</span>
            <select
              value={preprocessAction}
              onChange={(e) => setPreprocessAction(e.target.value)}
              className={`border rounded-lg px-2.5 py-1 text-xs ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="interpolate">Linear Interpolation</option>
              <option value="drop_na">Drop Missing</option>
              <option value="diff">First-Order Differencing (d=1)</option>
              <option value="seasonal_diff">Seasonal Diff (s=12)</option>
              <option value="log">Logarithmic Transformation</option>
              <option value="ffill">Forward Fill</option>
              <option value="bfill">Backward Fill</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePreprocess()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Apply Transformation
            </button>
            {preprocessResult && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
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
              className={`p-4 rounded-xl border transition ${
                isSelected
                  ? isDark
                    ? 'bg-blue-950/20 border-blue-500/50 shadow-md'
                    : 'bg-blue-50/50 border-blue-300 shadow-xs'
                  : isDark
                  ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                    d.is_sample
                      ? isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {d.is_sample ? 'Benchmark' : 'Uploaded'}
                  </span>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{d.name}</h3>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">{d.description}</p>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-mono">
                <span>{d.total_rows} rows</span>
                <span>Target: {d.target_col}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setSelectedDataset(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {isSelected ? 'Active' : 'Select'}
                </button>
                <button
                  onClick={() => loadPreview(d.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Preview
                </button>
                <a
                  href={apiService.getDownloadUrl(d.id)}
                  download
                  className={`p-1.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Download CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDeleteDataset(d.id, d.name)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/30'
                      : 'bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                  }`}
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
        <div className={`p-5 rounded-2xl border transition ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Dataset Preview (First 25 observations)</h3>
              <span className="text-xs text-[var(--text-tertiary)]">Total Observations: {previewData.total_rows}</span>
            </div>
            <button
              onClick={() => setPreviewData(null)}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--text-tertiary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-72 border rounded-xl border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 text-[10px] uppercase tracking-wider font-semibold ${
                isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}>
                <tr>
                  {previewData.columns.map(col => (
                    <th key={col} className="p-2.5">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)]">
                {previewData.rows.map((row, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
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
