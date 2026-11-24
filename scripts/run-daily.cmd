@echo off
cd /d "%~dp0.."
set "NODE=C:\Users\chenyiyuan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" src/daily.js >> "data\daily-job.log" 2>&1
