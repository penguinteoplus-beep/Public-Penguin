# ============================================
# 🐧 企鹅艾洛魔法世界 - 停止所有服务
# ============================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                                                               ║" -ForegroundColor Red
Write-Host "║  🛑 停止所有服务                                              ║" -ForegroundColor Red
Write-Host "║                                                               ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# 查找并停止 node 进程
Write-Host "🔍 正在查找运行中的 Node.js 进程..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "找到 $($nodeProcesses.Count) 个 Node.js 进程" -ForegroundColor Cyan
    
    foreach ($proc in $nodeProcesses) {
        Write-Host "  停止进程: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Write-Host "✅ 所有 Node.js 进程已停止" -ForegroundColor Green
} else {
    Write-Host "ℹ️ 没有找到运行中的 Node.js 进程" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "💡 提示: 也可以直接关闭各个终端窗口来停止服务" -ForegroundColor Gray
Write-Host ""
