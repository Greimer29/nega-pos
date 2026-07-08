# Recorta el PNG del icono en círculo (transparencia fuera del borde dorado).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/round-icon.ps1

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$iconPath = Join-Path $projectDir 'resources/icon.png'
$icoPath = Join-Path $projectDir 'resources/icon.ico'

Add-Type -AssemblyName System.Drawing

function Set-CircularIconPng {
    param([string]$Path)

    $tempPath = "$Path.tmp"
    if (Test-Path $tempPath) { Remove-Item $tempPath -Force }

    $source = [System.Drawing.Image]::FromFile($Path)
    try {
        $diameter = [Math]::Min($source.Width, $source.Height)
        $left = ($source.Width - $diameter) / 2.0
        $top = ($source.Height - $diameter) / 2.0

        $bmp = New-Object System.Drawing.Bitmap($diameter, $diameter, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

                $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
                $clipPath.AddEllipse(0, 0, $diameter, $diameter)
                $graphics.SetClip($clipPath)
                $graphics.DrawImage(
                    $source,
                    [System.Drawing.Rectangle]::new(0, 0, $diameter, $diameter),
                    [System.Drawing.Rectangle]::new([int]$left, [int]$top, $diameter, $diameter),
                    [System.Drawing.GraphicsUnit]::Pixel
                )
            }
            finally {
                $graphics.Dispose()
            }

            $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $bmp.Dispose()
        }
    }
    finally {
        $source.Dispose()
    }

    Move-Item -Path $tempPath -Destination $Path -Force
}

Write-Host "Aplicando máscara circular a $iconPath"
Set-CircularIconPng -Path $iconPath

Write-Host "Generando $icoPath"
$iconResolved = (Resolve-Path $iconPath).Path
$icoResolved = (Resolve-Path (Split-Path $icoPath -Parent)).Path + '\icon.ico'
cmd /c "npx --yes png-to-ico `"$iconResolved`" > `"$icoResolved`""

Write-Host "Listo."
