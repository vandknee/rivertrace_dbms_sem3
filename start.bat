@echo off
cd /d "%~dp0"
node --version
if errorlevel 1 exit /b 1
cmake -S . -B build -G "MinGW Makefiles"
if errorlevel 1 exit /b 1
cmake --build build -j 2
if errorlevel 1 exit /b 1
node server.js
