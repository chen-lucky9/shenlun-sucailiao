$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
$node = 'C:\Users\chenyiyuan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $node)) { $node = 'node' }
$log = Join-Path (Get-Location) 'data\daily-job.log'
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -LiteralPath $log -Value "[$stamp] start" -Encoding UTF8
$out = & $node 'src/daily.js' 2>&1 | Out-String
Add-Content -LiteralPath $log -Value $out -Encoding UTF8
Add-Content -LiteralPath $log -Value "[$stamp] end exit=$LASTEXITCODE" -Encoding UTF8
