@echo off
title Bloom - Tunnel
cd /d "%~dp0"
echo.
echo  =============================
echo    BLOOM - Opening Tunnel
echo  =============================
echo.
if exist "cloudflared.exe" (
    echo  Found cloudflared.exe locally.
    goto :start
)
where cloudflared >nul 2>nul
if %errorlevel% equ 0 (
    set "CF=cloudflared"
    goto :startpath
)
echo  cloudflared not found. Downloading...
echo.
curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
if not exist "cloudflared.exe" (
    echo.
    echo  ERROR: Download failed.
    echo  Grab it from:
    echo  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo.
    pause
    exit /b 1
)
:start
set "CF=%~dp0cloudflared.exe"
:startpath
echo  Tunneling localhost:3000 to public URL...
echo.
"%CF%" tunnel --url http://localhost:3000
pause