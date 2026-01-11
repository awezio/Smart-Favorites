"""
API Routes for Smart Favorites

Provides REST endpoints for bookmark management and AI interactions
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from ..models.api_models import (
    ImportRequest, ImportResponse,
    SearchRequest, SearchResponse, SearchResult,
    ChatRequest, ChatResponse,
    ModelInfo, ModelsResponse,
    ConfigRequest, ConfigResponse
)
from ..services import get_rag_engine, get_llm_adapter

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    rag = get_rag_engine()
    llm = get_llm_adapter()
    
    stats = rag.get_stats()
    
    return {
        "status": "ok",
        "bookmarks_count": stats["total_bookmarks"],
        "model": f"{llm.default_provider}",
        "available_providers": stats["available_providers"]
    }


@router.post("/bookmarks/import", response_model=ImportResponse)
async def import_bookmarks(request: ImportRequest):
    """Import bookmarks from HTML content"""
    try:
        rag = get_rag_engine()
        bookmarks_count, folders_count = rag.import_bookmarks(
            request.html_content,
            replace=request.replace_existing
        )
        
        return ImportResponse(
            success=True,
            message=f"Successfully imported {bookmarks_count} bookmarks",
            total_imported=bookmarks_count,
            total_folders=folders_count
        )
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bookmarks/sync", response_model=ImportResponse)
async def sync_bookmarks(request: ImportRequest):
    """Sync bookmarks (alias for import with replace=True)"""
    request.replace_existing = True
    return await import_bookmarks(request)


@router.post("/search", response_model=SearchResponse)
async def search_bookmarks(request: SearchRequest):
    """Search bookmarks using semantic similarity"""
    try:
        rag = get_rag_engine()
        results = rag.search(
            query=request.query,
            top_k=request.top_k,
            folder_filter=request.folder_filter
        )
        
        return SearchResponse(
            results=results,
            total=len(results),
            query=request.query
        )
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_bookmarks(request: ChatRequest):
    """Chat with AI using bookmarks as context (RAG)"""
    try:
        rag = get_rag_engine()
        
        response, sources, model, provider = await rag.chat(
            message=request.message,
            provider=request.provider,
            model=request.model,
            include_sources=request.include_sources
        )
        
        return ChatResponse(
            response=response,
            sources=sources,
            model=model,
            provider=provider,
            conversation_id=request.conversation_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ModelsResponse)
async def get_models():
    """Get list of available AI models"""
    llm = get_llm_adapter()
    
    models = [
        ModelInfo(
            provider=m["provider"],
            model=m["model"],
            display_name=m["display_name"],
            available=m["available"]
        )
        for m in llm.get_all_models()
    ]
    
    default_provider = llm.default_provider
    default_model = llm.get_provider(default_provider).get_default_model()
    
    return ModelsResponse(
        models=models,
        default_provider=default_provider,
        default_model=default_model
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get current configuration"""
    llm = get_llm_adapter()
    
    return ConfigResponse(
        default_provider=llm.default_provider,
        default_model=llm.get_provider().get_default_model(),
        configured_providers=llm.get_available_providers()
    )


@router.put("/config", response_model=ConfigResponse)
async def update_config(request: ConfigRequest):
    """Update configuration"""
    # Note: In a real implementation, this would persist changes
    # For now, this is a placeholder that returns current config
    llm = get_llm_adapter()
    
    if request.default_provider:
        if request.default_provider not in llm.providers:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown provider: {request.default_provider}"
            )
        # Would need to persist this change
        
    return ConfigResponse(
        default_provider=llm.default_provider,
        default_model=llm.get_provider().get_default_model(),
        configured_providers=llm.get_available_providers()
    )


@router.get("/stats")
async def get_stats():
    """Get bookmark collection statistics"""
    rag = get_rag_engine()
    return rag.get_stats()
