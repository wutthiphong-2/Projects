@echo off
echo ========================================
echo  Setup ngrok for Backend API
echo ========================================
echo.

REM ตรวจสอบว่า ngrok ติดตั้งหรือยัง
where ngrok >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] ngrok ติดตั้งแล้ว
) else (
    echo [ERROR] ngrok ยังไม่ติดตั้ง
    echo.
    echo กรุณา:
    echo 1. Download ngrok จาก: https://ngrok.com/download
    echo 2. Extract ไปที่: C:\ngrok\
    echo 3. Sign up ที่: https://dashboard.ngrok.com
    echo 4. รัน script นี้อีกครั้ง
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Starting Backend...
echo ========================================
echo.

cd backend
call venv\Scripts\activate
start "Backend API" cmd /k "python run_uvicorn_local.py"

echo.
echo รอสักครู่...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo  Starting ngrok tunnel...
echo ========================================
echo.

start "ngrok tunnel" cmd /k "ngrok http 8000"

echo.
echo ========================================
echo  ✅ Setup สำเร็จ!
echo ========================================
echo.
echo 📋 ขั้นตอนถัดไป:
echo 1. ดู terminal ที่มี ngrok
echo 2. Copy URL จาก "Forwarding" เช่น:
echo    https://xxxx-xx-xx-xxx.ngrok-free.app
echo 3. แก้ไข frontend/src/config.js ให้ใช้ URL นี้
echo 4. แชร์ URL ให้คนอื่นใช้!
echo.
echo กด Enter เพื่อเปิด ngrok dashboard...
pause >nul
start https://127.0.0.1:4040
echo.
pause























