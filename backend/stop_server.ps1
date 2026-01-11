# Smart Favorites Backend Server Stop Script
# 停止后端服务脚本

Write-Host "正在检查端口 8000 的占用情况..." -ForegroundColor Yellow

# 查找占用8000端口的进程
$processes = @()
$netstatOutput = netstat -ano | Select-String ":8000.*LISTENING"

if ($netstatOutput) {
    foreach ($line in $netstatOutput) {
        $parts = $line.ToString().Split() | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5) {
            $pid = $parts[-1]
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $pid").CommandLine
                    $processes += [PSCustomObject]@{
                        PID = $pid
                        ProcessName = $process.ProcessName
                        CommandLine = $cmdLine
                    }
                }
            } catch {
                # Process may not exist
            }
        }
    }
}

if ($processes.Count -eq 0) {
    Write-Host "未发现占用端口 8000 的进程" -ForegroundColor Green
    exit 0
}

Write-Host "`n发现以下进程占用端口 8000:" -ForegroundColor Yellow
foreach ($proc in $processes) {
    Write-Host "  PID: $($proc.PID) | 进程: $($proc.ProcessName)" -ForegroundColor Cyan
    if ($proc.CommandLine) {
        Write-Host "    命令: $($proc.CommandLine.Substring(0, [Math]::Min(80, $proc.CommandLine.Length)))" -ForegroundColor Gray
    }
}

Write-Host "`n正在终止这些进程..." -ForegroundColor Yellow

$killed = 0
foreach ($proc in $processes) {
    try {
        $result = taskkill /F /PID $proc.PID /T 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 成功终止进程 PID: $($proc.PID)" -ForegroundColor Green
            $killed++
        } else {
            Write-Host "  ✗ 无法终止进程 PID: $($proc.PID)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ 终止进程 PID: $($proc.PID) 时出错: $_" -ForegroundColor Red
    }
}

Start-Sleep -Seconds 1

# 再次检查端口
$remaining = netstat -ano | Select-String ":8000.*LISTENING"
if ($remaining) {
    Write-Host "`n警告: 端口 8000 仍被占用，请手动检查" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✓ 所有进程已成功终止，端口 8000 已释放" -ForegroundColor Green
    exit 0
}
