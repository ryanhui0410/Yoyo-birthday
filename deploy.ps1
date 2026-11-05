Write-Host "Cleaning old dist..."
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "public\update") { Remove-Item -Recurse -Force "public\update" }

Write-Host "Building web assets..."
npm run build

Write-Host "Pushing to gh-pages..."
Set-Location dist

# Add a cache-busting file
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
"{`"version`":`"$timestamp`"}" | Out-File "version.json" -Encoding utf8

git init
git checkout -b gh-pages
git add .
git commit -m "update $timestamp"
git push -f https://github.com/ryanhui0410/Yoyo-birthday.git gh-pages

Set-Location ..
Write-Host "Done! Wait 1-2 minutes for CDN cache to clear."