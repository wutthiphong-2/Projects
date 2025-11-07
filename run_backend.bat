@echo off
echo ========================================
echo    AD Management System - Backend
echo ========================================
cd /d D:\Projects\backend
call venv\Scripts\activate
echo Starting Backend Server...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause


