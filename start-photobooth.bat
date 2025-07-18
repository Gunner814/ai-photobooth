@echo off
title Red Cross Youth AI Photo Booth - Local Server
color 0A

echo.
echo ========================================
echo   Red Cross Youth AI Photo Booth
echo   Fiesta 2025 - Local Development Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python %PYTHON_VERSION% detected

REM Check if we're in the right directory
if not exist "index.html" (
    echo ❌ Error: index.html not found
    echo Please run this batch file from the ai-photobooth directory
    echo.
    pause
    exit /b 1
)

if not exist "app.js" (
    echo ❌ Error: app.js not found
    echo Please ensure all project files are present
    echo.
    pause
    exit /b 1
)

echo ✅ Project files found

REM Check for existing certificates
set HTTPS_AVAILABLE=0
if exist "server.crt" if exist "server.key" (
    set HTTPS_AVAILABLE=1
    echo ✅ SSL certificates found - HTTPS enabled
) else (
    echo ⚠️  SSL certificates not found - will create them
)

echo.
echo 🚀 Starting AI Photo Booth server...
echo.
echo 📋 Quick Instructions:
echo    1. Wait for the server to start
echo    2. Open the URL shown below in your browser
echo    3. Accept any security warnings (self-signed certificate)
echo    4. Allow camera access when prompted
echo    5. Have fun with AI face swapping!
echo.
echo 🛑 Press Ctrl+C to stop the server
echo.

REM Try to start the HTTPS server
python server.py

REM If the Python server script fails, fall back to simple HTTP server
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Custom HTTPS server failed, trying simple HTTP server...
    echo ⚠️  Camera may not work over HTTP!
    echo.
    echo 🌐 Starting HTTP server at: http://localhost:8000
    echo 📱 For mobile testing, consider using ngrok or deploying to GitHub Pages
    echo.
    
    python -m http.server 8000
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Failed to start server. Please check:
        echo    - Python is properly installed
        echo    - Port 8000 is not already in use
        echo    - Run as administrator if needed
        echo.
        pause
        exit /b 1
    )
)

echo.
echo 👋 Server stopped. Thanks for using Red Cross Youth AI Photo Booth!
pause