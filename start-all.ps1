# ============================================
# Penguin Magic - All Services Launcher
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Penguin Magic - One-Click Launcher   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path (Split-Path -Parent $ROOT_DIR) "PenguinManage"
$ADMIN_DIR = Join-Path $BACKEND_DIR "admin-panel"

# Check directories
if (-not (Test-Path $BACKEND_DIR)) {
    Write-Host "[ERROR] Backend directory not found: $BACKEND_DIR" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ADMIN_DIR)) {
    Write-Host "[ERROR] Admin panel directory not found: $ADMIN_DIR" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Frontend: $ROOT_DIR" -ForegroundColor Gray
Write-Host "[INFO] Backend: $BACKEND_DIR" -ForegroundColor Gray
Write-Host "[INFO] Admin Panel: $ADMIN_DIR" -ForegroundColor Gray
Write-Host ""

# Kill process by port function
function Kill-PortProcess {
    param([int]$Port)
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connection) {
            $processId = $connection.OwningProcess | Select-Object -First 1
            if ($processId -and $processId -ne 0) {
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "[WARN] Port $Port occupied by $($proc.ProcessName) (PID: $processId), killing..." -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 500
                    Write-Host "[OK] Port $Port released" -ForegroundColor Green
                }
            }
        }
    } catch {
        # Ignore errors
    }
}

# Check and kill occupied ports
Write-Host "[CHECK] Checking port availability..." -ForegroundColor Cyan
Kill-PortProcess -Port 5176
Kill-PortProcess -Port 3000
Kill-PortProcess -Port 5174
Write-Host ""

# Start backend service (port 3000)
Write-Host "[START] Starting backend service..." -ForegroundColor Yellow
$backendCmd = "cd `"$BACKEND_DIR`"; Write-Host 'Backend Service - Port 3000' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 2

# Start frontend service (port 5176)
Write-Host "[START] Starting frontend client..." -ForegroundColor Yellow
$frontendCmd = "cd `"$ROOT_DIR`"; Write-Host 'Frontend Client - Port 5176' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 2

# Start admin panel (port 5174)
Write-Host "[START] Starting admin panel..." -ForegroundColor Yellow
$adminCmd = "cd `"$ADMIN_DIR`"; Write-Host 'Admin Panel - Port 5174' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $adminCmd

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services started successfully!   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:5176" -ForegroundColor White
Write-Host "  Backend:     http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Panel: http://localhost:5174" -ForegroundColor White
Write-Host ""
Write-Host "  Close terminal windows to stop services" -ForegroundColor Gray
Write-Host ""

# Wait and open browser
Start-Sleep -Seconds 5
Write-Host "[BROWSER] Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5176"
