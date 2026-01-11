"""
Port Manager - Utility for port detection and cleanup

Provides functions to check port availability, find processes using ports,
and clean up orphaned processes.
"""

import platform
import socket
import subprocess
import sys
from typing import List, Optional, Tuple
from loguru import logger


def is_port_in_use(host: str, port: int) -> bool:
    """
    Check if a port is currently in use
    
    Args:
        host: Host address (e.g., '127.0.0.1')
        port: Port number
        
    Returns:
        True if port is in use, False otherwise
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            return result == 0
    except Exception as e:
        logger.warning(f"Error checking port {host}:{port}: {e}")
        return False


def find_processes_using_port(port: int) -> List[Tuple[int, str]]:
    """
    Find all processes using a specific port
    
    Args:
        port: Port number to check
        
    Returns:
        List of tuples (PID, command_line)
    """
    processes = []
    
    try:
        if platform.system() == "Windows":
            # Use netstat to find processes
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        try:
                            pid = int(parts[-1])
                            # Get process command line
                            cmd_result = subprocess.run(
                                ["wmic", "process", "where", f"ProcessId={pid}", "get", "CommandLine"],
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            cmd_line = ""
                            for cmd_line in cmd_result.stdout.splitlines():
                                if cmd_line.strip() and "CommandLine" not in cmd_line:
                                    cmd_line = cmd_line.strip()
                                    break
                            
                            if pid not in [p[0] for p in processes]:
                                processes.append((pid, cmd_line))
                        except (ValueError, IndexError):
                            continue
        else:
            # Linux/Mac: use lsof
            result = subprocess.run(
                ["lsof", "-i", f":{port}", "-t"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            for pid_str in result.stdout.strip().splitlines():
                try:
                    pid = int(pid_str.strip())
                    # Get process command
                    cmd_result = subprocess.run(
                        ["ps", "-p", str(pid), "-o", "command="],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    cmd_line = cmd_result.stdout.strip()
                    processes.append((pid, cmd_line))
                except (ValueError, IndexError):
                    continue
                    
    except subprocess.TimeoutExpired:
        logger.warning(f"Timeout while finding processes on port {port}")
    except Exception as e:
        logger.warning(f"Error finding processes on port {port}: {e}")
    
    return processes


def kill_process(pid: int, force: bool = False) -> bool:
    """
    Kill a process by PID
    
    Args:
        pid: Process ID
        force: Whether to force kill
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if platform.system() == "Windows":
            cmd = ["taskkill", "/F" if force else "", "/PID", str(pid), "/T"]
            cmd = [c for c in cmd if c]  # Remove empty strings
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        else:
            signal = "KILL" if force else "TERM"
            result = subprocess.run(
                ["kill", f"-{signal}", str(pid)],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
    except subprocess.TimeoutExpired:
        logger.warning(f"Timeout while killing process {pid}")
        return False
    except Exception as e:
        logger.warning(f"Error killing process {pid}: {e}")
        return False


def cleanup_port(port: int, force: bool = False) -> Tuple[int, List[int]]:
    """
    Clean up all processes using a specific port
    
    Args:
        port: Port number to clean up
        force: Whether to force kill processes
        
    Returns:
        Tuple of (found_count, killed_pids)
    """
    processes = find_processes_using_port(port)
    killed_pids = []
    
    if not processes:
        logger.info(f"No processes found using port {port}")
        return 0, []
    
    logger.info(f"Found {len(processes)} process(es) using port {port}")
    
    for pid, cmd_line in processes:
        logger.info(f"Attempting to kill process {pid}: {cmd_line[:100]}")
        if kill_process(pid, force=force):
            killed_pids.append(pid)
            logger.info(f"Successfully killed process {pid}")
        else:
            logger.warning(f"Failed to kill process {pid}")
    
    return len(processes), killed_pids


def ensure_port_available(host: str, port: int, auto_cleanup: bool = True) -> bool:
    """
    Ensure a port is available, optionally cleaning up processes using it
    
    Args:
        host: Host address
        port: Port number
        auto_cleanup: Whether to automatically clean up processes using the port
        
    Returns:
        True if port is available, False otherwise
    """
    if not is_port_in_use(host, port):
        logger.info(f"Port {host}:{port} is available")
        return True
    
    logger.warning(f"Port {host}:{port} is in use")
    
    if auto_cleanup:
        logger.info(f"Attempting to clean up port {port}...")
        found_count, killed_pids = cleanup_port(port, force=True)
        
        if killed_pids:
            # Wait a bit for ports to be released
            import time
            time.sleep(1)
            
            # Check again
            if not is_port_in_use(host, port):
                logger.info(f"Port {host}:{port} is now available after cleanup")
                return True
            else:
                logger.warning(f"Port {host}:{port} is still in use after cleanup")
                return False
        else:
            logger.warning(f"Could not clean up processes on port {port}")
            return False
    else:
        processes = find_processes_using_port(port)
        if processes:
            logger.warning(f"Port {host}:{port} is in use by:")
            for pid, cmd_line in processes:
                logger.warning(f"  PID {pid}: {cmd_line[:100]}")
        return False
