# Cerrar procesos huérfanos de Chromium o Edge generados por Playwright
Get-Process chrome, msedge -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -like "*ms-playwright*" } catch { $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Cerrar cualquier proceso que esté bloqueando el perfil de sesion de WhatsApp
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*whatsapp_session*"
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
