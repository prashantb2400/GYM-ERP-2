@echo off
setlocal enabledelayedexpansion

title GymERP - Local Appliance Launcher

echo ======================================================================
echo                 GYMERP LOCAL APPLIANCE LAUNCHER
echo ======================================================================
echo.

:: 1. Check if Docker is available
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Docker detected on your system.
    echo [INFO] Starting GymERP all-in-one offline stack...
    echo.
    
    docker compose -f docker-compose.offline.yml up -d
    
    if %errorlevel% equ 0 (
        echo.
        echo ==================================================================
        echo   GymERP is now running in Docker!
        echo   Local Dashboard:   http://localhost:3000
        echo   First-Run Setup:   http://localhost:3000/setup
        echo   PostgREST API:     http://localhost:54321
        echo   WhatsApp Bridge:   http://localhost:48291
        echo ==================================================================
        echo.
        echo Opening GymERP in your default browser...
        timeout /t 3 >nul
        start http://localhost:3000
        pause
        exit /b 0
    ) else (
        echo [WARN] Docker compose encountered an error. Falling back to native mode...
    )
)

:: 2. Fallback to native Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Neither Docker nor Node.js was found on your PC.
    echo.
    echo To run GymERP locally, please install either:
    echo   1. Docker Desktop: https://www.docker.com/products/docker-desktop
    echo   2. Node.js 20 LTS: https://nodejs.org
    echo.
    echo Opening Node.js download page in your browser...
    start https://nodejs.org/en/download
    pause
    exit /b 1
)

echo [OK] Node.js detected:
node -v
echo.

:: Configure .env.local if not present
if not exist .env.local (
    echo [INFO] Creating initial local configuration...
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000> .env.local
    echo NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000>> .env.local
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder>> .env.local
    echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder>> .env.local
    echo INTERNAL_POSTGREST_URL=http://localhost:54321>> .env.local
    echo INTERNAL_SUPABASE_URL=http://localhost:3000>> .env.local
    echo PGRST_JWT_SECRET=gymerp-offline-local-jwt-secret-minimum-32-chars-long>> .env.local
    echo WHATSAPP_BRIDGE_URL=http://localhost:48291>> .env.local
)

:: Check if dependencies are installed
if not exist node_modules (
    echo [INFO] Installing required dependencies (first run only)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

:: Build production bundle if .next folder does not exist
if not exist .next (
    echo [INFO] Building GymERP production bundle (first run only)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Application build failed.
        pause
        exit /b 1
    )
)

echo.
echo ==================================================================
echo   GymERP is ready! Starting local server...
echo   Open in browser: http://localhost:3000
echo ==================================================================
echo.

timeout /t 2 >nul
start http://localhost:3000
call npm start
pause
