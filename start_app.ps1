# Start Chronos ATSA & Forecasting Platform
$root = $PSScriptRoot

Write-Host "Starting Backend Server (FastAPI on port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Frontend Dev Server (Vite on port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nBoth servers launched in separate windows!" -ForegroundColor Yellow
Write-Host "Backend API:  http://127.0.0.1:8000 (Docs at http://127.0.0.1:8000/docs)" -ForegroundColor Cyan
Write-Host "Frontend App: http://127.0.0.1:5173" -ForegroundColor Green
