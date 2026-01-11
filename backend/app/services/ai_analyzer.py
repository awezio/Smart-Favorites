"""
AI Analyzer Service

Provides AI-powered bookmark analysis:
- Smart categorization suggestions
- Duplicate/similar bookmark detection
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
from urllib.parse import urlparse
from loguru import logger

from .vector_store import VectorStore, get_vector_store
from .llm_adapter import LLMAdapter, get_llm_adapter, Message


@dataclass
class CategorySuggestion:
    """Suggestion to recategorize a bookmark"""
    bookmark_id: str
    bookmark_title: str
    bookmark_url: str
    current_folder: str
    suggested_folder: str
    reason: str
    confidence: float


@dataclass
class DuplicateGroup:
    """Group of duplicate/similar bookmarks"""
    title: str
    url: str
    count: int
    locations: List[str]
    bookmark_ids: List[str]
    suggestion: str
    similarity_type: str  # 'exact_url', 'similar_url', 'similar_title'


class AIAnalyzer:
    """AI-powered bookmark analyzer"""
    
    CATEGORIZE_PROMPT = """你是一个书签整理专家。分析以下书签并提供分类建议。

书签列表:
{bookmarks}

当前存在的文件夹:
{folders}

请分析这些书签，找出可能需要重新分类的书签。对于每个需要调整的书签，提供:
1. 书签标题
2. 当前所在文件夹
3. 建议移动到的文件夹（可以是现有文件夹或建议新建的文件夹）
4. 移动原因

以 JSON 格式返回结果:
```json
[
  {{
    "title": "书签标题",
    "current_folder": "当前文件夹",
    "suggested_folder": "建议文件夹",
    "reason": "移动原因"
  }}
]
```

只返回需要调整的书签，如果所有书签分类都合理则返回空数组 []。最多返回 10 条建议。"""

    DUPLICATE_ANALYZE_PROMPT = """分析以下可能重复的书签组，提供整合建议:

{duplicates}

对于每组重复书签，提供:
1. 是否确实重复
2. 建议保留哪个
3. 整合建议

以 JSON 格式返回:
```json
[
  {{
    "group_index": 0,
    "is_duplicate": true,
    "suggestion": "建议保留第一个，删除其他重复项"
  }}
]
```"""

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        llm_adapter: Optional[LLMAdapter] = None
    ):
        self.vector_store = vector_store or get_vector_store()
        self.llm_adapter = llm_adapter or get_llm_adapter()
    
    async def analyze_categories(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> List[CategorySuggestion]:
        """
        Analyze bookmarks and suggest recategorization
        
        Returns:
            List of CategorySuggestion objects
        """
        # Get all bookmarks
        try:
            # Search for all bookmarks (use a generic query)
            all_results = self.vector_store.search("*", top_k=200)
            
            if not all_results:
                return []
            
            # Group by folder
            folders = set()
            bookmarks_list = []
            
            for bookmark, score in all_results:
                folders.add(bookmark.folder_path or "/")
                bookmarks_list.append({
                    "id": bookmark.id,
                    "title": bookmark.title,
                    "url": bookmark.url,
                    "folder": bookmark.folder_path or "/"
                })
            
            # Prepare prompt
            bookmarks_text = "\n".join([
                f"- [{b['title']}]({b['url']}) - 文件夹: {b['folder']}"
                for b in bookmarks_list[:50]  # Limit to avoid token overflow
            ])
            
            folders_text = "\n".join([f"- {f}" for f in sorted(folders)])
            
            prompt = self.CATEGORIZE_PROMPT.format(
                bookmarks=bookmarks_text,
                folders=folders_text
            )
            
            # Call LLM
            messages = [Message(role="user", content=prompt)]
            response = await self.llm_adapter.chat(
                messages=messages,
                provider=provider,
                model=model,
                temperature=0.3
            )
            
            # Parse response
            suggestions = self._parse_category_suggestions(response.content, bookmarks_list)
            return suggestions
            
        except Exception as e:
            logger.error(f"Category analysis error: {e}")
            return []
    
    def _parse_category_suggestions(
        self, 
        response: str, 
        bookmarks: List[Dict]
    ) -> List[CategorySuggestion]:
        """Parse LLM response to extract category suggestions"""
        import json
        import re
        
        suggestions = []
        
        try:
            # Extract JSON from response
            json_match = re.search(r'\[[\s\S]*\]', response)
            if not json_match:
                return []
            
            data = json.loads(json_match.group())
            
            # Map titles to bookmark IDs
            title_to_bookmark = {b['title']: b for b in bookmarks}
            
            for item in data:
                title = item.get('title', '')
                bookmark = title_to_bookmark.get(title)
                
                if bookmark:
                    suggestions.append(CategorySuggestion(
                        bookmark_id=bookmark['id'],
                        bookmark_title=title,
                        bookmark_url=bookmark['url'],
                        current_folder=item.get('current_folder', bookmark['folder']),
                        suggested_folder=item.get('suggested_folder', ''),
                        reason=item.get('reason', ''),
                        confidence=0.8
                    ))
        except Exception as e:
            logger.error(f"Error parsing category suggestions: {e}")
        
        return suggestions
    
    def detect_duplicates(self) -> List[DuplicateGroup]:
        """
        Detect duplicate and similar bookmarks
        
        Returns:
            List of DuplicateGroup objects
        """
        try:
            # Get all bookmarks
            all_results = self.vector_store.search("*", top_k=500)
            
            if not all_results:
                return []
            
            # Group by normalized URL
            url_groups: Dict[str, List[Tuple[Any, str]]] = defaultdict(list)
            # Group by domain
            domain_groups: Dict[str, List[Tuple[Any, str]]] = defaultdict(list)
            # Group by title (normalized)
            title_groups: Dict[str, List[Tuple[Any, str]]] = defaultdict(list)
            
            for bookmark, score in all_results:
                # Normalize URL
                normalized_url = self._normalize_url(bookmark.url)
                url_groups[normalized_url].append((bookmark, bookmark.folder_path))
                
                # Extract domain
                domain = self._extract_domain(bookmark.url)
                domain_groups[domain].append((bookmark, bookmark.folder_path))
                
                # Normalize title
                normalized_title = self._normalize_title(bookmark.title)
                if normalized_title:
                    title_groups[normalized_title].append((bookmark, bookmark.folder_path))
            
            duplicates = []
            seen_ids = set()
            
            # Check exact URL duplicates
            for url, items in url_groups.items():
                if len(items) > 1:
                    bookmark_ids = [b.id for b, _ in items]
                    if any(bid in seen_ids for bid in bookmark_ids):
                        continue
                    
                    seen_ids.update(bookmark_ids)
                    first_bookmark = items[0][0]
                    
                    duplicates.append(DuplicateGroup(
                        title=first_bookmark.title,
                        url=first_bookmark.url,
                        count=len(items),
                        locations=[folder for _, folder in items],
                        bookmark_ids=bookmark_ids,
                        suggestion=f"发现 {len(items)} 个完全相同的书签，建议只保留一个",
                        similarity_type='exact_url'
                    ))
            
            # Check similar titles (same title, different URLs)
            for title, items in title_groups.items():
                if len(items) > 1:
                    # Filter out already seen
                    items = [(b, f) for b, f in items if b.id not in seen_ids]
                    if len(items) <= 1:
                        continue
                    
                    # Check if URLs are actually different
                    urls = set(self._normalize_url(b.url) for b, _ in items)
                    if len(urls) > 1:
                        bookmark_ids = [b.id for b, _ in items]
                        seen_ids.update(bookmark_ids)
                        first_bookmark = items[0][0]
                        
                        duplicates.append(DuplicateGroup(
                            title=first_bookmark.title,
                            url=first_bookmark.url,
                            count=len(items),
                            locations=[folder for _, folder in items],
                            bookmark_ids=bookmark_ids,
                            suggestion=f"发现 {len(items)} 个标题相似但 URL 不同的书签，请检查是否需要合并",
                            similarity_type='similar_title'
                        ))
            
            return duplicates
            
        except Exception as e:
            logger.error(f"Duplicate detection error: {e}")
            return []
    
    def _normalize_url(self, url: str) -> str:
        """Normalize URL for comparison"""
        if not url:
            return ""
        
        try:
            parsed = urlparse(url.lower())
            # Remove trailing slash, www prefix
            netloc = parsed.netloc.replace('www.', '')
            path = parsed.path.rstrip('/')
            return f"{netloc}{path}"
        except Exception:
            return url.lower()
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace('www.', '')
        except Exception:
            return url
    
    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison"""
        if not title:
            return ""
        
        import re
        # Remove common suffixes like " - Site Name"
        title = re.sub(r'\s*[-|].*$', '', title)
        # Lowercase and remove extra whitespace
        return ' '.join(title.lower().split())
    
    async def get_merge_suggestions(
        self,
        duplicates: List[DuplicateGroup],
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get AI suggestions for merging duplicate bookmarks
        """
        if not duplicates:
            return []
        
        try:
            # Prepare prompt
            duplicates_text = ""
            for i, dup in enumerate(duplicates[:10]):  # Limit
                duplicates_text += f"\n组 {i+1}:\n"
                duplicates_text += f"  标题: {dup.title}\n"
                duplicates_text += f"  URL: {dup.url}\n"
                duplicates_text += f"  重复类型: {dup.similarity_type}\n"
                duplicates_text += f"  位置: {', '.join(dup.locations)}\n"
            
            prompt = self.DUPLICATE_ANALYZE_PROMPT.format(duplicates=duplicates_text)
            
            messages = [Message(role="user", content=prompt)]
            response = await self.llm_adapter.chat(
                messages=messages,
                provider=provider,
                model=model,
                temperature=0.3
            )
            
            # Parse response
            import json
            import re
            
            json_match = re.search(r'\[[\s\S]*\]', response.content)
            if json_match:
                return json.loads(json_match.group())
            
            return []
            
        except Exception as e:
            logger.error(f"Merge suggestions error: {e}")
            return []


# Singleton instance
_ai_analyzer: Optional[AIAnalyzer] = None

def get_ai_analyzer() -> AIAnalyzer:
    """Get the singleton AIAnalyzer instance"""
    global _ai_analyzer
    if _ai_analyzer is None:
        _ai_analyzer = AIAnalyzer()
    return _ai_analyzer
