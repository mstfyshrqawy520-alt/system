$ErrorActionPreference = 'Stop'
$project = 'E:\purchasing system'
$logDir = Join-Path $project 'storage\demo-runtime'
New-Item -ItemType Directory -Force $logDir | Out-Null
$ssh = Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
& $ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:3000 nokey@localhost.run
