@echo off
REM Run this every time you want to push an update to users

echo Building web assets...
call npm run build

echo Copying to update folder...
if exist public\update rmdir /s /q public\update
mkdir public\update
xcopy /e /i dist\* public\update\

echo Generating version manifest...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set D=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set T=%%a%%b
set VERSION=%D%%T%
echo {"version":"%VERSION%","url":"./","notes":"Auto-deployed"} > public\update\manifest.json

echo Committing to GitHub...
git pull
git add .
git commit -m "live update %VERSION%"
git push

echo.
echo Done! Update %VERSION% published.
echo Users will get it on next app launch.
pause