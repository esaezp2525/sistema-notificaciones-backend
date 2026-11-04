@echo off
chcp 65001 > nul
setlocal
title Detener Sistema Notificaciones
color 0C
cd /d "%~dp0"

echo ========================================================
echo         DETENIENDO SISTEMA NOTIFICACIONES
echo ========================================================
echo.

powershell -NoProfile -Command "Get-Process python,pythonw -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.py*' } | Stop-Process -Force"

netstat -ano | findstr :5829 | findstr LISTENING >nul
if %ERRORLEVEL% EQU 0 (
    powershell -NoProfile -Command "$p = (Get-NetTCPConnection -LocalPort 5829 -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force }"
)

echo [OK] El motor de WhatsApp se ha detenido con exito.
echo.
ping -n 2 127.0.0.1 >nul
exit /b 0
