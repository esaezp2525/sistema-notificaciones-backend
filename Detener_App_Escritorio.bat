@echo off
chcp 65001 > nul
title Detener Sistema de Notificaciones
cd /d "%~dp0"

echo ========================================================
echo   DETENIENDO MOTOR LOCAL DE WHATSAPP
echo ========================================================
echo.

powershell -NoProfile -Command "Get-Process python,pythonw -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.py*' } | Stop-Process -Force"
netstat -ano | findstr :5829 | findstr LISTENING >nul
if %ERRORLEVEL% EQU 0 (
    powershell -NoProfile -Command "$p = (Get-NetTCPConnection -LocalPort 5829 -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force }"
)

echo [OK] El motor local se ha detenido con exito.
timeout /t 2 >nul
exit /b 0
