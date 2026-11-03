@echo off
chcp 65001 > nul
setlocal
title Consola - Sistema de Notificaciones WhatsApp (Motor Local)
cd /d "%~dp0"

echo ========================================================
echo   SISTEMA DE NOTIFICACIONES — CONSOLA DE REGISTROS
echo ========================================================
echo.
echo Iniciando servidor local en http://localhost:5829 ...
echo.

start "" "http://localhost:5829"
"%~dp0venv\Scripts\python.exe" "%~dp0server.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un problema al ejecutar la aplicacion (%ERRORLEVEL%).
    pause
)
