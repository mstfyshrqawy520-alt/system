$ErrorActionPreference = 'Stop'
$project = 'E:\purchasing system'
Set-Location $project
& npm run dev -- --host 0.0.0.0 --port 3000
