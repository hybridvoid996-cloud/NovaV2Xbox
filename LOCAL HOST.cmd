@echo off
setlocal
title NOVA - LOCAL HOST
cd /d "%~dp0"
set "NOVA_LAUNCH_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 set "NOVA_LAUNCH_NODE=%ProgramFiles%\nodejs\node.exe"
"%NOVA_LAUNCH_NODE%" "%~dp0LOCAL HOST.cjs"
if errorlevel 1 pause
endlocal
