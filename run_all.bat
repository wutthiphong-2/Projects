@echo off
echo ========================================
echo    AD Management System - Both
echo ========================================
echo Starting Backend and Frontend...
echo.

echo Starting Backend...
start "Backend Server" cmd /k "cd /d D:\Projects\backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "Frontend Server" cmd /k "cd /d D:\Projects\frontend && npm start"

echo.
echo ========================================
echo Both servers are starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul


