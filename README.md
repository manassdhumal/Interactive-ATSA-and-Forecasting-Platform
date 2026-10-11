# Chronos — Interactive Advanced Time Series Analysis & Forecasting Platform

A full-stack, production-quality web application for **Advanced Time Series Analysis (ATSA)**, statistical hypothesis testing, model estimation, diagnostic evaluation, and chronological forecasting.

---

## 1. Project Overview & Architecture
Chronos brings classical and state-space statistical time series methods into a unified, high-performance platform. Unlike static dashboards or fabricated charts, every model, chart, and metric is backed by a **real Python statistical computing backend** using `statsmodels`, `scipy`, `numpy`, and `pandas`.

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons, Axios, React Router.
- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic, Statsmodels, SciPy, NumPy, Pandas, Scikit-learn, Python-multipart, OpenPyXL, Pytest.
- **Theme**: Analytical Dark Navy (`#0b0f19`) with restrained slate borders and glowing blue, cyan, and violet status accents.

---

## 2. Implemented ATSA Concepts & Models

Every model is accessible through its own dedicated frontend route with dynamic parameter controls, diagnostic outputs, and genuine mathematical implementations:

1. **Deterministic Linear Trend Regression** (`/models/linear_trend`)
   - OLS linear trend slope, intercept, R², p-value, and analytical prediction intervals.
2. **Simple Exponential Smoothing (SES)** (`/models/ses`)
   - Adaptive level smoothing (α estimation via maximum likelihood) for non-seasonal horizontal series.
3. **Holt's Linear Trend Method** (`/models/holt`)
   - Level (α) and slope trend (β) state smoothing.
4. **Holt-Winters Exponential Smoothing** (`/models/holt_winters`)
   - Triple exponential smoothing with additive and multiplicative seasonal components and configurable period.
5. **Autoregressive Process — AR(p)** (`/models/ar`)
   - Statistical AR(p) model with exact state-space log-likelihood and parameter standard errors.
6. **Moving Average Process — MA(q)** (`/models/ma`)
   - Finite innovation white-noise process (distinct from rolling average filters).
7. **ARMA(p, q)** (`/models/arma`)
   - Combined autoregressive moving average for stationary processes. Includes automatic ADF pre-checks.
8. **ARIMA(p, d, q)** (`/models/arima`)
   - Integrated autoregressive moving average for non-stationary series stationarized through order-d differencing.
9. **Seasonal ARIMA — SARIMA(p, d, q)(P, D, Q)[s]** (`/models/sarima`)
   - Full multiplicative seasonal state-space model capturing long-run seasonal recurrence.
10. **Naive Random Walk & Seasonal Naive Baselines** (`/models/naive`)
    - Established empirical benchmarks for relative error scaling (MASE).

---

## 3. Exploratory Data Analysis & Diagnostics
- **Classical Decomposition**: 4-panel coordinated layout separating Observed, Trend, Seasonal, and Residual components (Additive and Multiplicative).
- **Rolling Statistics**: Moving window mean and standard deviation overlay.
- **Lag Phase Analysis**: Scatter phase plots $Y_t$ vs $Y_{t-k}$ across user-selected lags.
- **Augmented Dickey-Fuller (ADF) Test**: Formal hypothesis testing with MacKinnon critical values (1%, 5%, 10%) and p-value stationarity evaluation.
- **Correlograms (ACF & PACF)**: Autocorrelation and Partial Autocorrelation plots with theoretical 95% Bartlett confidence bounds ($\pm 1.96 / \sqrt{N}$).
- **Residual Diagnostics**: Ljung-Box white-noise test, residual distribution histogram, and time series dispersion plots.

---

## 4. Model Comparison Lab & Evaluation
- **Chronological Held-Out Train/Test Split**: Strictly maintains temporal causality (zero data leakage).
- **Evaluation Metrics**:
  - MAE (Mean Absolute Error)
  - MSE (Mean Squared Error)
  - RMSE (Root Mean Squared Error)
  - MAPE & sMAPE (Symmetric Mean Absolute Percentage Error)
  - MASE (Mean Absolute Scaled Error relative to naive random walk)
  - Information Criteria: AIC, BIC, and Log-Likelihood where supported.
- **Leaderboard**: Automatically ranks eligible models on the unseen test horizon and highlights the optimal architecture.

---

## 5. Getting Started & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Start Backend Server
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

### 2. Start Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at `http://127.0.0.1:5173`.

---

## 6. Running Automated Tests
The backend includes a comprehensive pytest suite verifying health, dataset parsing, ADF testing, ACF/PACF generation, decomposition, and model fitting:

```bash
cd backend
python -m pytest tests -v
```

All 10 tests execute against genuine statsmodels processes and pass with 100% success.

---

## 7. Production Deployment Instructions

### Frontend (e.g. Vercel)
1. Build the production bundle:
   ```bash
   cd frontend
   npm run build
   ```
2. Set the environment variable:
   `VITE_API_URL=https://your-backend-api.onrender.com/api`

### Backend (e.g. Render / Railway)
1. Build command: `pip install -r requirements.txt`
2. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Configure `CORS_ORIGINS` to include your deployed frontend domain.
