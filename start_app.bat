@echo off
echo Starting PMS Server...
start "PMS Server" cmd /k "cd server && npm run dev"

echo Starting PMS Client...
start "PMS Client" cmd /k "cd client && npm run dev"

echo PMS started!
