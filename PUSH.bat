@echo off
title Git Push - Mentalist Stars
color 0B

echo.
echo ====================================
echo   GIT PUSH - MENTALIST STARS
echo ====================================
echo.

REM Run the PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0push-to-git.ps1"

pause
