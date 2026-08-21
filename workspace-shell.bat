@echo off
setlocal
chcp 65001 >nul
title Mineradio Workspace Shell

set "APP_DIR=%~dp0"
call "%APP_DIR%scripts\workspace-env.bat" || exit /b 1
cd /d "%APP_DIR%" || exit /b 1

echo Mineradio workspace environment is active.
echo Project: %APP_DIR%
echo Data:    %MINERADIO_WORKSPACE_STATE_DIR%
echo.
cmd /k
