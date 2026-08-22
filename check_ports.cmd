@echo off
cd /d "E:\purchasing system"
netstat -ano | findstr ":3000" > ports-check.txt
netstat -ano | findstr ":8000" >> ports-check.txt
exit /b 0
