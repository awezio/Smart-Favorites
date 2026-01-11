"""
Chat history models for Smart Favorites
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


def generate_id() -> str:
    """Generate a unique session ID"""
    return str(uuid.uuid4())[:8]


class ChatMessage(BaseModel):
    """Individual chat message"""
    id: str = Field(default_factory=generate_id)
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    sources: Optional[List[dict]] = None  # Related bookmarks


class ChatSession(BaseModel):
    """Chat session containing multiple messages"""
    id: str = Field(default_factory=generate_id)
    title: str = "新会话"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    messages: List[ChatMessage] = []


class CreateSessionRequest(BaseModel):
    """Request to create a new session"""
    title: Optional[str] = "新会话"


class UpdateSessionRequest(BaseModel):
    """Request to update session"""
    title: Optional[str] = None


class ChatRequest(BaseModel):
    """Chat request with session support"""
    message: str
    session_id: Optional[str] = None
    include_sources: bool = True


class ChatResponse(BaseModel):
    """Chat response"""
    response: str
    sources: Optional[List[dict]] = None
    session_id: Optional[str] = None
