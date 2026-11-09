@echo off
TITLE ISS Live Tracker - Flask Server
COLOR 0B

echo ============================================================
echo   Real-Time International Space Station (ISS) Tracker
echo   Department of Computer Science & Engineering
echo ============================================================
echo.

IF EXIST "venv\Scripts\activate.bat" (
    echo [*] Activating virtual environment...
    call venv\Scripts\activate.bat
) ELSE (
    echo [*] Using system Python environment...
)

echo [*] Starting Flask Application on http://127.0.0.1:5000...
echo [*] Press CTRL+C in this window to stop the server.
echo.

python app.py
pause

