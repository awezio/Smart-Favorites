"""
Bookmark HTML Parser

Parses Netscape Bookmark file format (exported from Edge/Chrome/Firefox)
"""

import re
import hashlib
from datetime import datetime
from typing import Optional, List, Tuple
from bs4 import BeautifulSoup, Tag
from loguru import logger

from ..models.bookmark import Bookmark, BookmarkFolder, BookmarkCollection


class BookmarkParser:
    """Parser for Netscape Bookmark HTML format"""
    
    def __init__(self):
        self.bookmarks_count = 0
        self.folders_count = 0
    
    def parse(self, html_content: str) -> BookmarkCollection:
        """
        Parse bookmark HTML content and return a BookmarkCollection
        
        Args:
            html_content: HTML content of the bookmark file
            
        Returns:
            BookmarkCollection containing all parsed bookmarks
        """
        self.bookmarks_count = 0
        self.folders_count = 0
        
        # Use lxml parser for better handling of Netscape bookmark format
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Simple approach: find all DT elements with A tags
        # and determine folder path from parent DL/H3 structure
        root_folder = BookmarkFolder(name="Bookmarks", path="/", bookmarks=[], subfolders=[])
        
        # Find all A tags with HREF (these are the actual bookmarks)
        all_links = soup.find_all('a', href=True)
        
        # Extract folder structure from H3 tags
        folder_map = {}  # Map H3 elements to folder paths
        all_h3s = soup.find_all('h3')
        
        for h3 in all_h3s:
            folder_name = h3.get_text(strip=True)
            # Build path by traversing up through parent DL/H3 elements
            path = self._get_folder_path(h3)
            folder_map[h3] = path
            self.folders_count += 1
        
        # Process each bookmark
        for a in all_links:
            # Find the containing folder by looking for nearest H3 ancestor
            folder_path = self._get_bookmark_folder_path(a, folder_map)
            
            bookmark = self._parse_bookmark(a, folder_path)
            if bookmark:
                root_folder.bookmarks.append(bookmark)
                self.bookmarks_count += 1
        
        logger.info(f"Parsed {self.bookmarks_count} bookmarks in {self.folders_count} folders")
        
        return BookmarkCollection(
            root=root_folder,
            total_bookmarks=self.bookmarks_count,
            total_folders=self.folders_count
        )
    
    def _get_folder_path(self, h3_element: Tag) -> str:
        """Get the folder path for an H3 element by traversing up the tree"""
        path_parts = [h3_element.get_text(strip=True)]
        
        # Walk up the DOM tree looking for parent H3s (indicating nested folders)
        current = h3_element.parent
        while current:
            if current.name == 'dl':
                # Look for the preceding H3 in the parent DT
                prev_dt = None
                for sibling in current.previous_siblings:
                    if hasattr(sibling, 'name') and sibling.name == 'dt':
                        prev_dt = sibling
                        break
                
                if prev_dt:
                    prev_h3 = prev_dt.find('h3')
                    if prev_h3:
                        path_parts.insert(0, prev_h3.get_text(strip=True))
            
            current = current.parent
        
        return "/" + "/".join(path_parts) + "/"
    
    def _get_bookmark_folder_path(self, a_element: Tag, folder_map: dict) -> str:
        """Determine the folder path for a bookmark by finding its containing folder"""
        # Walk up the DOM tree to find the containing DL, then its preceding H3
        current = a_element.parent
        
        while current:
            if current.name == 'dl':
                # Look for the H3 that defines this folder
                for sibling in current.previous_siblings:
                    if hasattr(sibling, 'name') and sibling.name == 'dt':
                        h3 = sibling.find('h3')
                        if h3 and h3 in folder_map:
                            return folder_map[h3]
                        break
            
            current = current.parent
        
        return "/"
    
    def _parse_folder(self, dl_element: Tag, folder_name: str, folder_path: str) -> BookmarkFolder:
        """
        Recursively parse a folder (DL element) and its contents
        
        Args:
            dl_element: BeautifulSoup DL tag
            folder_name: Name of the current folder
            folder_path: Full path to the current folder
            
        Returns:
            BookmarkFolder with all bookmarks and subfolders
        """
        folder = BookmarkFolder(
            name=folder_name,
            path=folder_path,
            bookmarks=[],
            subfolders=[]
        )
        
        # Iterate through direct children of DL
        # In Netscape bookmark format, DL contains DT and nested DL as siblings
        children = list(dl_element.children)
        i = 0
        
        while i < len(children):
            child = children[i]
            
            # Skip non-element nodes (text, NavigableString, etc.)
            if not hasattr(child, 'name') or not child.name:
                i += 1
                continue
            
            if child.name == 'dt':
                # Check if it's a folder (H3) or a bookmark (A)
                h3 = child.find('h3', recursive=False)
                a = child.find('a', recursive=False)
                
                if h3:
                    # This is a folder
                    subfolder_name = h3.get_text(strip=True)
                    subfolder_path = f"{folder_path}{subfolder_name}/"
                    
                    # Get folder metadata
                    add_date = self._parse_timestamp(h3.get('add_date'))
                    last_modified = self._parse_timestamp(h3.get('last_modified'))
                    
                    # Find the associated DL element (should be next sibling)
                    subfolder_dl = None
                    for j in range(i + 1, len(children)):
                        sibling = children[j]
                        if hasattr(sibling, 'name'):
                            if sibling.name == 'dl':
                                subfolder_dl = sibling
                                break
                            elif sibling.name == 'dt':
                                # Next DT found, no DL for this folder
                                break
                    
                    if subfolder_dl:
                        subfolder = self._parse_folder(subfolder_dl, subfolder_name, subfolder_path)
                        subfolder.add_date = add_date
                        subfolder.last_modified = last_modified
                        folder.subfolders.append(subfolder)
                        self.folders_count += 1
                        
                elif a:
                    # This is a bookmark
                    bookmark = self._parse_bookmark(a, folder_path)
                    if bookmark:
                        folder.bookmarks.append(bookmark)
                        self.bookmarks_count += 1
            
            i += 1
        
        return folder
    
    def _parse_bookmark(self, a_element: Tag, folder_path: str) -> Optional[Bookmark]:
        """
        Parse a single bookmark from an A element
        
        Args:
            a_element: BeautifulSoup A tag
            folder_path: Path to the containing folder
            
        Returns:
            Bookmark object or None if parsing fails
        """
        try:
            url = a_element.get('href', '')
            title = a_element.get_text(strip=True)
            
            if not url:
                return None
            
            # Generate unique ID based on URL
            bookmark_id = hashlib.md5(url.encode()).hexdigest()[:16]
            
            # Parse metadata
            add_date = self._parse_timestamp(a_element.get('add_date'))
            icon = a_element.get('icon', '')
            
            # Extract tags if present (some bookmark managers add tags)
            tags = self._extract_tags(a_element)
            
            return Bookmark(
                id=bookmark_id,
                title=title,
                url=url,
                add_date=add_date,
                icon=icon if icon else None,
                folder_path=folder_path,
                tags=tags
            )
            
        except Exception as e:
            logger.error(f"Error parsing bookmark: {e}")
            return None
    
    def _parse_timestamp(self, timestamp_str: Optional[str]) -> Optional[datetime]:
        """
        Parse Unix timestamp string to datetime
        
        Args:
            timestamp_str: Unix timestamp as string
            
        Returns:
            datetime object or None
        """
        if not timestamp_str:
            return None
        
        try:
            timestamp = int(timestamp_str)
            # Handle millisecond timestamps
            if timestamp > 9999999999:
                timestamp = timestamp // 1000
            return datetime.fromtimestamp(timestamp)
        except (ValueError, OSError):
            return None
    
    def _extract_tags(self, a_element: Tag) -> List[str]:
        """
        Extract tags from bookmark attributes
        
        Args:
            a_element: BeautifulSoup A tag
            
        Returns:
            List of tag strings
        """
        tags = []
        
        # Check for TAGS attribute (used by some bookmark managers)
        tags_attr = a_element.get('tags', '')
        if tags_attr:
            tags.extend([t.strip() for t in tags_attr.split(',') if t.strip()])
        
        # Check for SHORTCUTURL (keyword/tag in Firefox)
        shortcut = a_element.get('shortcuturl', '')
        if shortcut:
            tags.append(shortcut)
        
        return tags
    
    def parse_file(self, file_path: str) -> BookmarkCollection:
        """
        Parse a bookmark HTML file
        
        Args:
            file_path: Path to the bookmark HTML file
            
        Returns:
            BookmarkCollection containing all parsed bookmarks
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        return self.parse(html_content)
    
    @staticmethod
    def extract_domain(url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return url
    
    @staticmethod
    def generate_description(bookmark: Bookmark) -> str:
        """
        Generate a searchable description for a bookmark
        
        Args:
            bookmark: Bookmark object
            
        Returns:
            Description string for embedding
        """
        parts = []
        
        # Add title
        if bookmark.title:
            parts.append(f"Title: {bookmark.title}")
        
        # Add URL and domain
        if bookmark.url:
            domain = BookmarkParser.extract_domain(bookmark.url)
            parts.append(f"URL: {bookmark.url}")
            parts.append(f"Domain: {domain}")
        
        # Add folder path
        if bookmark.folder_path and bookmark.folder_path != "/":
            folder_name = bookmark.folder_path.strip('/').replace('/', ' > ')
            parts.append(f"Category: {folder_name}")
        
        # Add tags
        if bookmark.tags:
            parts.append(f"Tags: {', '.join(bookmark.tags)}")
        
        return " | ".join(parts)
