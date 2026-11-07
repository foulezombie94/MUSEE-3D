@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVEUR.ps1" -Jeu
if errorlevel 1 pause
