@echo off
cd /d "E:\purchasing system"
start "eshbelia-backend" /b "C:\php\php.exe" artisan serve --host=0.0.0.0 --port=8000
start "eshbelia-frontend" /b cmd /c "npm run dev -- --host 0.0.0.0 --port 3000"
exit /b 0
