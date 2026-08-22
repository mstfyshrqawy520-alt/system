$ErrorActionPreference = 'Stop'
$project = 'E:\purchasing system'
$php = Join-Path $project 'php_bin\php.exe'
Set-Location $project
& $php artisan serve --host=0.0.0.0 --port=8000
