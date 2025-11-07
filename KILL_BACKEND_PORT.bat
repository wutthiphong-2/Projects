@echo off
echo ========================================
echo   Kill Process ที่ใช้ Port 8000
echo ========================================
echo.

echo กำลังหา Process ที่ใช้ Port 8000...
echo.

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :8000') DO (
    echo พบ Process ID: %%P
    echo กำลัง Kill Process...
    taskkill /F /PID %%P
    echo.
)

echo.
echo เสร็จสิ้น! ตอนนี้ Port 8000 ว่างแล้ว
echo.
echo คุณสามารถรัน start_backend.bat ได้แล้ว
echo.
pause

