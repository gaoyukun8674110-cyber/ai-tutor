$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$Python = Join-Path $Backend '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $Python)) {
    $Python = 'python'
}

Push-Location $Backend
try {
    & $Python -m unittest discover -s tests -v
}
finally {
    Pop-Location
}

Push-Location $Frontend
try {
    npm.cmd run test:run
    npm.cmd run type-check
    npm.cmd run build
}
finally {
    Pop-Location
}
