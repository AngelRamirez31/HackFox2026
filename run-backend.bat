@echo off
cd /d "%~dp0backend"
dotnet restore
dotnet run
pause
