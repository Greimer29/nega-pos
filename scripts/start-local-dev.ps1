# Arranca el entorno local de desarrollo/prueba en un solo comando.
# Uso (desde la raiz del repo):
#   pnpm dev
#   .\scripts\start-local-dev.ps1
#   .\scripts\start-local-dev.ps1 -NoBrowser
#
# Hace:
#   1) Asegura Docker Desktop + stack (MySQL + API en :3333)
#   2) Espera health de MySQL y API
#   3) Fuerza apps/web/.env a localhost:3333
#   4) Abre el navegador en :5173 (opcional)
#   5) Arranca Vite (pnpm dev:web) en primer plano

param(
  [switch]$NoBrowser,
  [switch]$SkipStack
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Ensure-DockerEngine {
  docker info 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) { return }

  $dockerDesktop = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if (-not $dockerDesktop) {
    throw "Docker Desktop no esta instalado o no se encontro. Instala Docker Desktop y reintenta."
  }

  Write-Host "==> Iniciando Docker Desktop..." -ForegroundColor Cyan
  Start-Process -FilePath $dockerDesktop | Out-Null

  $deadline = (Get-Date).AddMinutes(2)
  do {
    Start-Sleep -Seconds 4
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) { return }
    Write-Host "    Esperando Docker Engine..."
  } while ((Get-Date) -lt $deadline)

  throw "Docker Engine no respondio a tiempo. Abri Docker Desktop manualmente y corre: pnpm dev"
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) { return }
    } catch {
      # keep waiting
    }
    Start-Sleep -Seconds 2
  }
  throw "Timeout esperando $Url"
}

function Ensure-WebEnvLocal {
  $webEnv = Join-Path $Root "apps\web\.env"
  $desired = "VITE_API_URL=http://localhost:3333`n"
  if (-not (Test-Path $webEnv)) {
    Set-Content -Path $webEnv -Value $desired -NoNewline
    Write-Host "==> Creado apps/web/.env -> localhost:3333" -ForegroundColor Cyan
    return
  }

  $raw = Get-Content $webEnv -Raw
  if ($raw -notmatch '(?m)^VITE_API_URL=http://localhost:3333\s*$') {
    Write-Host "==> Forzando apps/web/.env a http://localhost:3333" -ForegroundColor Yellow
    Set-Content -Path $webEnv -Value $desired -NoNewline
  }
}

Write-Host "==> Entorno local Nega POS" -ForegroundColor Green
Ensure-DockerEngine

if (-not $SkipStack) {
  Write-Host "==> Levantando MySQL + API (Docker)..." -ForegroundColor Cyan
  docker compose up -d

  Write-Host "==> Esperando MySQL healthy..." -ForegroundColor Cyan
  $deadline = (Get-Date).AddSeconds(90)
  do {
    $status = docker inspect -f "{{.State.Health.Status}}" nega-pos-mysql 2>$null
    if ($status -eq "healthy") { break }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  if ($status -ne "healthy") {
    throw "MySQL no quedo healthy. Revisa: docker compose logs mysql"
  }

  Write-Host "==> Esperando API http://localhost:3333/health ..." -ForegroundColor Cyan
  Wait-HttpOk "http://localhost:3333/health" 120
}

Ensure-WebEnvLocal

if (-not $NoBrowser) {
  Write-Host "==> Abriendo http://localhost:5173/" -ForegroundColor Cyan
  Start-Process "http://localhost:5173/"
}

Write-Host "==> Arrancando web (Ctrl+C detiene Vite; Docker sigue arriba)" -ForegroundColor Cyan
Write-Host "    API:  http://localhost:3333" -ForegroundColor DarkGray
Write-Host "    Web:  http://localhost:5173" -ForegroundColor DarkGray
Write-Host ""

pnpm dev:web
