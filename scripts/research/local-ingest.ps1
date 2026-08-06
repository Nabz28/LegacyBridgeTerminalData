<#
  LBC Research — local ingest for sources that block datacenter IPs.

  IDX (idx.co.id) sits behind Cloudflare and returns 403 to every GitHub
  Actions runner, while working normally from an Indonesian residential
  connection. Foreign net buy/sell is one of the highest-signal Indonesian
  datasets, so rather than drop it, this script runs the IDX portion of the
  pipeline from a machine that can actually reach it.

  Everything else in the system runs in the cloud and needs no local machine.
  If this laptop is off, the freshness monitor reports ingest_idx_flow as stale
  rather than pretending the data is current.

  Setup (once):
    setx LBC_SUPABASE_SERVICE_ROLE "<service role key>"

  Run manually:
    powershell -ExecutionPolicy Bypass -File scripts\research\local-ingest.ps1

  Schedule (every weekday 17:15 WIB, after the IDX close):
    schtasks /Create /TN "LBC Research IDX Ingest" /SC WEEKLY /D MON,TUE,WED,THU,FRI `
      /ST 17:15 /TR "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File `
      '<repo>\scripts\research\local-ingest.ps1'" /F

  Remove:
    schtasks /Delete /TN "LBC Research IDX Ingest" /F
#>

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

if (-not $env:SUPABASE_SERVICE_ROLE) {
  if ($env:LBC_SUPABASE_SERVICE_ROLE) {
    $env:SUPABASE_SERVICE_ROLE = $env:LBC_SUPABASE_SERVICE_ROLE
  } else {
    Write-Error "SUPABASE_SERVICE_ROLE not set. Run: setx LBC_SUPABASE_SERVICE_ROLE `"<key>`""
    exit 1
  }
}

$log = Join-Path $repo 'scripts\research\local-ingest.log'
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $log -Value "[$stamp] starting IDX ingest" -Encoding utf8

try {
  $out = & python -X utf8 pipeline/jobs.py ingest_idx 2>&1 | Out-String
  Add-Content -Path $log -Value $out -Encoding utf8
  Write-Output $out
} catch {
  Add-Content -Path $log -Value "FAILED: $_" -Encoding utf8
  Write-Error $_
  exit 1
}
