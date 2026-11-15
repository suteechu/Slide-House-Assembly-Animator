@echo off
cd /d "%~dp0"
title Integrated Design & BOM Automation V4
where node >nul 2>nul
if errorlevel 1 goto missing
if not exist node_modules\vite\bin\vite.js (
  echo Installing React, Vite, Tailwind and Framer Motion. Internet is required once.
  call npm install --fetch-retries=0 --fetch-timeout=20000
  if errorlevel 1 goto failed
)
echo Building Ver4...
call npm run build
if errorlevel 1 goto failed
echo Open http://127.0.0.1:8787 in Chrome after the ready message below.
node server.cjs
pause
exit /b
:missing
echo Node.js is required to run Integrated Design ^& BOM Automation V4.
pause
exit /b 1
:failed
echo Ver4 could not be installed or built. Please inspect the error shown above.
pause
exit /b 1
