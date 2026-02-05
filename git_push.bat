@echo off
SETLOCAL EnableDelayedExpansion

:: Check if .git folder exists
IF NOT EXIST ".git" (
    echo [ERROR] This directory is not a Git repository.
    echo Initializing git...
    git init
)

:: Get current date and time for the commit message using PowerShell (more robust)
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set TIMESTAMP=%%I

set COMMIT_MSG=Auto update: %TIMESTAMP%

echo.
echo === Git Update Process Started ===
echo.

:: Stage all changes
echo [1/3] Staging changes...
git add .
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to stage changes.
    goto :error
)

:: Commit changes
echo [2/3] Committing changes...
git commit -m "%COMMIT_MSG%"
IF %ERRORLEVEL% NEQ 0 (
    :: Error level 1 often means nothing to commit
    git status | findstr "nothing to commit" > nul
    IF %ERRORLEVEL% EQU 0 (
        echo [INFO] Nothing to commit, working tree clean.
    ) ELSE (
        echo [ERROR] Failed to commit changes.
        goto :error
    )
)

:: Push changes
echo [3/3] Pushing to remote...
git push
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to push changes. Check if remote is configured or if there are conflicts.
) ELSE (
    echo [SUCCESS] Push completed.
)

echo.
echo === Git Update Process Finished ===
echo.
pause
exit /b 0

:error
echo.
echo [FATAL] Git update failed.
pause
exit /b 1
