# LEGION OpenClaw Ops Scripts

These scripts are sanitized repo copies of the local OpenClaw operations scripts.
The live copies run from:

- `C:\Users\DELL\.openclaw\ops\legion-openclaw-watchdog.ps1`
- `C:\Users\DELL\.openclaw\ops\legion-openclaw-smoke.ps1`
- `C:\Users\DELL\.openclaw\ops\legion-brain-sync.ps1`

Do not store secrets here. The scripts load local environment only at runtime.

Install/update the live copies manually after review:

```powershell
Copy-Item .\scripts\legion\legion-openclaw-watchdog.ps1 "$HOME\.openclaw\ops\legion-openclaw-watchdog.ps1" -Force
Copy-Item .\scripts\legion\legion-openclaw-smoke.ps1 "$HOME\.openclaw\ops\legion-openclaw-smoke.ps1" -Force
Copy-Item .\scripts\legion\legion-brain-sync.ps1 "$HOME\.openclaw\ops\legion-brain-sync.ps1" -Force
```

Register the watchdog task:

```powershell
$scriptPath = Join-Path $HOME ".openclaw\ops\legion-openclaw-watchdog.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 6)
Register-ScheduledTask -TaskName "LEGION OpenClaw Watchdog" -Action $action -Trigger $trigger -Settings $settings -Description "LEGION watchdog for OpenClaw Gateway recovery" -Force
```

Register the brain sync task:

```powershell
$scriptPath = Join-Path $HOME ".openclaw\ops\legion-brain-sync.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 3)
Register-ScheduledTask -TaskName "LEGION OpenClaw Brain Sync" -Action $action -Trigger $trigger -Settings $settings -Description "Sync LEGION Supabase brain context into OpenClaw workspace cache" -Force
```
