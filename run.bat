@echo off
title Antigravity Health Server
echo ===================================================
echo   Starting Antigravity Health Server...
echo ===================================================

cd /d "%~dp0"

echo [1/3] Checking Python dependencies...
python -m pip install -r requirements.txt --quiet

echo [2/3] Starting backend server on http://localhost:8000 ...
start "" "http://localhost:8000"

echo [3/3] Server is live! Press CTRL+C in this window to stop.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

pause
