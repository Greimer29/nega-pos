# Build web for Capacitor and sync native project.
# Usage (PowerShell):
#   $env:VITE_API_URL = "https://your-api.example.com"
#   pnpm build:mobile

param(
  [string]$ApiUrl = $env:VITE_API_URL
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not $ApiUrl -or $ApiUrl.Trim() -eq "") {
  Write-Error "Definí VITE_API_URL (URL pública de la API, sin /api/v1). Ejemplo: https://tu-api.up.railway.app"
}

$env:VITE_API_URL = $ApiUrl.Trim().TrimEnd("/")
Write-Host "Building web with VITE_API_URL=$env:VITE_API_URL"

Set-Location $root
pnpm --filter web build

$runtimeConfigPath = Join-Path $root "apps\web\dist\runtime-config.json"
@{
  apiUrl = $env:VITE_API_URL
  useLocalApiProxy = $false
} | ConvertTo-Json | Set-Content -Path $runtimeConfigPath -Encoding utf8

Write-Host "Wrote $runtimeConfigPath"
pnpm --filter mobile sync
Write-Host "Mobile web assets synced. Next: pnpm --filter mobile build:apk:debug"
