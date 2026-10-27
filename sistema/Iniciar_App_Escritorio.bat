@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Sistema de Notificaciones - Iniciando...
cd /d "%~dp0"

:: 1. Si ya existe el entorno virtual en esta carpeta, iniciar directamente
if exist "%~dp0venv\Scripts\python.exe" (
    start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0server.py"
    exit /b 0
)

:: 2. Si existe un entorno en la carpeta superior, usarlo
if exist "%~dp0..\venv\Scripts\python.exe" (
    start "" "%~dp0..\venv\Scripts\pythonw.exe" "%~dp0server.py"
    exit /b 0
)

:: 3. Si no existe entorno, prepararlo automaticamente por primera vez
echo ========================================================
echo   CONFIGURANDO SISTEMA DE NOTIFICACIONES
echo ========================================================
echo.
echo Preparando entorno local... solo tomara un momento.
echo.

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
venv\Scripts\pip.exe install -r requirements.txt --quiet >nul 2>&1
venv\Scripts\playwright.exe install chromium >nul 2>&1

echo.
echo Listo. Abriendo aplicacion...
start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0server.py"
exit /b 0
