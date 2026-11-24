# 以管理员身份运行本脚本：放行 TCP 3000 入站，供手机在同一局域网访问
# 用法：右键本文件 -> "使用 PowerShell 运行"（或先打开管理员 PowerShell 再执行）

$ErrorActionPreference = 'Stop'
$port = 3000
$ruleName = 'Shenlun-Sucailiao-3000'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host '需要管理员权限。请右键本文件 -> “使用 PowerShell 运行”，或在管理员 PowerShell 中执行：' -ForegroundColor Yellow
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Read-Host '按回车退出'
  exit 1
}

if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
}
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private,Public | Out-Null

Write-Host "已放行 TCP $port（Private / Public 入站）。" -ForegroundColor Green
Write-Host '手机连接与本机相同的 Wi-Fi 后，访问 http://<本机局域网IP>:'$port
Write-Host '（本机 IP 可在服务启动日志中查看，或用 ipconfig 查看 WLAN 的 IPv4 地址）'
Read-Host '按回车退出'
