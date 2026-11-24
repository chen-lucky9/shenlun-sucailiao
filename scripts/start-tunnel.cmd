@echo off
cd /d "%~dp0.."
set "CF=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not exist "%CF%" set "CF=cloudflared"
echo Starting Cloudflare quick tunnel for http://127.0.0.1:3000 ...
echo Keep this window open. Press Ctrl+C to stop.
echo.
"%CF%" tunnel --url http://127.0.0.1:3000 --no-autoupdate
pause
