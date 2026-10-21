@echo off
title Chomchee Discord Bot
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo    Chomchee Discord Bot - Anti Spam
echo ============================================
echo.

:start
call npm start
echo.
echo [33mBot หยุดทำงานแล้ว กำลังรีสตาร์ทใน 5 วินาที... (กด Ctrl+C เพื่อออก)[0m
timeout /t 5 /nobreak >nul
goto start