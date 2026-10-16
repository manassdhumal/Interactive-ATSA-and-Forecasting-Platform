export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  time_col: string;
  target_col: string;
  numeric_cols: string[];
  all_cols: string[];
  inferred_freq: string | null;
  total_rows: number;
  date_range: string[];
  warnings: string[];
  is_sample: boolean;
}

export interface DescriptiveStats {
  count: number;
  missing_count: number;
  mean: number;
  std: number;
  median: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
  skewness: number | null;
  kurtosis: number | null;
}

export interface RollingTrendData {
  timestamps: string[];
  values: number[];
  rolling_mean: number[];
  rolling_std: number[];
  trend_line: number[];
  trend_summary: {
    slope?: number;
    intercept?: number;
    r_squared?: number;
    p_value?: number;
    interpretation?: string;
  };
  window: number;
}

export interface DecompositionData {
  timestamps: string[];
  observed: number[];
  trend: (number | null)[];
  seasonal: number[];
  residual: (number | null)[];
  period: number;
  model_type: string;
}

export interface ADFResult {
  test_statistic: number;
  p_value: number;
  lags_used: number;
  n_obs: number;
  critical_values: Record<string, number>;
  is_stationary: boolean;
  interpretation: string;
  null_hypothesis: string;
}

export interface ACFPACFResult {
  lags: number[];
  acf: number[];
  acf_lower: number[];
  acf_upper: number[];
  pacf: number[];
  pacf_lower: number[];
  pacf_upper: number[];
  ci_bound: number;
  n_obs: number;
}

export interface ModelFitResult {
  analysis_id: string;
  dataset_id: string;
  target_column: string;
  model: string;
  parameters: Record<string, any>;
  timestamps: string[];
  actual: number[];
  fitted: (number | null)[];
  residuals: (number | null)[];
  forecast_timestamps: string[];
  forecast: number[];
  lower_interval: (number | null)[];
  upper_interval: (number | null)[];
  metrics: {
    mae?: number | null;
    mse?: number | null;
    rmse?: number | null;
    mape?: number | null;
    smape?: number | null;
    mase?: number | null;
    aic?: number | null;
    bic?: number | null;
    hqic?: number | null;
    log_likelihood?: number | null;
    n_obs?: number;
  };
  param_estimates: Record<string, number>;
  diagnostics: {
    ljung_box?: {
      statistic: number;
      p_value: number;
      lags: number;
      null_hypothesis: string;
      interpretation: string;
    };
    histogram?: {
      counts: number[];
      bins: number[];
    };
    qq_plot?: {
      theoretical: number[];
      sample: number[];
    };
    acf?: {
      lags: number[];
      values: number[];
      ci_bound: number;
    };
    mean?: number;
    std?: number;
  };
  warnings: string[];
  python_code?: string;
}

export interface ModelComparisonResult {
  dataset_id: string;
  test_size: number;
  test_timestamps: string[];
  actual_test: number[];
  predictions: Record<string, number[]>;
  comparison_table: {
    model: string;
    label: string;
    mae: number | null;
    rmse: number | null;
    mape: number | null;
    smape: number | null;
    mase: number | null;
  }[];
  best_model: string | null;
  failed_models: { model: string; error: string }[];
}

export interface ExecutiveReportData {
  dataset_id: string;
  dataset_name: string;
  target_column: string;
  total_observations: number;
  inferred_frequency: string;
  seasonal_period: number;
  date_range: string[];
  generated_at: string;
  executive_summary: string;
  descriptive_statistics: DescriptiveStats;
  hypothesis_tests: {
    adf: ADFResult;
    kpss: ADFResult;
  };
  model_tournament: {
    test_size: number;
    champion_model: string;
    comparison_table: {
      model: string;
      label: string;
      mae: number | null;
      rmse: number | null;
      mape: number | null;
      smape: number | null;
      mase: number | null;
    }[];
  };
  champion_model: {
    label: string;
    model_type: string;
    param_estimates: Record<string, any>;
    metrics: Record<string, any>;
    diagnostics: Record<string, any>;
  };
  forecast_horizon: number;
  forecast_table: {
    step: number;
    timestamp: string;
    point_forecast: number | null;
    lower_95: number | null;
    upper_95: number | null;
  }[];
}
