"""
RAG Engine - Retrieval Augmented Generation for bookmarks

Combines vector search with LLM generation for intelligent bookmark queries
"""

from typing import List, Optional, Tuple
from loguru import logger

from ..models.bookmark import Bookmark, BookmarkCollection
from ..models.api_models import SearchResult
from .bookmark_parser import BookmarkParser
from .vector_store import VectorStore, get_vector_store
from .llm_adapter import LLMAdapter, get_llm_adapter, Message, LLMResponse


class RAGEngine:
    """RAG engine for bookmark search and Q&A"""
    
    SYSTEM_PROMPT = """你是一个智能书签助手。你的任务是帮助用户在他们的浏览器收藏夹中查找信息。

用户会问关于他们收藏的网站的问题。我会提供与问题相关的书签信息作为参考。

请根据提供的书签信息回答用户的问题。如果书签信息中没有相关内容，请诚实地告诉用户。

回答时请：
1. 简洁明了地回答问题
2. 如果找到相关书签，列出它们的标题和URL
3. 如果可能，根据书签的分类和内容提供建议
4. 使用中文回答"""

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        llm_adapter: Optional[LLMAdapter] = None
    ):
        self.vector_store = vector_store or get_vector_store()
        self.llm_adapter = llm_adapter or get_llm_adapter()
        self.parser = BookmarkParser()
    
    def import_bookmarks(self, html_content: str, replace: bool = False) -> Tuple[int, int]:
        """
        Import bookmarks from HTML content
        
        Args:
            html_content: HTML content of bookmark file
            replace: Whether to replace existing bookmarks
            
        Returns:
            Tuple of (bookmarks_count, folders_count)
        """
        # Parse HTML
        collection = self.parser.parse(html_content)
        
        # Get all bookmarks
        bookmarks = collection.get_all_bookmarks()
        
        # Add to vector store
        added = self.vector_store.add_bookmarks(bookmarks, replace=replace)
        
        logger.info(f"Imported {added} bookmarks, {collection.total_folders} folders")
        
        return added, collection.total_folders
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        folder_filter: Optional[str] = None
    ) -> List[SearchResult]:
        """
        Search bookmarks using semantic similarity
        
        Args:
            query: Search query
            top_k: Number of results
            folder_filter: Optional folder path filter
            
        Returns:
            List of SearchResult objects
        """
        results = self.vector_store.search(query, top_k, folder_filter)
        
        return [
            SearchResult(
                bookmark=bookmark,
                score=score,
                highlights=[]  # Could be enhanced with keyword highlighting
            )
            for bookmark, score in results
        ]
    
    async def chat(
        self,
        message: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        include_sources: bool = True,
        top_k: int = 5
    ) -> Tuple[str, List[Bookmark], str, str]:
        """
        Chat with RAG - retrieve relevant bookmarks and generate response
        
        Args:
            message: User message
            provider: LLM provider to use
            model: Model to use
            include_sources: Whether to include source bookmarks
            top_k: Number of bookmarks to retrieve for context
            
        Returns:
            Tuple of (response, sources, model, provider)
        """
        # Retrieve relevant bookmarks
        search_results = self.search(message, top_k=top_k)
        sources = [r.bookmark for r in search_results]
        
        # Build context from bookmarks
        context = self._build_context(sources)
        
        # Build messages
        messages = [
            Message(role="system", content=self.SYSTEM_PROMPT),
            Message(role="user", content=f"""参考书签信息：
{context}

用户问题：{message}""")
        ]
        
        # Generate response
        try:
            response = await self.llm_adapter.chat(
                messages=messages,
                provider=provider,
                model=model
            )
            
            return (
                response.content,
                sources if include_sources else [],
                response.model,
                response.provider
            )
        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise
    
    def _build_context(self, bookmarks: List[Bookmark]) -> str:
        """Build context string from bookmarks"""
        if not bookmarks:
            return "没有找到相关书签。"
        
        lines = []
        for i, bookmark in enumerate(bookmarks, 1):
            line = f"{i}. 标题: {bookmark.title}"
            line += f"\n   URL: {bookmark.url}"
            if bookmark.folder_path and bookmark.folder_path != "/":
                line += f"\n   分类: {bookmark.folder_path.strip('/')}"
            if bookmark.tags:
                line += f"\n   标签: {', '.join(bookmark.tags)}"
            lines.append(line)
        
        return "\n\n".join(lines)
    
    def get_stats(self) -> dict:
        """Get statistics about the bookmark collection"""
        return {
            "total_bookmarks": self.vector_store.get_count(),
            "available_providers": self.llm_adapter.get_available_providers(),
            "default_provider": self.llm_adapter.default_provider
        }


# Singleton instance
_rag_engine: Optional[RAGEngine] = None

def get_rag_engine() -> RAGEngine:
    """Get the singleton RAGEngine instance"""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine
