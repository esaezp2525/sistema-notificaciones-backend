@echo off
setlocal
title Consola - Contidep F29 WhatsApp
cd /d "%~dp0"

echo ========================================================
echo   CONTIDEP F29 WHATSAPP - APLICACION DE ESCRITORIO
echo ========================================================
echo.
echo Iniciando servidor y ventana de aplicacion...
echo.

"%~dp0venv\Scripts\python.exe" "%~dp0server.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un problema al ejecutar la aplicacion (%ERRORLEVEL%).
    pause
)
