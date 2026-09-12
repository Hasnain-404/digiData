@echo off
chcp 65001 >nul
title Trading Journal - Excel Watcher
color 0A

REM Set UTF-8 encoding for Python output (fixes emoji/unicode issues)
set PYTHONIOENCODING=utf-8

REM Change to the script directory
cd /d "%~dp0"

echo ============================================================
echo   Trading Journal Excel Watcher
echo   Auto-syncing Excel to Website
echo ============================================================
echo.

REM Install dependencies if not already installed
echo Checking Python dependencies...
python -m pip install -r requirements.txt -q

echo.
echo Starting watcher... (Close this window to stop)
echo.

python watcher.py

pause
