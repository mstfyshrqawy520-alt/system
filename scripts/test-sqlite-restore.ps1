Set-Location $PSScriptRoot\..

$currentFile = Get-ChildItem database\*.sqlite | Select-Object -First 1
$backupFile = Get-ChildItem storage\app\backups\qa\procurement_*.sqlite | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $currentFile -or -not $backupFile) {
    throw 'SQLite database or backup file was not found.'
}

$tempFile = Join-Path (Get-Location) 'storage\app\backups\qa\restore_test.sqlite'
Copy-Item $currentFile.FullName $tempFile -Force
$env:DB_DATABASE = $tempFile
try {
    & C:\php\php.exe artisan db:restore $backupFile.FullName --force
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
    Write-Output 'RESTORE_TEST_PASS'
}
finally {
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    Get-ChildItem storage\app\backups\before_restore_*.sqlite -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}
