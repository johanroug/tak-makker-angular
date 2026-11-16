$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$public = Join-Path $PSScriptRoot '../public'
$svg = Get-Content (Join-Path $public 'brand-preview/reference-symbol-optimized.svg') -Raw
$encoded = [regex]::Match($svg, 'base64,([^"\s]+)').Groups[1].Value
$stream = [System.IO.MemoryStream]::new([Convert]::FromBase64String($encoded))
$source = [System.Drawing.Bitmap]::new($stream)

# Bake the existing SVG's paper-removal filter into the image for all formats.
for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)
        $alpha = [int][Math]::Clamp(8 * 255 - 3 * ($pixel.R + $pixel.G + $pixel.B), 0, 255)
        $source.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
    }
}

function New-IconPng([int]$size, [bool]$opaque = $false, [double]$scale = 1) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    if ($opaque) { $graphics.Clear([System.Drawing.Color]::White) }
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $extent = [int]($size * $scale)
    $offset = [int](($size - $extent) / 2)
    $graphics.DrawImage($source, $offset, $offset, $extent, $extent)
    $png = [System.IO.MemoryStream]::new()
    $bitmap.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $png.ToArray()
    $graphics.Dispose()
    $bitmap.Dispose()
    $png.Dispose()
    return ,$bytes
}

$sizes = @(16, 32, 48)
$images = @($sizes | ForEach-Object { ,(New-IconPng $_) })
$file = [System.IO.File]::Create((Join-Path $public 'favicon.ico'))
$writer = [System.IO.BinaryWriter]::new($file)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$sizes.Count)
$position = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $writer.Write([byte]$sizes[$i]); $writer.Write([byte]$sizes[$i])
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$position)
    $position += $images[$i].Length
}
foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
$writer.Dispose()

[System.IO.File]::WriteAllBytes((Join-Path $public 'apple-touch-icon.png'), (New-IconPng 180 $true 0.8))
foreach ($size in @(192, 512)) {
    [System.IO.File]::WriteAllBytes((Join-Path $public "icons/icon-$size.png"), (New-IconPng $size))
}
# Keep the symbol within the central maskable safe zone on an opaque background.
[System.IO.File]::WriteAllBytes((Join-Path $public 'icons/icon-maskable-512.png'), (New-IconPng 512 $true 0.6))
$base64 = [Convert]::ToBase64String((New-IconPng 174))
$faviconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 174 174"><image width="174" height="174" href="data:image/png;base64,' + $base64 + '"/></svg>'
[System.IO.File]::WriteAllText((Join-Path $public 'favicon.svg'), $faviconSvg)
$source.Dispose()
$stream.Dispose()
