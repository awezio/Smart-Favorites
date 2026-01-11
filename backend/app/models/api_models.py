"""API request and response models"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from .bookmark import Bookmark


class ImportRequest(BaseModel):
    """Request to import bookmarks from HTML"""
    
    html_content: str = Field(..., description="HTML content of exported bookmarks")
    replace_existing: bool = Field(default=False, description="Replace existing bookmarks")


class ImportResponse(BaseModel):
    """Response after importing bookmarks"""
    
    success: bool = Field(..., description="Whether import was successful")
    message: str = Field(..., description="Status message")
    total_imported: int = Field(default=0, description="Number of bookmarks imported")
    total_folders: int = Field(default=0, description="Number of folders imported")


class SearchRequest(BaseModel):
    """Request for semantic search"""
    
    query: str = Field(..., description="Search query")
    top_k: int = Field(default=10, description="Number of results to return")
    folder_filter: Optional[str] = Field(default=None, description="Filter by folder path")


class SearchResult(BaseModel):
    """Single search result"""
    
    bookmark: Bookmark = Field(..., description="Matched bookmark")
    score: float = Field(..., description="Relevance score")
    highlights: List[str] = Field(default_factory=list, description="Highlighted matching parts")


class SearchResponse(BaseModel):
    """Response for search request"""
    
    results: List[SearchResult] = Field(default_factory=list, description="Search results")
    total: int = Field(default=0, description="Total number of results")
    query: str = Field(..., description="Original query")


class ChatRequest(BaseModel):
    """Request for RAG chat"""
    
    message: str = Field(..., description="User message")
    model: Optional[str] = Field(default=None, description="LLM model to use")
    provider: Optional[str] = Field(default=None, description="LLM provider to use")
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID for context")
    include_sources: bool = Field(default=True, description="Include source bookmarks in response")


class ChatResponse(BaseModel):
    """Response for chat request"""
    
    response: str = Field(..., description="AI response")
    sources: List[Bookmark] = Field(default_factory=list, description="Source bookmarks used")
    model: str = Field(..., description="Model used for generation")
    provider: str = Field(..., description="Provider used")
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID")


class ModelInfo(BaseModel):
    """Information about an available model"""
    
    provider: str = Field(..., description="Provider name")
    model: str = Field(..., description="Model identifier")
    display_name: str = Field(..., description="Human-readable name")
    available: bool = Field(default=True, description="Whether the model is available")
    description: Optional[str] = Field(default=None, description="Model description")


class ModelsResponse(BaseModel):
    """Response listing available models"""
    
    models: List[ModelInfo] = Field(default_factory=list, description="Available models")
    default_provider: str = Field(..., description="Default provider")
    default_model: str = Field(..., description="Default model")


class ConfigRequest(BaseModel):
    """Request to update configuration"""
    
    default_provider: Optional[str] = Field(default=None, description="Default LLM provider")
    default_model: Optional[str] = Field(default=None, description="Default model")
    api_keys: Optional[Dict[str, str]] = Field(default=None, description="API keys to update")


class ConfigResponse(BaseModel):
    """Response with current configuration"""
    
    default_provider: str = Field(..., description="Current default provider")
    default_model: str = Field(..., description="Current default model")
    configured_providers: List[str] = Field(default_factory=list, description="Providers with API keys configured")
