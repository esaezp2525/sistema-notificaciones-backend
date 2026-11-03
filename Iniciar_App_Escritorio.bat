@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Sistema de Notificaciones - Motor Local
cd /d "%~dp0"

echo ========================================================
echo   SISTEMA DE NOTIFICACIONES — MOTOR LOCAL (TU PC)
echo ========================================================
echo.

:: 1. Determinar ruta de python local
set "PYTHON_EXE="
set "PYTHONW_EXE="
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    set "PYTHONW_EXE=%~dp0venv\Scripts\pythonw.exe"
) else if exist "%~dp0..\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0..\venv\Scripts\python.exe"
    set "PYTHONW_EXE=%~dp0..\venv\Scripts\pythonw.exe"
) else (
    echo [!] Preparando entorno local por primera vez...
    python -m venv venv 2>nul || py -m venv venv 2>nul
    if not exist "%~dp0venv\Scripts\python.exe" (
        echo [!] Verificando instalacion de Python...
        winget install --id Python.Python.3.12 --exact -e --source winget --accept-source-agreements --accept-package-agreements >nul 2>&1
        python -m venv venv 2>nul || py -m venv venv 2>nul
    )
    if not exist "%~dp0venv\Scripts\python.exe" (
        echo [ERROR] No se encontro Python en este equipo.
        echo Por favor instala Python desde https://www.python.org/ y vuelve a abrir este archivo.
        pause
        exit /b 1
    )
    echo Instalando componentes necesarios...
    "%~dp0venv\Scripts\pip.exe" install -r requirements.txt --quiet >nul 2>&1
    "%~dp0venv\Scripts\playwright.exe" install chromium >nul 2>&1
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    set "PYTHONW_EXE=%~dp0venv\Scripts\pythonw.exe"
)

:: 2. Verificar si el servidor local ya está activo en el puerto 5829
netstat -ano | findstr :5829 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Iniciando motor local de WhatsApp...
    start "" "!PYTHONW_EXE!" "%~dp0server.py"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Motor local ya se encuentra activo en el puerto 5829.
)

:: 3. Abrir la aplicacion directamente en tu pantalla (Modo Escritorio App)
echo [2/2] Abriendo aplicacion en tu pantalla...
set "APP_URL=http://localhost:5829"

:: Intentar con Microsoft Edge en modo aplicacion (ventana limpia como programa nativo)
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" msedge --app=!APP_URL!
    goto :fin
)

:: Intentar con Google Chrome en modo aplicacion
where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" chrome --app=!APP_URL!
    goto :fin
)

:: Alternativa rutas estandar de Edge / Chrome
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=!APP_URL!
    goto :fin
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=!APP_URL!
    goto :fin
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=!APP_URL!
    goto :fin
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=!APP_URL!
    goto :fin
)

:: Fallback navegador predeterminado
start "" !APP_URL!

:fin
echo.
echo ========================================================
echo   ¡SISTEMA LISTO! Tu aplicación se abrió en pantalla.
echo   La sesión de WhatsApp queda guardada en este equipo.
echo ========================================================
timeout /t 3 >nul
exit /b 0
