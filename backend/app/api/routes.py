"""
API Routes for Smart Favorites

Provides REST endpoints for bookmark management and AI interactions
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

from ..models.api_models import (
    ImportRequest, ImportResponse,
    SearchRequest, SearchResponse, SearchResult,
    ChatRequest, ChatResponse, ChatAttachment,
    ModelInfo, ModelsResponse,
    ConfigRequest, ConfigResponse
)
from ..models.chat import (
    ChatSession, CreateSessionRequest, UpdateSessionRequest
)
from ..models.config import (
    ProviderStatus, SetProviderRequest, SetApiKeyRequest
)
from ..services import get_rag_engine, get_llm_adapter, get_ai_analyzer
from ..services.chat_storage import get_chat_storage
from ..services.config_manager import get_config_manager, PROVIDER_NAMES

router = APIRouter(prefix="/api", tags=["api"])


# Additional request/response models for AI features
class CategorizeRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None


class CategorySuggestionResponse(BaseModel):
    bookmark_id: str
    bookmark_title: str
    bookmark_url: str
    current_folder: str
    suggested_folder: str
    reason: str


class CategorizeResponse(BaseModel):
    suggestions: List[CategorySuggestionResponse]
    total: int


class DuplicateResponse(BaseModel):
    title: str
    url: str
    count: int
    locations: List[str]
    suggestion: str
    similarity_type: str


class DuplicatesResponse(BaseModel):
    duplicates: List[DuplicateResponse]
    total: int


class ApplySuggestionsRequest(BaseModel):
    suggestions: List[Dict[str, Any]]


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
        chat_storage = get_chat_storage()
        
        # Get session ID from request
        session_id = request.session_id
        logger.info(f"Chat request received - session_id: {session_id}, message: {request.message[:50]}...")
        
        if session_id:
            # Save user message to session
            logger.info(f"Saving user message to session {session_id}")
            chat_storage.add_message(session_id, "user", request.message)
        
        # Prepare attachments for multimodal
        attachments_data = None
        if request.attachments:
            attachments_data = [
                {
                    "type": att.type,
                    "content": att.content,
                    "filename": att.filename,
                    "mime_type": att.mime_type
                }
                for att in request.attachments
            ]
        
        response, sources, model, provider = await rag.chat(
            message=request.message,
            provider=request.provider,
            model=request.model,
            include_sources=request.include_sources,
            attachments=attachments_data,
            web_search=request.web_search
        )
        
        # Save assistant response to session
        if session_id:
            # Format response with sources for storage
            response_content = response
            
            # Convert sources to dict format for storage
            sources_dict = None
            if sources:
                sources_dict = []
                response_content += "\n\n**相关书签:**\n"
                for src in sources:
                    # Handle both dict and Bookmark object
                    if hasattr(src, 'title'):
                        title = src.title or 'Link'
                        url = src.url or ''
                        sources_dict.append({"title": title, "url": url})
                    else:
                        title = src.get('title', 'Link')
                        url = src.get('url', '')
                        sources_dict.append(src)
                    response_content += f"- [{title}]({url})\n"
            
            logger.info(f"Saving assistant message to session {session_id}")
            chat_storage.add_message(session_id, "assistant", response_content, sources_dict)
            
            # Verify messages were saved
            saved_session = chat_storage.get_session(session_id)
            logger.info(f"Session {session_id} now has {len(saved_session.messages) if saved_session else 0} messages")
        
        return ChatResponse(
            response=response,
            sources=sources,
            model=model,
            provider=provider,
            session_id=session_id
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


# ==================== AI Analysis Endpoints ====================

@router.post("/ai/categorize", response_model=CategorizeResponse)
async def analyze_categories(request: CategorizeRequest = None):
    """
    Analyze bookmarks and suggest recategorization using AI
    """
    try:
        analyzer = get_ai_analyzer()
        
        provider = request.provider if request else None
        model = request.model if request else None
        
        suggestions = await analyzer.analyze_categories(
            provider=provider,
            model=model
        )
        
        return CategorizeResponse(
            suggestions=[
                CategorySuggestionResponse(
                    bookmark_id=s.bookmark_id,
                    bookmark_title=s.bookmark_title,
                    bookmark_url=s.bookmark_url,
                    current_folder=s.current_folder,
                    suggested_folder=s.suggested_folder,
                    reason=s.reason
                )
                for s in suggestions
            ],
            total=len(suggestions)
        )
    except Exception as e:
        logger.error(f"Categorize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/duplicates", response_model=DuplicatesResponse)
async def detect_duplicates():
    """
    Detect duplicate and similar bookmarks
    """
    try:
        analyzer = get_ai_analyzer()
        duplicates = analyzer.detect_duplicates()
        
        return DuplicatesResponse(
            duplicates=[
                DuplicateResponse(
                    title=d.title,
                    url=d.url,
                    count=d.count,
                    locations=d.locations,
                    suggestion=d.suggestion,
                    similarity_type=d.similarity_type
                )
                for d in duplicates
            ],
            total=len(duplicates)
        )
    except Exception as e:
        logger.error(f"Duplicate detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/apply-suggestions")
async def apply_suggestions(request: ApplySuggestionsRequest):
    """
    Apply AI suggestions (categorization or duplicate removal)
    
    Note: This endpoint records the user's decision. 
    Actual bookmark modifications should be done by the browser extension.
    """
    try:
        # Log the applied suggestions for reference
        logger.info(f"User applied {len(request.suggestions)} suggestions")
        
        return {
            "success": True,
            "message": f"已记录 {len(request.suggestions)} 条建议。请在浏览器中确认更改。",
            "applied_count": len(request.suggestions)
        }
    except Exception as e:
        logger.error(f"Apply suggestions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Chat Session Endpoints ====================

@router.get("/chat/sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    try:
        chat_storage = get_chat_storage()
        sessions = chat_storage.get_all_sessions()
        return [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat()
            }
            for s in sessions
        ]
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/sessions")
async def create_chat_session(request: CreateSessionRequest = None):
    """Create a new chat session"""
    try:
        chat_storage = get_chat_storage()
        title = request.title if request else "新会话"
        session = chat_storage.create_session(title=title)
        return {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Create session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/sessions/{session_id}")
async def get_chat_session(session_id: str):
    """Get a specific chat session with messages"""
    try:
        chat_storage = get_chat_storage()
        session = chat_storage.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.timestamp.isoformat(),
                    "sources": m.sources
                }
                for m in session.messages
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/chat/sessions/{session_id}")
async def update_chat_session(session_id: str, request: UpdateSessionRequest):
    """Update a chat session"""
    try:
        chat_storage = get_chat_storage()
        success = chat_storage.update_session(session_id, title=request.title)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """Delete a chat session"""
    try:
        chat_storage = get_chat_storage()
        success = chat_storage.delete_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Configuration Management Endpoints ====================

@router.get("/settings")
async def get_settings():
    """Get current settings (API keys masked)"""
    try:
        config = get_config_manager()
        
        return {
            "default_provider": config.get_default_provider(),
            "providers": [
                {
                    "id": provider,
                    "name": name,
                    "configured": config.is_provider_configured(provider),
                    "masked_key": config.get_api_key_masked(provider)
                }
                for provider, name in PROVIDER_NAMES.items()
            ]
        }
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/provider")
async def set_default_provider(request: SetProviderRequest):
    """Set default AI provider"""
    try:
        config = get_config_manager()
        
        if request.provider not in PROVIDER_NAMES:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        
        success = config.set_default_provider(request.provider)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to set provider")
        
        return {
            "success": True,
            "message": f"Default provider set to {PROVIDER_NAMES[request.provider]}",
            "provider": request.provider
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set provider error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/apikey")
async def set_api_key(request: SetApiKeyRequest):
    """Set API key for a provider (stored encrypted)"""
    try:
        config = get_config_manager()
        
        if request.provider not in PROVIDER_NAMES:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        
        if not request.api_key or len(request.api_key) < 3:
            raise HTTPException(status_code=400, detail="Invalid API key")
        
        success = config.set_api_key(request.provider, request.api_key)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to save API key")
        
        return {
            "success": True,
            "message": f"API key for {PROVIDER_NAMES[request.provider]} saved",
            "provider": request.provider,
            "masked_key": config.get_api_key_masked(request.provider)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/settings/apikey/{provider}")
async def delete_api_key(provider: str):
    """Delete API key for a provider"""
    try:
        config = get_config_manager()
        
        if provider not in PROVIDER_NAMES:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        success = config.delete_api_key(provider)
        
        return {
            "success": True,
            "message": f"API key for {PROVIDER_NAMES[provider]} deleted" if success else "No key to delete",
            "provider": provider
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
