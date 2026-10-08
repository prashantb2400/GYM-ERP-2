@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo     GymERP Local Offline Setup for Windows
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js 20 LTS from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detected:
node -v
echo.

:: 2. Check if Docker is available
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Docker detected on your system.
    echo Starting all-in-one GymERP offline stack via Docker Compose...
    docker compose -f docker-compose.offline.yml up -d
    echo.
    echo [SUCCESS] GymERP local stack is booting!
    echo Access dashboard at: http://localhost:3000
    echo Access PostgREST API at: http://localhost:54321
    echo.
    start http://localhost:3000
    pause
    exit /b 0
)

:: 3. Native Windows execution without Docker
echo [INFO] Running in native Windows mode...
echo Setting up local environment configuration...

if not exist .env.local (
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000> .env.local
    echo NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321>> .env.local
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder>> .env.local
    echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder>> .env.local
    echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/gymerp>> .env.local
    echo WHATSAPP_BRIDGE_URL=http://localhost:48291>> .env.local
    echo [OK] Created .env.local
)

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo Building GymERP Next.js production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   GymERP is ready! Starting local offline server...
echo   Open in browser: http://localhost:3000
echo ========================================================
start http://localhost:3000
call npm start
pause
