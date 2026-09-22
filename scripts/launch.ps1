# FoodSpots one-click launcher
# Starts PostgreSQL (Docker), applies migrations, seeds on first run,
# launches the API server and the web client, then opens the browser.

$ErrorActionPreference = 'Stop'

# --- Resolve repo root (this script lives in <root>\scripts) ---
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Host.UI.RawUI.WindowTitle = 'FoodSpots Launcher'

function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    $msg"   -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    $msg"   -ForegroundColor Yellow }

function Fail($msg) {
    Write-Host "`nERROR: $msg" -ForegroundColor Red
    Write-Host "`nPress any key to close..." -ForegroundColor DarkGray
    [void]$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host "======================================" -ForegroundColor Magenta
Write-Host "        FoodSpots  -  Startup"          -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

# --- 0. Sanity: required tooling ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed or not on PATH. Install Docker Desktop first: https://www.docker.com/products/docker-desktop/"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail "Node.js/npm is not installed or not on PATH. Install Node.js first: https://nodejs.org/"
}

# --- 1. Make sure the Docker engine is running (start Docker Desktop if needed) ---
Write-Step "Checking Docker engine..."
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Warn2 "Docker engine not responding - trying to start Docker Desktop..."
    $dd = Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dd) {
        Start-Process $dd | Out-Null
    } else {
        Fail "Could not find Docker Desktop. Start it manually, then run this again."
    }

    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Write-Host "    ...waiting for Docker to be ready" -ForegroundColor DarkGray
    }
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Fail "Docker Desktop did not become ready in time. Start it manually, then run this again."
    }
}
Write-Ok "Docker engine is running."

# --- 2. Start PostgreSQL ---
Write-Step "Starting PostgreSQL container..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed." }

Write-Host "    Waiting for the database to be healthy..." -NoNewline
$deadline = (Get-Date).AddMinutes(2)
$healthy = $false
while ((Get-Date) -lt $deadline) {
    $status = (docker inspect --format '{{.State.Health.Status}}' foodspots-db 2>$null)
    if ($status -eq 'healthy') { $healthy = $true; break }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}
Write-Host ""
if (-not $healthy) { Fail "Database did not become healthy in time." }
Write-Ok "Database is healthy."

# --- 3. Ensure .env files exist ---
Write-Step "Checking environment files..."
foreach ($part in 'server','client') {
    $env  = Join-Path $Root "$part\.env"
    $samp = Join-Path $Root "$part\.env.example"
    if (-not (Test-Path $env) -and (Test-Path $samp)) {
        Copy-Item $samp $env
        Write-Warn2 "Created $part\.env from .env.example"
    }
}
Write-Ok "Environment files present."

# --- 4. Install dependencies if missing ---
foreach ($part in 'server','client') {
    if (-not (Test-Path (Join-Path $Root "$part\node_modules"))) {
        Write-Step "Installing $part dependencies (first run, this can take a while)..."
        Push-Location (Join-Path $Root $part)
        npm install
        $code = $LASTEXITCODE
        Pop-Location
        if ($code -ne 0) { Fail "npm install failed in $part." }
    }
}

# --- 5. Apply database migrations (idempotent) ---
Write-Step "Applying database migrations..."
Push-Location (Join-Path $Root 'server')
npx prisma migrate deploy
$code = $LASTEXITCODE
if ($code -eq 0) { npx prisma generate | Out-Null }
Pop-Location
if ($code -ne 0) { Fail "prisma migrate deploy failed." }
Write-Ok "Migrations applied."

# --- 6. Seed sample data on first run only ---
$marker = Join-Path $Root '.launcher-state\seeded'
if (-not (Test-Path $marker)) {
    Write-Step "Seeding sample data (first run only)..."
    Push-Location (Join-Path $Root 'server')
    npm run seed
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) {
        Write-Warn2 "Seeding failed - the app will still start, but there may be no sample data."
    } else {
        New-Item -ItemType Directory -Force (Split-Path $marker) | Out-Null
        Set-Content -Path $marker -Value (Get-Date).ToString('o') -Encoding utf8
        Write-Ok "Sample data loaded. (Delete .launcher-state\seeded to re-seed next launch.)"
    }
} else {
    Write-Ok "Sample data already seeded (skipping)."
}

# --- 7. Launch the API server and the web client in their own windows ---
Write-Step "Starting the API server and web client..."

$serverCmd = "`$Host.UI.RawUI.WindowTitle='FoodSpots Server'; Set-Location '$Root\server'; npm run dev"
$clientCmd = "`$Host.UI.RawUI.WindowTitle='FoodSpots Client'; Set-Location '$Root\client'; npm run dev"

Start-Process powershell -ArgumentList '-NoExit','-Command',$serverCmd | Out-Null
Start-Process powershell -ArgumentList '-NoExit','-Command',$clientCmd | Out-Null
Write-Ok "Server + Client windows opened. Closing them stops the app."

# --- 7b. Public tunnel: expose the API for a hosted frontend (e.g. Vercel) ---
# Preference order:
#   1. ngrok reserved domain (PERMANENT URL) if .launcher-state\ngrok-domain.txt exists
#   2. Cloudflare quick tunnel (random URL each launch) if cloudflared is installed
$tunnelUrl = $null
$stateDir = Join-Path $Root '.launcher-state'
New-Item -ItemType Directory -Force $stateDir | Out-Null
$tunnelLog = Join-Path $stateDir 'tunnel.log'
Remove-Item $tunnelLog -ErrorAction SilentlyContinue
$ngrokDomainFile = Join-Path $stateDir 'ngrok-domain.txt'

if ((Test-Path $ngrokDomainFile) -and (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Step "Starting ngrok tunnel (permanent domain) for the API..."
    $domain = (Get-Content $ngrokDomainFile -Raw).Trim()
    # Closing this window stops the tunnel (like the Server/Client windows).
    $ngCmd = "`$Host.UI.RawUI.WindowTitle='FoodSpots Tunnel'; ngrok http --domain=$domain 4000"
    Start-Process powershell -ArgumentList '-NoExit','-Command',$ngCmd | Out-Null
    $tunnelUrl = "https://$domain"
    Write-Ok "ngrok tunnel starting. Permanent API URL: $tunnelUrl"
} elseif (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Write-Step "Starting Cloudflare quick tunnel for the API..."
    $cfCmd = "`$Host.UI.RawUI.WindowTitle='FoodSpots Tunnel'; cloudflared tunnel --url http://localhost:4000 2>&1 | Tee-Object -FilePath '$tunnelLog'"
    Start-Process powershell -ArgumentList '-NoExit','-Command',$cfCmd | Out-Null

    Write-Host "    Waiting for the public URL..." -NoNewline
    $deadline = (Get-Date).AddSeconds(40)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $tunnelLog) {
            $m = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($m) { $tunnelUrl = $m.Matches[0].Value; break }
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    if ($tunnelUrl) {
        Write-Ok "Public API URL (changes each launch): $tunnelUrl"
    } else {
        Write-Warn2 "Tunnel started but no URL parsed yet - check the 'FoodSpots Tunnel' window."
    }
} else {
    Write-Warn2 "No tunnel tool found - skipping the tunnel (the local app still works)."
    Write-Warn2 "For a permanent URL install ngrok:  winget install --id Ngrok.Ngrok"
}

# --- 8. Wait for the client, then open the browser ---
Write-Step "Waiting for the web client to come up..."
$url = 'http://localhost:5173'
$deadline = (Get-Date).AddMinutes(2)
$up = $false
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -ge 200) { $up = $true; break }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if ($up) {
    Start-Process $url
    Write-Ok "Opened $url in your browser."
} else {
    Write-Warn2 "Client did not respond yet. It may still be starting - open $url manually."
}

Write-Host "`n======================================" -ForegroundColor Magenta
Write-Host " FoodSpots is starting up!"             -ForegroundColor Green
Write-Host "   Web:    http://localhost:5173"        -ForegroundColor Green
Write-Host "   API:    http://localhost:4000/api"    -ForegroundColor Green
Write-Host "   Login:  aditi@foodspots.dev / password123" -ForegroundColor Green
if ($tunnelUrl) {
    Write-Host "   Public API (tunnel): $tunnelUrl/api" -ForegroundColor Green
    Write-Host "--------------------------------------" -ForegroundColor Magenta
    Write-Host " To connect your Vercel frontend:" -ForegroundColor Yellow
    Write-Host "   1) Vercel env:   VITE_API_URL = $tunnelUrl" -ForegroundColor Yellow
    Write-Host "   2) server/.env:  CLIENT_ORIGIN = https://<your-app>.vercel.app" -ForegroundColor Yellow
    Write-Host "      then close the Server window and relaunch so CORS updates." -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "`nThis window can be closed. The Server, Client, and Tunnel windows keep the app running." -ForegroundColor DarkGray
Write-Host "Press any key to close this launcher window..." -ForegroundColor DarkGray
[void]$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
