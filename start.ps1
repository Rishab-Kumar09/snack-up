# Build the React app
npm run build
if ($LASTEXITCODE -eq 0) {
    # If build succeeds, start the server
    npm run server
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
} 