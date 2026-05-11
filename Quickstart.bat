@echo off
setlocal
title Legacy Bridge Terminal - Quickstart

REM Always run from this script's own folder so relative paths resolve.
cd /d "%~dp0"

echo.
echo  ============================================================
echo    Legacy Bridge Terminal - Quickstart
echo    Booting Macro Terminal (:4173) and Correlation Terminal (:5174)
echo  ============================================================
echo.

REM --- Sanity checks ---------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [error] node is not on PATH. Install Node.js then retry.
  pause
  exit /b 1
)
where python >nul 2>&1
if errorlevel 1 (
  echo [error] python is not on PATH. Install Python 3.x then retry.
  pause
  exit /b 1
)

REM --- Free port 4173 if previous instance still running ---------------------
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":4173 "') do (
  echo [info] freeing port 4173 (pid %%P)
  taskkill /PID %%P /F >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5174 "') do (
  echo [info] freeing port 5174 (pid %%P)
  taskkill /PID %%P /F >nul 2>&1
)

REM --- Launch the two servers in their own visible windows -------------------
echo [boot] starting Macro Terminal on http://127.0.0.1:4173
start "Legacy Bridge - Macro Server" cmd /k "cd /d %~dp0 && node scripts\serve.js 4173"

echo [boot] starting Correlation Terminal on http://127.0.0.1:5174
echo        (first boot loads parquets, takes ~12s)
start "Legacy Bridge - Correlation Backend" cmd /k "cd /d %~dp0 && python correlation\ui\backend\app.py"

REM --- Open the welcome screen once the static server is up ------------------
echo [wait] giving servers a moment to bind...
REM Use ping as a portable sleep — works even when PATH shadows timeout.exe.
ping -n 5 127.0.0.1 >nul

echo [open] http://127.0.0.1:4173/
start "" "http://127.0.0.1:4173/"

echo.
echo  ============================================================
echo    Both servers are running in their own windows.
echo    Close those windows (or run Stop.bat) to shut everything down.
echo  ============================================================
echo.
endlocal
exit /b 0
