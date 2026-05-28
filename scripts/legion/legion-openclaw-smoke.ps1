param(
  [switch]$SkipImage
)

$ErrorActionPreference = "Stop"
$homeDir = [Environment]::GetFolderPath("UserProfile")
$tmpDir = Join-Path $homeDir ".openclaw\tmp"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$envPath = Join-Path $homeDir ".openclaw\.env"
if (Test-Path -LiteralPath $envPath) {
  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*#' -or -not $line.Trim()) { continue }
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
  }
}

function Invoke-Checked {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Output "== $Name =="
  try {
    & $Command
    Write-Output "PASS: $Name"
  } catch {
    Write-Output "FAIL: $Name :: $($_.Exception.Message)"
    throw
  }
}

Invoke-Checked "gateway status" {
  $status = openclaw.cmd status --json | ConvertFrom-Json
  if ($status.gateway.reachable -ne $true) { throw "gateway not reachable" }
  "gateway reachable in $($status.gateway.connectLatencyMs)ms"
}

Invoke-Checked "telegram status" {
  $out = openclaw.cmd channels status --deep
  $out
  if (($out -join "`n") -notmatch "Telegram default .*connected") {
    throw "telegram default not connected"
  }
}

Invoke-Checked "skills surface" {
  $skills = openclaw.cmd skills check --json | ConvertFrom-Json
  $visible = @($skills.modelVisible)
  if ($visible -notcontains "legion-brain") { throw "legion-brain not visible" }
  if ($visible.Count -gt 3) { throw "too many visible skills: $($visible -join ', ')" }
  "visible skills: $($visible -join ', ')"
}

Invoke-Checked "brain skill snapshot" {
  $script = Join-Path $homeDir ".openclaw\workspace\skills\legion-brain\scripts\brain-action.mjs"
  $result = node $script brain.snapshot_read "{}" | ConvertFrom-Json
  if (-not $result.id -or $result.type -ne "status_snapshot") { throw "brain snapshot read failed" }
  "snapshot ok: $($result.title)"
}

if (-not $SkipImage) {
  Invoke-Checked "bounded codex image describe" {
    Add-Type -AssemblyName System.Drawing
    $imagePath = Join-Path $tmpDir "legion-smoke-image.png"
    $bmp = New-Object System.Drawing.Bitmap 360, 180
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $font = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("LEGION TEST", $font, [System.Drawing.Brushes]::Black, 35, 60)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, 6)
    $g.DrawRectangle($pen, 20, 20, 320, 140)
    $bmp.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()

    $desc = openclaw.cmd infer image describe --file $imagePath --model codex/gpt-5.5 --prompt "Read the text and describe the simple image in one sentence." --timeout-ms 45000 --json | ConvertFrom-Json
    if ($desc.ok -ne $true) { throw "image describe returned ok=false" }
    $text = $desc.outputs[0].text
    if ($text -notmatch "LEGION TEST") { throw "image description did not read expected text: $text" }
    $text
  }
}

Write-Output "ALL SMOKE TESTS PASSED"

