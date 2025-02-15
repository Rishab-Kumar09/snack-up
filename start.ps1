# Build the React app
npm run build

# If build is successful, start the server
if ($LASTEXITCODE -eq 0) {
    npm run server
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
} 