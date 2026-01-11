@echo off
REM Smart Favorites Backend Server Stop Script (Batch)
REM 停止后端服务脚本

echo 正在检查端口 8000 的占用情况...

REM 查找占用8000端口的进程并终止
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do (
    echo 发现进程 PID: %%a
    taskkill /F /PID %%a /T
    if errorlevel 1 (
        echo 无法终止进程 PID: %%a
    ) else (
        echo 成功终止进程 PID: %%a
    )
)

timeout /t 2 /nobreak >nul

REM 再次检查
netstat -ano | findstr ":8000.*LISTENING" >nul
if errorlevel 1 (
    echo.
    echo 所有进程已成功终止，端口 8000 已释放
) else (
    echo.
    echo 警告: 端口 8000 仍被占用，请手动检查
)

pause
