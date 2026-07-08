param(
  [Parameter(Mandatory = $true)][string]$SourcePng,
  [Parameter(Mandatory = $true)][string]$DestPng
)

Add-Type -AssemblyName System.Drawing

function New-RoundIconBitmap {
  param(
    [System.Drawing.Image]$Source,
    [int]$Size
  )

  $canvas = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clipPath.AddEllipse(0, 0, $Size - 1, $Size - 1)
  $graphics.SetClip($clipPath)

  $scale = [Math]::Min($Size / $Source.Width, $Size / $Source.Height)
  $width = [int][Math]::Round($Source.Width * $scale)
  $height = [int][Math]::Round($Source.Height * $scale)
  $x = [int][Math]::Round(($Size - $width) / 2)
  $y = [int][Math]::Round(($Size - $height) / 2)

  $imageAttr = New-Object System.Drawing.Imaging.ImageAttributes
  $imageAttr.SetColorKey(
    [System.Drawing.Color]::FromArgb(0, 0, 0),
    [System.Drawing.Color]::FromArgb(40, 40, 40)
  )

  $destRect = New-Object System.Drawing.Rectangle $x, $y, $width, $height
  $graphics.DrawImage(
    $Source,
    $destRect,
    0,
    0,
    $Source.Width,
    $Source.Height,
    [System.Drawing.GraphicsUnit]::Pixel,
    $imageAttr
  )
  $imageAttr.Dispose()
  $graphics.Dispose()
  $clipPath.Dispose()

  return $canvas
}

$source = [System.Drawing.Image]::FromFile($SourcePng)

try {
  $bitmap = New-RoundIconBitmap -Source $source -Size 256
  $bitmap.Save($DestPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
} finally {
  $source.Dispose()
}
