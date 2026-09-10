# Publica instaladores Desktop + Android en GitHub Releases.
# Requisitos: gh autenticado, artefactos ya buildeados.
#
# Uso:
#   pwsh scripts/publish-github-release.ps1
#   pwsh scripts/publish-github-release.ps1 -Version 1.2.1
#   pwsh scripts/publish-github-release.ps1 -DesktopExe "path\to\Setup.exe" -AndroidApk "path\to\app.apk"
#
# Convención de assets (obligatoria para la API):
#   Nega-POS-Setup-{version}.exe
#   Nega-POS-{version}.apk

param(
  [string]$Version = "",
  [string]$DesktopExe = "",
  [string]$AndroidApk = "",
  [string]$Repo = "Greimer29/nega-pos",
  [switch]$Draft
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not $Version -or $Version.Trim() -eq "") {
  $desktopPackage = Get-Content (Join-Path $root "apps\desktop\package.json") -Raw | ConvertFrom-Json
  $Version = [string]$desktopPackage.version
}

$Version = $Version.Trim().TrimStart("v", "V")
if (-not $Version) {
  Write-Error "No se pudo determinar la versión."
}

$tag = "v$Version"
$desktopName = "Nega-POS-Setup-$Version.exe"
$androidName = "Nega-POS-$Version.apk"

$releaseDir = Join-Path $root "apps\desktop\release-nega-pos"
$defaultDesktop = Join-Path $releaseDir "Nega POS Setup $Version.exe"
$defaultApk = Join-Path $root "apps\mobile\android\app\build\outputs\apk\release\app-release.apk"

if (-not $DesktopExe -or $DesktopExe.Trim() -eq "") {
  $DesktopExe = $defaultDesktop
}
if (-not $AndroidApk -or $AndroidApk.Trim() -eq "") {
  $AndroidApk = $defaultApk
}

if (-not (Test-Path $DesktopExe)) {
  Write-Error "No existe el instalador desktop: $DesktopExe. Corré pnpm build:desktop primero."
}
if (-not (Test-Path $AndroidApk)) {
  Write-Error "No existe el APK: $AndroidApk. Corré pnpm build:mobile y build:apk:release primero."
}

$staging = Join-Path $env:TEMP "nega-pos-release-$Version"
if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

$stagedDesktop = Join-Path $staging $desktopName
$stagedAndroid = Join-Path $staging $androidName
Copy-Item $DesktopExe $stagedDesktop -Force
Copy-Item $AndroidApk $stagedAndroid -Force

Write-Host "Publicando $tag en $Repo"
Write-Host "  Desktop: $stagedDesktop"
Write-Host "  Android: $stagedAndroid"

$ghArgs = @(
  "release", "create", $tag,
  $stagedDesktop,
  $stagedAndroid,
  "--repo", $Repo,
  "--title", "Nega POS $Version",
  "--notes", "Release $Version — instaladores Desktop (.exe) y Android (.apk). En la app: Configuración → General → Descargar actualización."
)

if ($Draft) {
  $ghArgs += "--draft"
}

& gh @ghArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "gh release create falló con código $LASTEXITCODE"
}

Write-Host "Listo. Tag $tag publicado. Los clientes verán la actualización tras refrescar Configuración."
