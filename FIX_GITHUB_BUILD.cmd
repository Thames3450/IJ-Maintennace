@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo IJ Maintenance - GitHub Build Fix
echo ========================================
echo.
echo [1/4] Removing node_modules from Git tracking...
git rm -r --cached node_modules 2>nul

echo [2/4] Removing local node_modules...
if exist node_modules rmdir /s /q node_modules

echo [3/4] Staging fix files...
git add .gitignore .github/workflows/deploy-pages.yml package.json
git add -A

echo [4/4] Creating commit and pushing...
git commit -m "Fix GitHub Pages Vite build"
git push origin main

echo.
echo Finished. Open GitHub Actions and wait for Deploy to become green.
pause
