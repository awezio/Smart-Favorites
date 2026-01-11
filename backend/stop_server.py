#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Favorites Backend Server Stop Script
停止后端服务脚本
"""

import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from app.config import settings
from app.utils.port_manager import find_processes_using_port, cleanup_port

def main():
    """Main entry point"""
    port = settings.port
    host = settings.host
    
    print(f"正在检查端口 {host}:{port} 的占用情况...")
    
    # 查找占用端口的进程
    processes = find_processes_using_port(port)
    
    if not processes:
        print(f"[OK] 未发现占用端口 {port} 的进程")
        return 0
    
    print(f"\n发现 {len(processes)} 个进程占用端口 {port}:")
    for pid, cmd_line in processes:
        print(f"  PID: {pid}")
        if cmd_line:
            print(f"  命令: {cmd_line[:80]}")
    
    print(f"\n正在清理端口 {port}...")
    found_count, killed_pids = cleanup_port(port, force=True)
    
    if killed_pids:
        print(f"\n[OK] 成功终止 {len(killed_pids)} 个进程: {killed_pids}")
        print(f"[OK] 端口 {port} 已释放")
        return 0
    else:
        print(f"\n[ERROR] 无法清理端口 {port}，请手动检查")
        return 1

if __name__ == "__main__":
    sys.exit(main())
