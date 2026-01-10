@echo off
title LineART Server
cls
:start
echo ==========================================
echo Starting LineART Server...
echo Opening application in browser...
echo ==========================================
start http://localhost:3000
node server.js
echo.
echo ==========================================
echo Server stopped unexpectedly.
echo Press any key to restart...
echo ==========================================
pause
goto start
