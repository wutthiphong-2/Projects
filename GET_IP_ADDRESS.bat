@echo off
echo ========================================
echo    AD Management - Get IP Address
echo ========================================
echo.
echo Finding your network IP addresses...
echo.
echo IPv4 Addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    setlocal enabledelayedexpansion
    set ip=!ip:~1!
    echo   - !ip!
    endlocal
)
echo.
echo IPv6 Addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv6"') do (
    set ip=%%a
    setlocal enabledelayedexpansion
    set ip=!ip:~1!
    echo   - !ip!
    endlocal
)
echo.
echo ========================================
echo Instructions:
echo 1. Choose an IPv4 address (usually starts with 192.168.x.x or 10.x.x.x)
echo 2. Edit frontend/src/config.js
echo 3. Replace localhost with your IP address
echo 4. Example: http://192.168.1.100:8000
echo.
echo ========================================
pause



































