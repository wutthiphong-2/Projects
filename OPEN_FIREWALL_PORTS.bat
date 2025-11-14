@echo off
echo ========================================
echo    Opening Firewall Ports
echo ========================================
echo.
echo This script will open ports 8000 (Backend) and 3000 (Frontend)
echo Requires Administrator privileges!
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Creating firewall rules...
echo.

:: Open port 8000 for Backend
netsh advfirewall firewall add rule name="AD Management Backend" dir=in action=allow protocol=TCP localport=8000
if %errorlevel% equ 0 (
    echo [OK] Port 8000 (Backend) opened successfully!
) else (
    echo [ERROR] Failed to open port 8000. Make sure you run as Administrator!
)

:: Open port 3000 for Frontend
netsh advfirewall firewall add rule name="AD Management Frontend" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo [OK] Port 3000 (Frontend) opened successfully!
) else (
    echo [ERROR] Failed to open port 3000. Make sure you run as Administrator!
)

echo.
echo ========================================
echo Done! Ports should be open now.
echo ========================================
echo.
echo Note: If you see errors, right-click this file and select
echo "Run as Administrator" and try again.
echo.
pause



































