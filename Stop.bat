@echo off
setlocal
title Legacy Bridge Terminal - Stop

echo Stopping Legacy Bridge Terminal...

REM Kill by listening port (precise — won't touch unrelated node/python).
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":4173 "') do (
  echo  - killing pid %%P on :4173
  taskkill /PID %%P /F >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5174 "') do (
  echo  - killing pid %%P on :5174
  taskkill /PID %%P /F >nul 2>&1
)

REM Also close the titled cmd windows the Quickstart spawned, if still open.
taskkill /FI "WINDOWTITLE eq Legacy Bridge - Macro Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Legacy Bridge - Correlation Backend*" /F >nul 2>&1

echo Done.
ping -n 3 127.0.0.1 >nul
endlocal
exit /b 0
