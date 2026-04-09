@echo off
title Bloom - Install
cd /d "%~dp0"
echo.
echo  =============================
echo    BLOOM - Installing
echo  =============================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found.
    echo  Download from https://nodejs.org
    pause
    exit /b 1
)

echo  Node.js found.
echo  Cleaning previous failed installations...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f /q "package-lock.json"

echo  Installing dependencies (this may take a minute)...
echo.
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed.
    echo  If native build fails again, please downgrade Node.js to v20 LTS or v22 LTS.
    pause
    exit /b 1
)

echo.
echo  Creating uploads directory...
if not exist "uploads" mkdir uploads
if not exist "uploads\products" mkdir uploads\products
if not exist "uploads\reviews" mkdir uploads\reviews

:: Assuming you have a database/seed.js file based on your original script
if exist "database\seed.js" (
    echo.
    echo  Seeding database...
    node database/seed.js
)

echo.
echo  =============================
echo    Install complete!
echo    Run start.bat (or npm start) to launch.
echo  =============================
echo.
pause