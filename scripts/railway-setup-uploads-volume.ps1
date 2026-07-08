# Attach persistent Volume for invoice uploads on nega-pos-api (Railway).
# Prerequisite: Railway CLI logged in and linked to nega-pos-api.
#
# Usage (from repo root):
#   .\scripts\railway-setup-uploads-volume.ps1

$ErrorActionPreference = 'Stop'

$MountPath = '/data/uploads'

Write-Host "==> Verificando volumen en nega-pos-api (mount: $MountPath)..." -ForegroundColor Cyan

$volumes = railway volume list --json 2>$null | ConvertFrom-Json
$existing = $volumes | Where-Object { $_.mountPath -eq $MountPath -or $_.service -match 'nega-pos-api' }

if (-not $existing) {
  Write-Host "==> Creando volumen en $MountPath ..." -ForegroundColor Cyan
  railway volume add --mount-path $MountPath
} else {
  Write-Host "Volumen ya existe o está adjunto al servicio API." -ForegroundColor Yellow
}

Write-Host "==> Configurando STORAGE_LOCAL_PATH=$MountPath ..." -ForegroundColor Cyan
railway variables set "STORAGE_LOCAL_PATH=$MountPath"

Write-Host ""
Write-Host "Listo. Redeploy nega-pos-api y ejecutá la prueba manual en docs/RAILWAY_DEPLOY.md (sección Volume)." -ForegroundColor Green
Write-Host "Variables inyectadas por Railway al adjuntar volumen: RAILWAY_VOLUME_MOUNT_PATH, RAILWAY_VOLUME_NAME" -ForegroundColor Gray
