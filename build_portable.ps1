$ErrorActionPreference = 'Stop'
$baseDir = 'c:\desarrollo\Sole'
$portableDir = Join-Path $baseDir 'Sistema Notificaciones'
$zipTarget = Join-Path $baseDir 'Sistema Notificaciones.zip'
$desktop = [Environment]::GetFolderPath('Desktop')
$desktopZip = Join-Path $desktop 'Sistema Notificaciones.zip'

Write-Host "========================================================"
Write-Host "       CREANDO PAQUETE PORTABLE: SISTEMA NOTIFICACIONES"
Write-Host "========================================================"

# 1. Limpiar o crear carpeta portable
if (Test-Path $portableDir) {
    Remove-Item -Recurse -Force $portableDir
}
New-Item -ItemType Directory -Path $portableDir | Out-Null

# 2. Copiar archivos raíz fundamentales
$filesToCopy = @(
    'server.py',
    'database.py',
    'sistema_notificaciones.db',
    'config_empresas.json',
    'config_sistema.json',
    'destinatarios.xlsx',
    'requirements.txt',
    'app_icon.ico',
    'Iniciar_Sistema_Notificaciones.bat',
    'Detener_Sistema_Notificaciones.bat',
    'Iniciar_App_Consola.bat',
    'Instalar_en_otra_PC.bat',
    'kill_chrome.ps1',
    'LEEME_INSTRUCCIONES.txt',
    'MANUAL_DE_USUARIO.md',
    'README.md',
    'clientes_contidep.xlsx',
    'clientes_medcapital.xlsx',
    'clientes_f29.xlsx'
)

foreach ($f in $filesToCopy) {
    $src = Join-Path $baseDir $f
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $portableDir $f)
    }
}

# Crear acceso directo alternativo con el nombre exacto
Copy-Item -Force (Join-Path $portableDir 'Iniciar_Sistema_Notificaciones.bat') (Join-Path $portableDir 'Sistema_Notificaciones.bat')

# 3. Copiar carpetas web
Copy-Item -Recurse -Force (Join-Path $baseDir 'static') (Join-Path $portableDir 'static')
Copy-Item -Recurse -Force (Join-Path $baseDir 'templates') (Join-Path $portableDir 'templates')
Copy-Item -Recurse -Force (Join-Path $baseDir 'public') (Join-Path $portableDir 'public')

# 4. Comprimir a Sistema Notificaciones.zip
Write-Host "[1/3] Comprimiendo paquete portable a ZIP..."
if (Test-Path $zipTarget) {
    Remove-Item -Force $zipTarget
}

Compress-Archive -Path "$portableDir\*" -DestinationPath $zipTarget -Force

# 5. Copiar al Escritorio
Write-Host "[2/3] Copiando ZIP al Escritorio..."
Copy-Item -Force $zipTarget $desktopZip

# 6. Crear acceso directo directo en Escritorio
Write-Host "[3/3] Creando acceso directo en el Escritorio..."
$ws = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $desktop 'Sistema Notificaciones.lnk'
$shortcut = $ws.CreateShortcut($lnkPath)
$shortcut.TargetPath = Join-Path $baseDir 'Iniciar_Sistema_Notificaciones.bat'
$shortcut.WorkingDirectory = $baseDir
$iconPath = Join-Path $baseDir 'app_icon.ico'
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

Write-Host "========================================================"
Write-Host "✅ PAQUETE PORTABLE CREADO EXITOSAMENTE:"
Write-Host "📁 Carpeta: $portableDir"
Write-Host "📦 Archivo ZIP local: $zipTarget"
Write-Host "📦 Archivo ZIP en Escritorio: $desktopZip"
Write-Host "🔗 Acceso directo en Escritorio: $lnkPath"
Write-Host "========================================================"

