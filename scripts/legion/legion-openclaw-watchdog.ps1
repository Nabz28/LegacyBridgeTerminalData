param(
  [int]$CooldownSeconds = 300,
  [int]$StatusTimeoutSeconds = 75,
  [int]$PostRestartWaitSeconds = 150,
  [int]$StartupGraceSeconds = 240
)

$ErrorActionPreference = "Stop"

$homeDir = [Environment]::GetFolderPath("UserProfile")
$stateDir = Join-Path $homeDir ".openclaw"
$logDir = Join-Path $stateDir "logs"
$watchdogLog = Join-Path $logDir "legion-openclaw-watchdog.log"
$statePath = Join-Path $logDir "legion-openclaw-watchdog-state.json"
$openclaw = "openclaw.cmd"
$gatewayPattern = "*openclaw*gateway*18789*"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-WatchdogLog {
  param([string]$Message)
  $stamp = (Get-Date).ToString("s")
  Add-Content -LiteralPath $watchdogLog -Value "[$stamp] $Message"
}

function Invoke-WithTimeout {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [int]$TimeoutSeconds
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $escapedArgs = @()
  foreach ($arg in $Arguments) {
    if ($arg -match '[\s"]') {
      $escapedArgs += '"' + ($arg -replace '"', '\"') + '"'
    } else {
      $escapedArgs += $arg
    }
  }
  $psi.Arguments = $escapedArgs -join " "
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()

  if (-not $proc.WaitForExit($TimeoutSeconds * 1000)) {
    try { $proc.Kill($true) } catch {}
    return @{
      TimedOut = $true
      ExitCode = $null
      Stdout = ""
      Stderr = "Timed out after $TimeoutSeconds seconds"
    }
  }

  return @{
    TimedOut = $false
    ExitCode = $proc.ExitCode
    Stdout = $proc.StandardOutput.ReadToEnd()
    Stderr = $proc.StandardError.ReadToEnd()
  }
}

function Read-State {
  if (-not (Test-Path -LiteralPath $statePath)) {
    return @{ LastRestartUtc = $null; RestartCount = 0 }
  }

  try {
    $raw = Get-Content -LiteralPath $statePath -Raw
    if (-not $raw.Trim()) { return @{ LastRestartUtc = $null; RestartCount = 0 } }
    $parsed = $raw | ConvertFrom-Json
    return @{
      LastRestartUtc = $parsed.LastRestartUtc
      RestartCount = [int]($parsed.RestartCount)
    }
  } catch {
    return @{ LastRestartUtc = $null; RestartCount = 0 }
  }
}

function Write-State {
  param([hashtable]$State)
  $State | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Get-RecentOpenClawLogText {
  $today = Get-Date -Format "yyyy-MM-dd"
  $logPath = Join-Path $env:TEMP "openclaw\openclaw-$today.log"
  if (-not (Test-Path -LiteralPath $logPath)) { return "" }
  try {
    $lines = @(Get-Content -LiteralPath $logPath -Tail 350 -ErrorAction Stop)
    $lastReadyIndex = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -like '*"message":"gateway ready"*' -or $lines[$i] -like '*gateway ready*') {
        $lastReadyIndex = $i
      }
    }
    if ($lastReadyIndex -ge 0 -and $lastReadyIndex -lt ($lines.Count - 1)) {
      return ($lines[($lastReadyIndex + 1)..($lines.Count - 1)]) -join "`n"
    }
    return $lines -join "`n"
  } catch {
    return ""
  }
}

function Test-TcpPort {
  param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 18789,
    [int]$TimeoutMs = 2500
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      return $false
    }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    try { $client.Close() } catch {}
  }
}

function Test-RecentStallSignature {
  $recentLog = Get-RecentOpenClawLogText
  $stallPatterns = @(
    "stalled session:",
    "active_work_without_progress",
    "Polling stall detected",
    "gateway readiness unavailable"
  )

  foreach ($pattern in $stallPatterns) {
    if ($recentLog -like "*$pattern*") {
      $state = Read-State
      $lastRestart = $state.LastRestartUtc
      if ($lastRestart) {
        $lastRestartTime = [DateTime]::Parse($lastRestart).ToUniversalTime()
        if (((Get-Date).ToUniversalTime() - $lastRestartTime).TotalSeconds -lt 300) {
          continue
        }
      }
      return "recent stall signature: $pattern"
    }
  }

  return $null
}

function Test-GatewayHealth {
  $gatewayProcess = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like $gatewayPattern } |
    Select-Object -First 1
  $gatewayAgeSeconds = $null
  if ($gatewayProcess) {
    try {
      $startTime = [System.Management.ManagementDateTimeConverter]::ToDateTime($gatewayProcess.CreationDate)
      $gatewayAgeSeconds = ((Get-Date) - $startTime).TotalSeconds
    } catch {}
  }

  if (-not $gatewayProcess) {
    return @{ Healthy = $false; Reason = "gateway process missing"; Raw = "" }
  }

  $tcpOpen = Test-TcpPort
  if (-not $tcpOpen) {
    if ($null -ne $gatewayAgeSeconds -and $gatewayAgeSeconds -lt $StartupGraceSeconds) {
      return @{ Healthy = $true; Reason = "startup grace while tcp closed"; Raw = "" }
    }
    return @{ Healthy = $false; Reason = "gateway tcp port closed"; Raw = "" }
  }

  $healthProbe = Invoke-WithTimeout -FilePath $openclaw -Arguments @("gateway", "health") -TimeoutSeconds $StatusTimeoutSeconds
  if (-not $healthProbe.TimedOut -and $healthProbe.ExitCode -eq 0 -and $healthProbe.Stdout -match "OK") {
    $stallReason = Test-RecentStallSignature
    if ($stallReason) { return @{ Healthy = $false; Reason = $stallReason; Raw = "" } }
    return @{ Healthy = $true; Reason = "ok"; Raw = $healthProbe.Stdout }
  }

  $stallReasonAfterProbeFailure = Test-RecentStallSignature
  if ($stallReasonAfterProbeFailure) {
    return @{ Healthy = $false; Reason = $stallReasonAfterProbeFailure; Raw = $healthProbe.Stderr }
  }

  return @{ Healthy = $true; Reason = "tcp open; gateway health probe slow"; Raw = $healthProbe.Stderr }
}

function Restart-OpenClawGateway {
  param([string]$Reason)

  Write-WatchdogLog "restart requested: $Reason"
  $restart = Invoke-WithTimeout -FilePath $openclaw -Arguments @("gateway", "restart") -TimeoutSeconds 60
  Write-WatchdogLog "gateway restart exit=$($restart.ExitCode) timeout=$($restart.TimedOut)"
  Start-Sleep -Seconds $PostRestartWaitSeconds

  $health = Test-GatewayHealth
  if ($health.Healthy) {
    Write-WatchdogLog "recovered after normal restart"
    return $true
  }

  Write-WatchdogLog "normal restart did not recover: $($health.Reason); forcing gateway process restart"
  $gatewayProcesses = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like $gatewayPattern }

  foreach ($proc in $gatewayProcesses) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-WatchdogLog "killed gateway process pid=$($proc.ProcessId)"
    } catch {
      Write-WatchdogLog "failed killing gateway process pid=$($proc.ProcessId): $($_.Exception.Message)"
    }
  }

  Start-Sleep -Seconds 5
  $start = Invoke-WithTimeout -FilePath $openclaw -Arguments @("gateway", "start") -TimeoutSeconds 60
  Write-WatchdogLog "gateway start exit=$($start.ExitCode) timeout=$($start.TimedOut)"
  Start-Sleep -Seconds $PostRestartWaitSeconds

  $finalHealth = Test-GatewayHealth
  if ($finalHealth.Healthy) {
    Write-WatchdogLog "recovered after forced restart"
    return $true
  }

  Write-WatchdogLog "still unhealthy after forced restart: $($finalHealth.Reason)"
  return $false
}

$state = Read-State
$health = Test-GatewayHealth
if ($health.Healthy) {
  Write-WatchdogLog "healthy"
  exit 0
}

$nowUtc = (Get-Date).ToUniversalTime()
if ($state.LastRestartUtc) {
  $lastRestartUtc = [DateTime]::Parse($state.LastRestartUtc).ToUniversalTime()
  $ageSeconds = ($nowUtc - $lastRestartUtc).TotalSeconds
  if ($ageSeconds -lt $CooldownSeconds) {
    Write-WatchdogLog "unhealthy but inside cooldown ($([int]$ageSeconds)s): $($health.Reason)"
    exit 0
  }
}

$state.LastRestartUtc = $nowUtc.ToString("o")
$restartCount = 0
if ($state.ContainsKey("RestartCount") -and $null -ne $state.RestartCount) {
  $restartCount = [int]$state.RestartCount
}
$state.RestartCount = $restartCount + 1
Write-State -State $state

$ok = Restart-OpenClawGateway -Reason $health.Reason
if ($ok) { exit 0 }
exit 2

