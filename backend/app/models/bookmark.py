"""Bookmark data models"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class Bookmark(BaseModel):
    """Single bookmark item"""
    
    id: Optional[str] = Field(default=None, description="Unique identifier")
    title: str = Field(..., description="Bookmark title")
    url: str = Field(..., description="Bookmark URL")
    add_date: Optional[datetime] = Field(default=None, description="Date when bookmark was added")
    icon: Optional[str] = Field(default=None, description="Base64 encoded favicon")
    folder_path: str = Field(default="/", description="Folder path in bookmark hierarchy")
    description: Optional[str] = Field(default=None, description="Optional description")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    
    def to_text(self) -> str:
        """Convert bookmark to searchable text"""
        parts = [self.title, self.url]
        if self.description:
            parts.append(self.description)
        if self.folder_path and self.folder_path != "/":
            parts.append(f"Folder: {self.folder_path}")
        if self.tags:
            parts.append(f"Tags: {', '.join(self.tags)}")
        return " | ".join(parts)


class BookmarkFolder(BaseModel):
    """Bookmark folder"""
    
    name: str = Field(..., description="Folder name")
    path: str = Field(..., description="Full folder path")
    add_date: Optional[datetime] = Field(default=None, description="Date when folder was created")
    last_modified: Optional[datetime] = Field(default=None, description="Last modification date")
    bookmarks: List[Bookmark] = Field(default_factory=list, description="Bookmarks in this folder")
    subfolders: List["BookmarkFolder"] = Field(default_factory=list, description="Subfolders")


class BookmarkCollection(BaseModel):
    """Collection of all bookmarks"""
    
    root: BookmarkFolder = Field(..., description="Root folder")
    total_bookmarks: int = Field(default=0, description="Total number of bookmarks")
    total_folders: int = Field(default=0, description="Total number of folders")
    imported_at: datetime = Field(default_factory=datetime.now, description="Import timestamp")
    
    def get_all_bookmarks(self) -> List[Bookmark]:
        """Recursively get all bookmarks from all folders"""
        bookmarks = []
        
        def collect(folder: BookmarkFolder):
            bookmarks.extend(folder.bookmarks)
            for subfolder in folder.subfolders:
                collect(subfolder)
        
        collect(self.root)
        return bookmarks
