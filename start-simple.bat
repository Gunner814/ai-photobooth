@echo off
title AI Photo Booth - Simple HTTP Server
color 0C

echo.
echo ==========================================
echo   Red Cross Youth AI Photo Booth
echo   Simple HTTP Server (Camera may not work)
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python from python.org
    pause
    exit /b 1
)

echo ✅ Python detected
echo.
echo 🌐 Starting HTTP server at: http://localhost:8000
echo.
echo ⚠️  WARNING: Camera access may not work over HTTP!
echo 💡 Use start-photobooth.bat for HTTPS (recommended)
echo.
echo 📋 Instructions:
echo    1. Open http://localhost:8000 in your browser
echo    2. Allow camera access (may not work over HTTP)
echo    3. Try the photo booth features
echo.
echo 🛑 Press Ctrl+C to stop
echo.

python -m http.server 8000

echo.
echo 👋 Server stopped.
pause