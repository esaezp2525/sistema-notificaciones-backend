@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Instalador - Sistema de Notificaciones
cd /d "%~dp0"

echo ========================================================
echo   INSTALADOR AUTOMATICO - SISTEMA DE NOTIFICACIONES
echo ========================================================
echo.

:: 1. Verificar si Python está instalado
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    py --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] No se encontro Python en este equipo.
        echo Intentando instalar Python 3.12 con winget...
        winget install --id Python.Python.3.12 --exact -e --source winget --accept-source-agreements --accept-package-agreements
        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo [ERROR] No se pudo instalar Python automaticamente.
            echo Por favor descarga e instala Python desde: https://www.python.org/downloads/
            echo IMPORTANTE: Marca la casilla "Add python.exe to PATH" durante la instalacion.
            pause
            exit /b 1
        )
    )
)

echo [1/4] Creando entorno virtual local (venv)...
python -m venv venv 2>nul || py -m venv venv

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] No se pudo crear la carpeta venv.
    pause
    exit /b 1
)

echo [2/4] Instalando librerias necesarias...
venv\Scripts\pip.exe install -r requirements.txt --quiet

echo [3/4] Descargando componentes de WhatsApp Web (Chromium)...
venv\Scripts\playwright.exe install chromium

echo [4/4] Creando acceso directo en el Escritorio...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Sistema de Notificaciones.lnk'); $s.TargetPath = '%~dp0Iniciar_App_Escritorio.bat'; $s.WorkingDirectory = '%~dp0'; if (Test-Path '%~dp0app_icon.ico') { $s.IconLocation = '%~dp0app_icon.ico, 0' }; $s.Save()"

echo.
echo ========================================================
echo   INSTALACION COMPLETADA CON EXITO
echo ========================================================
echo Ya puedes abrir el programa desde el acceso directo
echo "Sistema de Notificaciones" en tu Escritorio o haciendo
echo doble clic en "Iniciar_App_Escritorio.bat".
echo.
pause
