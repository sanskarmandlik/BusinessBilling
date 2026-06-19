@echo off
setlocal enabledelayedexpansion
title Sanna Billing - Build APK Helper
color 0E

echo.
echo  ====================================================
echo   SANNA BILLING - Mobile APK Builder Helper
echo  ====================================================
echo.

:: Ask for the URL
set /p CLOUD_URL="Enter your Cloud Backend URL (e.g. https://sanna-billing.onrender.com): "

if "!CLOUD_URL!"=="" (
    echo.
    echo  ⚠️ No URL entered. Setting to default: http://localhost:5000
    set CLOUD_URL=http://localhost:5000
) else (
    :: Remove trailing slashes
    set "URL_CLEANED=!CLOUD_URL!"
    if "!URL_CLEANED:~-1!"=="/" set "URL_CLEANED=!URL_CLEANED:~0,-1!"
    set CLOUD_URL=!URL_CLEANED!
)

echo.
echo  [1/4] Writing configuration to frontend/.env.production...
echo VITE_API_URL=!CLOUD_URL! > "%~dp0frontend\.env.production"
echo        Saved VITE_API_URL=!CLOUD_URL! to .env.production
echo.

echo  [2/4] Installing frontend dependencies (if any)...
cd /d "%~dp0frontend"
call npm install

echo.
echo  [3/4] Compiling frontend (npm run build)...
call npm run build
if %errorlevel% NEQ 0 (
    echo.
    echo  ❌ ERROR: Frontend build failed. Please fix any compilation or TypeScript errors.
    pause
    exit /b %errorlevel%
)

echo.
echo  [4/4] Syncing build assets with Capacitor Android...
call npx cap sync android
if %errorlevel% NEQ 0 (
    echo.
    echo  ❌ ERROR: Capacitor sync failed.
    pause
    exit /b %errorlevel%
)

echo.
echo  ====================================================
echo   ✅ BUILD AND SYNC COMPLETED SUCCESSFULLY!
echo  ====================================================
echo.
echo   Your mobile project is updated with URL: !CLOUD_URL!
echo.
echo   TO COMPLETE THE BUILD:
echo   1. Open Android Studio.
echo   2. Open the project folder:
echo      c:\Users\Dell\Desktop\FamilyBusiness\frontend\android
echo   3. Go to top menu: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
echo   4. Once compiled, click "Locate" to find your new 'app-debug.apk'
echo      and install it on your phone!
echo  ====================================================
echo.
pause
