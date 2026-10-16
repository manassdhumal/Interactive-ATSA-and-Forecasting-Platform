import axios from 'axios';
import {
  DatasetMetadata, DescriptiveStats, RollingTrendData,
  DecompositionData, ADFResult, ACFPACFResult,
  ModelFitResult, ModelComparisonResult, ExecutiveReportData
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 45000,
});

export const apiService = {
  // Datasets
  getDatasets: () => api.get<DatasetMetadata[]>('/datasets').then(r => r.data),
  getDataset: (id: string) => api.get<DatasetMetadata>(`/datasets/${id}`).then(r => r.data),
  deleteDataset: (id: string) => api.delete<{ status: string; dataset_id: string }>(`/datasets/${id}`).then(r => r.data),
  getPreview: (id: string, limit = 50) => api.get<{ columns: string[]; rows: any[]; total_rows: number }>(`/datasets/${id}/preview?limit=${limit}`).then(r => r.data),
  uploadDataset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<DatasetMetadata>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  preprocess: (id: string, target_col: string, time_col: string, action: string, params: any = {}) =>
    api.post(`/datasets/${id}/preprocess`, { target_col, time_col, action, params }).then(r => r.data),
  getSuggestions: (id: string, target_col: string) =>
    api.get<{
      dataset_id: string;
      target_col: string;
      profile: Record<string, any>;
      suggestions: {
        action: string;
        title: string;
        priority: 'high' | 'medium' | 'info';
        reason: string;
        params: Record<string, any>;
        button_label: string;
      }[];
    }>(`/datasets/${id}/suggestions/${target_col}`).then(r => r.data),
  getDownloadUrl: (id: string) => `/api/datasets/${id}/download`,
  fetchTicker: (ticker: string, period = '1y', interval = '1d') =>
    api.post<DatasetMetadata>(`/datasets/fetch-ticker?ticker=${encodeURIComponent(ticker)}&period=${period}&interval=${interval}`).then(r => r.data),

  // Exploration
  getStats: (id: string, target: string) => api.get<DescriptiveStats>(`/exploration/statistics/${id}/${target}`).then(r => r.data),
  getPlot: (dataset_id: string, target_col: string, window = 7) =>
    api.post<RollingTrendData>('/exploration/plot', { dataset_id, target_col, window }).then(r => r.data),
  getDecomposition: (dataset_id: string, target_col: string, model_type = 'additive', period?: number) =>
    api.post<DecompositionData>('/exploration/decomposition', { dataset_id, target_col, model_type, period }).then(r => r.data),
  getLags: (dataset_id: string, target_col: string, lags = [1, 2, 7, 14]) =>
    api.post<{ lags: Record<string, { x: number; y: number }[]> }>('/exploration/lags', { dataset_id, target_col, lags }).then(r => r.data),

  // Diagnostics
  getAdf: (dataset_id: string, target_col: string, regression = 'c') =>
    api.post<ADFResult>('/diagnostics/adf', { dataset_id, target_col, regression }).then(r => r.data),
  getKpss: (dataset_id: string, target_col: string, regression = 'c') =>
    api.post<ADFResult>('/diagnostics/kpss', { dataset_id, target_col, regression }).then(r => r.data),
  getAcfPacf: (dataset_id: string, target_col: string, nlags = 30) =>
    api.post<ACFPACFResult>('/diagnostics/acf_pacf', { dataset_id, target_col, nlags }).then(r => r.data),

  // Models
  getAutoArima: (dataset_id: string, target_column: string, max_p = 3, max_d = 2, max_q = 3, seasonal = true, s?: number) => {
    let url = `/models/auto-arima/${dataset_id}/${target_column}?max_p=${max_p}&max_d=${max_d}&max_q=${max_q}&seasonal=${seasonal}`;
    if (s) url += `&s=${s}`;
    return api.get<{
      dataset_id: string;
      best_p: number;
      best_d: number;
      best_q: number;
      best_P?: number;
      best_D?: number;
      best_Q?: number;
      best_s?: number;
      is_seasonal?: boolean;
      best_aic: number;
      top_candidates: { p: number; d: number; q: number; P?: number; D?: number; Q?: number; s?: number; aic: number; bic: number }[];
    }>(url).then(r => r.data);
  },

  // Models
  fitModel: (dataset_id: string, target_column: string, model: string, parameters: any, forecast_horizon = 12, confidence_level = 0.95) =>
    api.post<ModelFitResult>('/models/fit', {
      dataset_id,
      target_column,
      model,
      parameters,
      forecast_horizon,
      confidence_level
    }).then(r => r.data),
  getAnalysis: (analysisId: string) => api.get<ModelFitResult>(`/analyses/${analysisId}`).then(r => r.data),
  getForecastCsvUrl: (analysisId: string) => `/api/analyses/${analysisId}/forecast.csv`,

  // Comparison
  compareModels: (dataset_id: string, target_column: string, model_keys: string[], test_size = 14, seasonal_period = 12) =>
    api.post<ModelComparisonResult>('/models/compare', {
      dataset_id,
      target_column,
      model_keys,
      test_size,
      seasonal_period
    }).then(r => r.data),

  // Reports
  getExecutiveReport: (dataset_id: string, target_column: string, horizon = 12) =>
    api.get<ExecutiveReportData>(`/reports/executive/${dataset_id}/${target_column}?horizon=${horizon}`).then(r => r.data),
  getExecutiveReportHtmlUrl: (dataset_id: string, target_column: string, horizon = 12) =>
    `/api/reports/executive/${dataset_id}/${target_column}/html?horizon=${horizon}`,
  getExecutiveReportDownloadHtmlUrl: (dataset_id: string, target_column: string, horizon = 12) =>
    `/api/reports/executive/${dataset_id}/${target_column}/download-html?horizon=${horizon}`
};
