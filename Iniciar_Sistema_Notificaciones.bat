@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Sistema Notificaciones
color 0B
cd /d "%~dp0"

echo ========================================================
echo             SISTEMA NOTIFICACIONES (PORTABLE)
echo ========================================================
echo.

set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"

:: 1. Verificar si el entorno virtual venv ya existe
if not exist "%PYTHON_EXE%" (
    echo [INFO] Primera ejecucion detectada en este equipo.
    echo [INFO] Configurando entorno portable automaticamente...
    echo.

    where python >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        where py >nul 2>&1
        if %ERRORLEVEL% NEQ 0 (
            echo [!] Python no esta instalado en este computador.
            echo Intentando instalar Python 3.12 automaticamente...
            winget install --id Python.Python.3.12 --exact -e --source winget --accept-source-agreements --accept-package-agreements
            if %ERRORLEVEL% NEQ 0 (
                echo.
                echo [ERROR] No se pudo instalar Python automaticamente.
                echo Por favor instala Python desde https://www.python.org/downloads/
                echo Asegurate de marcar la casilla: "Add python.exe to PATH".
                echo.
                pause
                exit /b 1
            )
        )
    )

    echo [1/3] Creando entorno virtual local...
    python -m venv venv 2>nul || py -m venv venv

    if not exist "%PYTHON_EXE%" (
        echo [ERROR] No se pudo crear el entorno virtual venv.
        pause
        exit /b 1
    )

    echo [2/3] Instalando librerias de WhatsApp...
    "%~dp0venv\Scripts\pip.exe" install -r requirements.txt --quiet

    echo [3/3] Descargando componentes del navegador WhatsApp...
    "%~dp0venv\Scripts\playwright.exe" install chromium

    echo.
    echo [OK] Entorno configurado con exito.
    echo.
)

:: 2. Verificar si el motor ya esta corriendo en el puerto 5829
netstat -ano | findstr :5829 | findstr LISTENING >nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Iniciando motor local de WhatsApp...
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%PYTHON_EXE%' -ArgumentList 'server.py' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
    ping -n 3 127.0.0.1 >nul
) else (
    echo [1/2] Motor local ya activo en puerto 5829.
)

:: 3. Abrir la aplicacion como ventana nativa de escritorio
echo [2/2] Abriendo Sistema Notificaciones...
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
echo   Listo. Sistema Notificaciones abierto en tu pantalla.
echo   Sesion de WhatsApp permanente en este equipo.
echo ========================================================
ping -n 2 127.0.0.1 >nul
exit /b 0
