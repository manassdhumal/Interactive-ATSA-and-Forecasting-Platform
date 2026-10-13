@echo off
echo ========================================================
echo Starting Chronos ATSA ^& Forecasting Platform
echo ========================================================

echo Starting Backend Server (FastAPI on port 8000)...
start "Chronos Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

echo Starting Frontend Dev Server (Vite on port 5173)...
start "Chronos Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo Backend API:  http://127.0.0.1:8000 (Swagger docs: http://127.0.0.1:8000/docs)
echo Frontend App: http://127.0.0.1:5173
echo ========================================================
