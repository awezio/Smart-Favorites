"""
Vector Store using ChromaDB

Handles embedding storage and similarity search for bookmarks
"""

import os
from typing import List, Optional, Tuple
from loguru import logger

import chromadb
from chromadb.config import Settings as ChromaSettings

from ..config import settings
from ..models.bookmark import Bookmark


class VectorStore:
    """ChromaDB-based vector store for bookmark embeddings"""
    
    def __init__(self):
        self._client: Optional[chromadb.Client] = None
        self._collection: Optional[chromadb.Collection] = None
        self._embedding_function = None
    
    def _get_embedding_function(self):
        """Get or create embedding function"""
        if self._embedding_function is None:
            if settings.embedding_provider == "openai":
                from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
                self._embedding_function = OpenAIEmbeddingFunction(
                    api_key=settings.openai_api_key,
                    model_name=settings.embedding_model
                )
            else:
                # Configure Hugging Face mirror for better connectivity in China
                import os
                
                # Check if HF_ENDPOINT is set in environment or settings
                hf_endpoint = os.environ.get('HF_ENDPOINT')
                if hf_endpoint:
                    logger.info(f"Using Hugging Face endpoint: {hf_endpoint}")
                    os.environ['HF_ENDPOINT'] = hf_endpoint
                
                from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
                try:
                    logger.info(f"Initializing embedding model: {settings.embedding_model}")
                    logger.info("This may take a while on first run as the model needs to be downloaded...")
                    
                    self._embedding_function = SentenceTransformerEmbeddingFunction(
                        model_name=settings.embedding_model
                    )
                    logger.info(f"Embedding function initialized successfully with model: {settings.embedding_model}")
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Failed to initialize embedding function: {error_msg}")
                    
                    if "Connection" in error_msg or "reset" in error_msg.lower() or "10054" in error_msg:
                        logger.warning("=" * 60)
                        logger.warning("Network connection error detected!")
                        logger.warning("Solutions:")
                        logger.warning("1. Use Hugging Face mirror (recommended for China):")
                        logger.warning("   Set environment variable: HF_ENDPOINT=https://hf-mirror.com")
                        logger.warning("   Or add to .env file: HF_ENDPOINT=https://hf-mirror.com")
                        logger.warning("2. Check your network connection and firewall settings")
                        logger.warning("3. Pre-download the model manually:")
                        logger.warning(f"   python -c \"from sentence_transformers import SentenceTransformer; SentenceTransformer('{settings.embedding_model}')\"")
                        logger.warning("=" * 60)
                    raise
        return self._embedding_function
    
    def _ensure_client(self):
        """Ensure ChromaDB client is initialized"""
        if self._client is None:
            os.makedirs(settings.chroma_persist_dir, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            logger.info(f"ChromaDB client initialized at {settings.chroma_persist_dir}")
    
    def _ensure_collection(self):
        """Ensure collection exists"""
        self._ensure_client()
        if self._collection is None:
            self._collection = self._client.get_or_create_collection(
                name=settings.chroma_collection_name,
                embedding_function=self._get_embedding_function(),
                metadata={"description": "Smart Favorites bookmark embeddings"}
            )
            logger.info(f"Collection '{settings.chroma_collection_name}' ready")
    
    def add_bookmarks(self, bookmarks: List[Bookmark], replace: bool = False) -> int:
        """Add bookmarks to the vector store"""
        self._ensure_collection()
        
        if replace:
            try:
                existing = self._collection.get()
                if existing['ids']:
                    self._collection.delete(ids=existing['ids'])
            except Exception as e:
                logger.warning(f"Error clearing collection: {e}")
        
        if not bookmarks:
            return 0
        
        ids, documents, metadatas = [], [], []
        
        for bookmark in bookmarks:
            if not bookmark.id:
                continue
            doc_text = self._create_document_text(bookmark)
            metadata = {
                "title": bookmark.title[:500] if bookmark.title else "",
                "url": bookmark.url[:1000] if bookmark.url else "",
                "folder_path": bookmark.folder_path[:500] if bookmark.folder_path else "/",
                "add_date": bookmark.add_date.isoformat() if bookmark.add_date else "",
                "tags": ",".join(bookmark.tags) if bookmark.tags else ""
            }
            ids.append(bookmark.id)
            documents.append(doc_text)
            metadatas.append(metadata)
        
        batch_size, added = 100, 0
        for i in range(0, len(ids), batch_size):
            try:
                self._collection.upsert(
                    ids=ids[i:i + batch_size],
                    documents=documents[i:i + batch_size],
                    metadatas=metadatas[i:i + batch_size]
                )
                added += len(ids[i:i + batch_size])
            except Exception as e:
                logger.error(f"Error adding batch: {e}")
        
        logger.info(f"Added/updated {added} bookmarks to vector store")
        return added
    
    def _create_document_text(self, bookmark: Bookmark) -> str:
        """Create searchable text from bookmark"""
        parts = []
        if bookmark.title:
            parts.append(bookmark.title)
        if bookmark.url:
            from urllib.parse import urlparse
            try:
                parsed = urlparse(bookmark.url)
                parts.append(parsed.netloc)
                path_parts = [p for p in parsed.path.split('/') if p]
                parts.extend(path_parts[:3])
            except Exception:
                parts.append(bookmark.url)
        if bookmark.folder_path and bookmark.folder_path != "/":
            parts.append(bookmark.folder_path.strip('/').replace('/', ' '))
        if bookmark.tags:
            parts.extend(bookmark.tags)
        return " ".join(parts)
    
    def search(self, query: str, top_k: int = 10, folder_filter: Optional[str] = None) -> List[Tuple[Bookmark, float]]:
        """Search for similar bookmarks"""
        self._ensure_collection()
        
        where_filter = {"folder_path": {"$contains": folder_filter}} if folder_filter else None
        
        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
        
        bookmarks_with_scores = []
        if results and results['ids'] and results['ids'][0]:
            for i, doc_id in enumerate(results['ids'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 0.0
                score = max(0, 1 - (distance / 2))
                
                bookmark = Bookmark(
                    id=doc_id,
                    title=metadata.get('title', ''),
                    url=metadata.get('url', ''),
                    folder_path=metadata.get('folder_path', '/'),
                    tags=metadata.get('tags', '').split(',') if metadata.get('tags') else []
                )
                bookmarks_with_scores.append((bookmark, score))
        
        return bookmarks_with_scores
    
    def get_count(self) -> int:
        """Get total number of documents"""
        self._ensure_collection()
        return self._collection.count()
    
    def delete_all(self):
        """Delete all documents"""
        self._ensure_collection()
        try:
            existing = self._collection.get()
            if existing['ids']:
                self._collection.delete(ids=existing['ids'])
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")


_vector_store: Optional[VectorStore] = None

def get_vector_store() -> VectorStore:
    """Get the singleton VectorStore instance"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
