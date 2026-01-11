#!/usr/bin/env python3
"""
Smart Favorites Backend Server Launcher
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           Smart Favorites Backend Server                 ║
╠══════════════════════════════════════════════════════════╣
║  Server: http://{settings.host}:{settings.port:<24}      ║
║  Docs:   http://{settings.host}:{settings.port}/docs{' ' * 19}║
║  Debug:  {str(settings.debug):<43} ║
╚══════════════════════════════════════════════════════════╝
""")
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
