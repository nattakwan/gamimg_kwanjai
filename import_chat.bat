@echo off
chcp 65001 >nul
echo ========================================================
echo  Antigravity Chat History Importer (Home -^> University)
echo ========================================================
echo.
node "%~dp0scripts\import_chat.cjs"
echo.
pause

