@echo off
echo Starting AIKO Backend Server...

REM Start the server in the background and wait a bit
start /B node server.js

REM Wait for 2 seconds to let the server start
timeout /t 2 /nobreak > nul

echo Launching AIKO Interface...

REM Chrome tarayıcısını app modunda başlatıyoruz:
start chrome --app=http://localhost:3000 --window-size=400,600 --window-position=center --user-data-dir="%LOCALAPPDATA%\AIKO_Chrome_Profile"

echo AIKO is running. Close this window to stop the background server? (Actually it runs in background, you might need to kill node process if you want to fully stop it from here).
