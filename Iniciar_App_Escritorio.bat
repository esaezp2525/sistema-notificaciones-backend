@echo off
setlocal
title Sistema de Notificaciones - Motor Local
cd /d "%~dp0"

echo ========================================================
echo   SISTEMA DE NOTIFICACIONES - MOTOR LOCAL (TU PC)
echo ========================================================
echo.

set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    if exist "%~dp0..\venv\Scripts\python.exe" (
        set "PYTHON_EXE=%~dp0..\venv\Scripts\python.exe"
    )
)

if not exist "%PYTHON_EXE%" (
    echo [ERROR] No se encontro el entorno Python en %~dp0venv
    pause
    exit /b 1
)

netstat -ano | findstr :5829 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Iniciando motor local de WhatsApp...
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%PYTHON_EXE%' -ArgumentList 'server.py' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
    ping -n 3 127.0.0.1 >nul
) else (
    echo [1/2] Motor local ya activo en puerto 5829.
)

echo [2/2] Abriendo aplicacion en tu pantalla...
set "APP_URL=http://localhost:5829"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL%
    goto :fin
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL%
    goto :fin
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%APP_URL%
    goto :fin
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=%APP_URL%
    goto :fin
)

start "" %APP_URL%

:fin
echo.
echo ========================================================
echo   Listo. Aplicacion abierta en pantalla.
echo   Sesion de WhatsApp persistente en este equipo.
echo ========================================================
ping -n 2 127.0.0.1 >nul
exit /b 0