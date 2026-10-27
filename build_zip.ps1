# 1. Sincronizar todos los archivos y documentación reciente a la carpeta sistema
Copy-Item -Force 'c:\desarrollo\Sole\server.py' 'c:\desarrollo\Sole\sistema\server.py'
Copy-Item -Force 'c:\desarrollo\Sole\database.py' 'c:\desarrollo\Sole\sistema\database.py'
Copy-Item -Force 'c:\desarrollo\Sole\sistema_notificaciones.db' 'c:\desarrollo\Sole\sistema\sistema_notificaciones.db'
Copy-Item -Force 'c:\desarrollo\Sole\config_sistema.json' 'c:\desarrollo\Sole\sistema\config_sistema.json'
Copy-Item -Force 'c:\desarrollo\Sole\destinatarios.xlsx' 'c:\desarrollo\Sole\sistema\destinatarios.xlsx'
Copy-Item -Force 'c:\desarrollo\Sole\MANUAL_DE_USUARIO.md' 'c:\desarrollo\Sole\sistema\MANUAL_DE_USUARIO.md'
Copy-Item -Force 'c:\desarrollo\Sole\README.md' 'c:\desarrollo\Sole\sistema\README.md'
Copy-Item -Force 'c:\desarrollo\Sole\LEEME_INSTRUCCIONES.txt' 'c:\desarrollo\Sole\sistema\LEEME_INSTRUCCIONES.txt'
Copy-Item -Force 'c:\desarrollo\Sole\kill_chrome.ps1' 'c:\desarrollo\Sole\sistema\kill_chrome.ps1'
Copy-Item -Force 'c:\desarrollo\Sole\requirements.txt' 'c:\desarrollo\Sole\sistema\requirements.txt'
Copy-Item -Force 'c:\desarrollo\Sole\app_icon.ico' 'c:\desarrollo\Sole\sistema\app_icon.ico'
Copy-Item -Force 'c:\desarrollo\Sole\Iniciar_App_Escritorio.bat' 'c:\desarrollo\Sole\sistema\Iniciar_App_Escritorio.bat'
Copy-Item -Force 'c:\desarrollo\Sole\Instalar_en_otra_PC.bat' 'c:\desarrollo\Sole\sistema\Instalar_en_otra_PC.bat'
Copy-Item -Recurse -Force 'c:\desarrollo\Sole\static\*' 'c:\desarrollo\Sole\sistema\static\'
Copy-Item -Recurse -Force 'c:\desarrollo\Sole\templates\*' 'c:\desarrollo\Sole\sistema\templates\'
Copy-Item -Recurse -Force 'c:\desarrollo\Sole\public\*' 'c:\desarrollo\Sole\sistema\public\'
Copy-Item -Force 'c:\desarrollo\Sole\firebase.json' 'c:\desarrollo\Sole\sistema\firebase.json'
Copy-Item -Force 'c:\desarrollo\Sole\.firebaserc' 'c:\desarrollo\Sole\sistema\.firebaserc'
Copy-Item -Force 'c:\desarrollo\Sole\Dockerfile' 'c:\desarrollo\Sole\sistema\Dockerfile'
Copy-Item -Force 'c:\desarrollo\Sole\render.yaml' 'c:\desarrollo\Sole\sistema\render.yaml'

# 2. Comprimir excluyendo sesiones privadas de WhatsApp y caches
$zipLocal = 'c:\desarrollo\Sole\Sistema_de_Notificaciones.zip'
if (Test-Path $zipLocal) { Remove-Item -Force $zipLocal }

$itemsToZip = Get-ChildItem -Path 'c:\desarrollo\Sole\sistema' | Where-Object { 
    $_.Name -ne 'whatsapp_session' -and $_.Name -ne '__pycache__' -and $_.Name -ne 'venv' 
}
Compress-Archive -Path $itemsToZip.FullName -DestinationPath $zipLocal -Force

# 3. Copiar al Escritorio del usuario
$desktopPath = [Environment]::GetFolderPath('Desktop')
Copy-Item -Force $zipLocal (Join-Path $desktopPath 'Sistema_de_Notificaciones.zip')
# Compatibilidad nombre previo
Copy-Item -Force $zipLocal (Join-Path $desktopPath 'Contidep_Notificador_F29.zip')

Write-Output 'SYNC_AND_ZIP_SUCCESS'
