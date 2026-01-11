#!/usr/bin/env python3
"""
Smart Favorites Backend Server Launcher

Features:
- Automatic port detection and cleanup
- Single-process mode (no multiprocessing)
- Graceful shutdown handling
"""

import signal
import sys
import uvicorn
from loguru import logger

from app.config import settings
from app.utils.port_manager import ensure_port_available, cleanup_port


# Global server instance for graceful shutdown
_server_instance = None


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    if _server_instance:
        _server_instance.should_exit = True
    sys.exit(0)


def main():
    """Main entry point"""
    global _server_instance
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check and clean up port if needed
    logger.info(f"Checking port availability: {settings.host}:{settings.port}")
    if not ensure_port_available(settings.host, settings.port, auto_cleanup=True):
        logger.error(f"Port {settings.host}:{settings.port} is still in use after cleanup attempt")
        logger.error("Please manually stop the process using this port or use a different port")
        sys.exit(1)
    
    # Box configuration
    box_width = 61
    border_left = "║  "
    border_right = "  ║"
    content_width = box_width - len(border_left) - len(border_right)
    
    # Format content lines
    server_url = f"http://{settings.host}:{settings.port}"
    server_text = f"Server: {server_url}"
    server_line = f"{server_text:<{content_width}}"
    
    docs_url = f"http://{settings.host}:{settings.port}/docs"
    docs_text = f"Docs:   {docs_url}"
    docs_line = f"{docs_text:<{content_width}}"
    
    debug_text = f"Debug:  {str(settings.debug)}"
    debug_line = f"{debug_text:<{content_width}}"
    
    # Title (centered)
    title = "Smart Favorites Backend Server"
    title_line = f"{title:^{content_width}}"
    
    # Print banner
    print(f"""
╔{'═' * (box_width - 2)}╗
{border_left}{title_line}{border_right}
╠{'═' * (box_width - 2)}╣
{border_left}{server_line}{border_right}
{border_left}{docs_line}{border_right}
{border_left}{debug_line}{border_right}
╚{'═' * (box_width - 2)}╝
""")
    
    logger.info("Starting server in single-process mode (no multiprocessing)")
    logger.info("Press Ctrl+C to stop the server")
    
    # Run uvicorn in single-process mode
    # Note: reload=False to prevent multiprocessing, workers=1 to ensure single process
    config = uvicorn.Config(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,  # Disable reload to prevent multiprocessing
        workers=1,     # Single worker, no multiprocessing
        log_level="debug" if settings.debug else "info",
        access_log=True
    )
    
    _server_instance = uvicorn.Server(config)
    
    try:
        _server_instance.run()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise
    finally:
        # Cleanup on exit
        logger.info("Cleaning up resources...")
        cleanup_port(settings.port, force=False)


if __name__ == "__main__":
    main()
