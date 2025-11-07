@echo off
echo Starting backend in background (no console)...
cd backend
start /B pythonw run_uvicorn_local.py
timeout /t 3 /nobreak >nul 2>&1
echo.
echo Backend started! Running on http://localhost:8000
echo To stop: Run KILL_BACKEND.bat
pause

