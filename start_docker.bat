@echo off
echo ========================================
echo  Start Backend with Docker
echo ========================================
echo.

REM ตรวจสอบว่า Docker ติดตั้งหรือยัง
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker ยังไม่ติดตั้ง
    echo.
    echo กรุณา:
    echo 1. Download Docker Desktop จาก: https://www.docker.com/products/docker-desktop/
    echo 2. Install และ restart เครื่อง
    echo 3. รัน script นี้อีกครั้ง
    echo.
    pause
    exit /b 1
)

echo [OK] Docker ติดตั้งแล้ว
echo.

REM Stop containers ถ้ามี
echo Stopping existing containers...
docker-compose down 2>nul

echo.
echo ========================================
echo  Building Docker image...
echo ========================================
echo.

docker-compose build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Starting Backend...
echo ========================================
echo.

docker-compose up -d

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo  ✅ Backend Started!
echo ========================================
echo.
echo Backend URL: http://localhost:8000
echo API Health: http://localhost:8000/api/health
echo.
echo 📋 Docker Commands:
echo   - View logs: docker-compose logs -f
echo   - Stop: docker-compose down
echo   - Restart: docker-compose restart
echo.
echo กด Enter เพื่อดู logs...
pause >nul
docker-compose logs -f

























