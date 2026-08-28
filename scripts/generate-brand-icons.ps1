param(
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$WebPublic,
  [Parameter(Mandatory = $true)][string]$MobileRes
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $WebPublic | Out-Null

# Load into memory and unlock file handle
$bytes = [System.IO.File]::ReadAllBytes($SourcePath)
$ms = New-Object System.IO.MemoryStream(,$bytes)
$loaded = [System.Drawing.Image]::FromStream($ms)
$source = New-Object System.Drawing.Bitmap $loaded.Width, $loaded.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gLoad = [System.Drawing.Graphics]::FromImage($source)
$gLoad.DrawImage($loaded, 0, 0, $loaded.Width, $loaded.Height)
$gLoad.Dispose()
$loaded.Dispose()
$ms.Dispose()

Write-Host "Source: $($source.Width)x$($source.Height)"

function Test-NearBlack([System.Drawing.Color]$c, [int]$threshold = 28) {
  return ($c.R -le $threshold -and $c.G -le $threshold -and $c.B -le $threshold)
}

# Fast crop: sample every 2px then refine bounds
$minX = $source.Width; $minY = $source.Height; $maxX = -1; $maxY = -1
$step = 2
for ($y = 0; $y -lt $source.Height; $y += $step) {
  for ($x = 0; $x -lt $source.Width; $x += $step) {
    if (-not (Test-NearBlack ($source.GetPixel($x, $y)))) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt 0) { $minX = 0; $minY = 0; $maxX = $source.Width - 1; $maxY = $source.Height - 1 }
# Expand a bit for sampling error
$minX = [Math]::Max(0, $minX - $step)
$minY = [Math]::Max(0, $minY - $step)
$maxX = [Math]::Min($source.Width - 1, $maxX + $step)
$maxY = [Math]::Min($source.Height - 1, $maxY + $step)
$bw = $maxX - $minX + 1
$bh = $maxY - $minY + 1
Write-Host "Crop: ($minX,$minY) ${bw}x${bh}"

$cropped = New-Object System.Drawing.Bitmap $bw, $bh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCrop = [System.Drawing.Graphics]::FromImage($cropped)
$gCrop.DrawImage($source, (New-Object System.Drawing.Rectangle 0,0,$bw,$bh), $minX, $minY, $bw, $bh, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()

function Resize-Square([System.Drawing.Image]$img, [int]$size, [bool]$roundClip, [System.Drawing.Color]$fill) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gr = [System.Drawing.Graphics]::FromImage($bmp)
  $gr.Clear($fill)
  $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($roundClip) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size - 1, $size - 1)
    $gr.SetClip($path)
    $path.Dispose()
  }
  $gr.DrawImage($img, 0, 0, $size, $size)
  $gr.Dispose()
  return $bmp
}

$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

$master = Resize-Square $cropped 1024 $false $white
$master.Save((Join-Path $WebPublic 'nega-pos-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
(Resize-Square $cropped 192 $false $white).Save((Join-Path $WebPublic 'favicon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Web icons written"

$densities = [ordered]@{
  'mipmap-mdpi' = @(48, 108)
  'mipmap-hdpi' = @(72, 162)
  'mipmap-xhdpi' = @(96, 216)
  'mipmap-xxhdpi' = @(144, 324)
  'mipmap-xxxhdpi' = @(192, 432)
}

foreach ($folder in $densities.Keys) {
  $dir = Join-Path $MobileRes $folder
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $launchSize = $densities[$folder][0]
  $fgSize = $densities[$folder][1]

  $launcher = Resize-Square $cropped $launchSize $false $white
  $round = Resize-Square $cropped $launchSize $true $white

  $fg = New-Object System.Drawing.Bitmap $fgSize, $fgSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $fgG = [System.Drawing.Graphics]::FromImage($fg)
  $fgG.Clear($transparent)
  $fgG.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $fgG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $pad = [int][Math]::Round($fgSize * 0.10)
  $inner = $fgSize - (2 * $pad)
  $fgG.DrawImage($cropped, $pad, $pad, $inner, $inner)
  $fgG.Dispose()

  $launcher.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $round.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $fg.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $launcher.Dispose(); $round.Dispose(); $fg.Dispose()
  Write-Host "Android $folder"
}

$splash = Resize-Square $cropped 512 $false $white
$splashDirs = @(
  'drawable',
  'drawable-port-mdpi','drawable-port-hdpi','drawable-port-xhdpi','drawable-port-xxhdpi','drawable-port-xxxhdpi',
  'drawable-land-mdpi','drawable-land-hdpi','drawable-land-xhdpi','drawable-land-xxhdpi','drawable-land-xxxhdpi'
)
foreach ($sd in $splashDirs) {
  $sdir = Join-Path $MobileRes $sd
  if (Test-Path $sdir) {
    $splash.Save((Join-Path $sdir 'splash.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  }
}
$splash.Dispose()

$master.Dispose(); $cropped.Dispose(); $source.Dispose()
Remove-Item (Join-Path $WebPublic '_icon-src.png') -ErrorAction SilentlyContinue
Write-Host 'Brand icons applied.'
