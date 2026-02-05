@echo off
SETLOCAL EnableDelayedExpansion

:: Check if .git folder exists
IF NOT EXIST ".git" (
    echo [ERROR] This directory is not a Git repository.
    echo Initializing git...
    git init
)

:: Get current date and time for the commit message
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set YYYY=%datetime:~0,4%
set MM=%datetime:~4,2%
set DD=%datetime:~6,2%
set HH=%datetime:~8,2%
set Min=%datetime:~10,2%
set Sec=%datetime:~12,2%

set COMMIT_MSG=Auto update: %YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%

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
