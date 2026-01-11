"""Data models for Smart Favorites"""

from .bookmark import Bookmark, BookmarkFolder, BookmarkCollection
from .api_models import (
    ImportRequest,
    ImportResponse,
    SearchRequest,
    SearchResponse,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    ConfigRequest,
    ConfigResponse,
)

__all__ = [
    "Bookmark",
    "BookmarkFolder",
    "BookmarkCollection",
    "ImportRequest",
    "ImportResponse",
    "SearchRequest",
    "SearchResponse",
    "ChatRequest",
    "ChatResponse",
    "ModelInfo",
    "ConfigRequest",
    "ConfigResponse",
]
