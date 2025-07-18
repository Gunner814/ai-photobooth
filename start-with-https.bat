@echo off
title Red Cross Youth AI Photo Booth - HTTPS Server Setup
color 0A

echo.
echo ============================================
echo   Red Cross Youth AI Photo Booth
echo   HTTPS Server Setup - Fiesta 2025
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Python is not installed
    echo Please install Python from: https://python.org
    pause
    exit /b 1
)

echo ✅ Python detected

REM Install cryptography module for HTTPS certificates
echo.
echo 📦 Installing cryptography module for HTTPS support...
echo This may take a moment...
echo.

pip install cryptography

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Could not install cryptography module
    echo ⚠️  Falling back to HTTP server (camera may not work)
    echo.
    echo 🌐 Starting HTTP server at: http://localhost:8000
    echo.
    python -m http.server 8000
) else (
    echo.
    echo ✅ Cryptography module installed successfully!
    echo 🔒 Starting HTTPS server...
    echo.
    python server.py
)

echo.
echo 👋 Server stopped.
pause