"""
Smart Favorites Backend - FastAPI Application

Main entry point for the backend server
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from .config import settings
from .api import router

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG" if settings.debug else "INFO"
)

# Create FastAPI app
app = FastAPI(
    title="Smart Favorites API",
    description="智能收藏夹管理系统 - 基于 AI 的收藏夹语义搜索和问答",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
        "chrome-extension://*",
        "edge-extension://*",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Smart Favorites Backend...")
    logger.info(f"Server running at http://{settings.host}:{settings.port}")
    logger.info(f"API documentation at http://{settings.host}:{settings.port}/docs")
    
    # Initialize services
    from .services import get_vector_store, get_llm_adapter
    
    try:
        vector_store = get_vector_store()
        logger.info(f"Vector store initialized with {vector_store.get_count()} documents")
    except Exception as e:
        logger.warning(f"Vector store initialization warning: {e}")
    
    try:
        llm = get_llm_adapter()
        available = llm.get_available_providers()
        logger.info(f"Available LLM providers: {', '.join(available) if available else 'None configured'}")
        logger.info(f"Default provider: {llm.default_provider}")
    except Exception as e:
        logger.warning(f"LLM adapter initialization warning: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Smart Favorites Backend...")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Smart Favorites API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


def run_server():
    """Run the server using uvicorn"""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )


if __name__ == "__main__":
    run_server()
