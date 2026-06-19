@echo off
setlocal enabledelayedexpansion
title BizPilot - Launcher
color 0A
echo.
echo  ====================================================
echo   BIZPILOT - Starting All Services...
echo  ====================================================
echo.

:: -------------------------------------------------------
:: STEP 0: Add Windows Firewall rule for port 5000
:: -------------------------------------------------------
echo  [0/5] Configuring Windows Firewall for mobile access...
netsh advfirewall firewall show rule name="BizPilot Port 5000" >nul 2>&1
if %errorlevel% NEQ 0 (
    netsh advfirewall firewall add rule name="BizPilot Port 5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
    echo         Firewall rule ADDED for port 5000
) else (
    echo         Firewall rule already exists - OK
)
echo.

:: -------------------------------------------------------
:: STEP 1: Detect and show WiFi IP address & Public Tunnel Info
:: -------------------------------------------------------
echo  [1/5] Detecting connection options for mobile setup...
echo.

set "FOUND_IP="
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set "RAW=%%i"
    set "RAW=!RAW: =!"
    if not defined FOUND_IP (
        set "FOUND_IP=!RAW!"
    )
)

echo  ====================================================
echo   CONNECTION METHODS FOR YOUR MOBILE APP:
echo.
if defined FOUND_IP (
    echo   Option A (Local WiFi IP):
    echo     Type this:  !FOUND_IP!
    echo.
)
echo   Option B (Public Internet Tunnel - Bypasses WiFi Blocks):
echo     Type this:  https://sannabilling.loca.lt
echo.
echo   In the BizPilot APK:
echo   1. Tap "Configure Server IP"
echo   2. Type the address of Option A or Option B
echo   3. Tap "Test Connection" -> it will show "Connected"
echo  ====================================================
echo.

:: -------------------------------------------------------
:: STEP 2: Launch Backend Server
:: -------------------------------------------------------
echo  [2/5] Launching Backend Server (Port 5000)...
start "BizPilot - Backend API" cmd /k "cd /d "%~dp0backend" && color 0B && npm run dev"

timeout /t 2 /nobreak >nul

:: -------------------------------------------------------
:: STEP 3: Launch Public Tunnel (Bypasses Local WiFi Blocks)
:: -------------------------------------------------------
echo  [3/5] Launching Public Tunnel (sannabilling.loca.lt)...
start "BizPilot - Public Tunnel" cmd /k "color 0D && npx localtunnel --port 5000 --subdomain sannabilling"

timeout /t 2 /nobreak >nul

:: -------------------------------------------------------
:: STEP 4: Launch Frontend Server
:: -------------------------------------------------------
echo  [4/5] Launching Frontend Console (Port 5173)...
start "BizPilot - Frontend UI" cmd /k "cd /d "%~dp0frontend" && color 0E && npm run dev -- --host"

timeout /t 4 /nobreak >nul

:: -------------------------------------------------------
:: STEP 5: Open Browser
:: -------------------------------------------------------
echo  [5/5] Opening browser...
start http://localhost:5173

echo.
echo  ====================================================
echo   ALL SYSTEMS LAUNCHED!
echo.
echo   Keep all the black cmd windows open.
echo   Closing them will stop the server or public tunnel.
echo  ====================================================
echo.
pause
