@echo off
chcp 65001 > nul
title Recordatorios F29 - WhatsApp

echo ========================================================
echo   RECORDATORIOS AUTOMATICOS DE F29 - CONTIDEP
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] No se encontro el entorno virtual Python en venv.
    echo Por favor ejecuta la instalacion inicial.
    pause
    exit /b 1
)

venv\Scripts\python.exe enviar_recordatorios.py

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
