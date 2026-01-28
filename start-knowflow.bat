@echo off
REM Know-Flow Launcher for Windows Users
REM Double-click this file to start Know-Flow

REM Check if .env exists
if not exist .env (
    echo.
    echo ERROR: .env file not found!
    echo.
    echo Please copy .env.user.example to .env and edit it with:
    echo   - Your username
    echo   - Path to the shared admin templates
    echo.
    pause
    exit /b 1
)

echo Starting Know-Flow...
echo.
docker-compose -f docker-compose.user.yml up --build

pause
