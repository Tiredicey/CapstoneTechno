@echo off
title Bloom - Server
cd /d "%~dp0"
echo.
echo  =============================
echo    BLOOM - Starting Server
echo  =============================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found. Run install.bat first.
    pause
    exit /b 1
)
if not exist "node_modules" (
    echo  ERROR: Dependencies missing. Run install.bat first.
    pause
    exit /b 1
)
echo  Server starting on http://localhost:3000
echo  Press Ctrl+C to stop.
echo.
node server.js
pause