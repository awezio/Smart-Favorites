"""
SQLite-based chat history storage service
"""
import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from ..models.chat import ChatSession, ChatMessage


class ChatStorage:
    """Manages chat session storage using SQLite"""
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to backend/data/chat_history.db
            base_dir = Path(__file__).parent.parent.parent
            data_dir = base_dir / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "chat_history.db")
        
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '新会话',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    sources TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )
            ''')
            
            # Index for faster message retrieval
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_messages_session 
                ON messages(session_id)
            ''')
            
            conn.commit()
    
    def create_session(self, title: str = "新会话") -> ChatSession:
        """Create a new chat session"""
        session = ChatSession(title=title)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sessions (id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (
                session.id,
                session.title,
                session.created_at.isoformat(),
                session.updated_at.isoformat()
            ))
            conn.commit()
        
        return session
    
    def get_all_sessions(self) -> List[ChatSession]:
        """Get all chat sessions (without messages, for listing)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, title, created_at, updated_at
                FROM sessions
                ORDER BY updated_at DESC
            ''')
            
            sessions = []
            for row in cursor.fetchall():
                sessions.append(ChatSession(
                    id=row[0],
                    title=row[1],
                    created_at=datetime.fromisoformat(row[2]),
                    updated_at=datetime.fromisoformat(row[3]),
                    messages=[]
                ))
            
            return sessions
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a specific session with all messages"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get session
            cursor.execute('''
                SELECT id, title, created_at, updated_at
                FROM sessions
                WHERE id = ?
            ''', (session_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            session = ChatSession(
                id=row[0],
                title=row[1],
                created_at=datetime.fromisoformat(row[2]),
                updated_at=datetime.fromisoformat(row[3]),
                messages=[]
            )
            
            # Get messages
            cursor.execute('''
                SELECT id, role, content, timestamp, sources
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC
            ''', (session_id,))
            
            for msg_row in cursor.fetchall():
                sources = None
                if msg_row[4]:
                    try:
                        sources = json.loads(msg_row[4])
                    except json.JSONDecodeError:
                        pass
                
                session.messages.append(ChatMessage(
                    id=msg_row[0],
                    role=msg_row[1],
                    content=msg_row[2],
                    timestamp=datetime.fromisoformat(msg_row[3]),
                    sources=sources
                ))
            
            return session
    
    def update_session(self, session_id: str, title: Optional[str] = None) -> bool:
        """Update session metadata"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if title is not None:
                cursor.execute('''
                    UPDATE sessions
                    SET title = ?, updated_at = ?
                    WHERE id = ?
                ''', (title, datetime.now().isoformat(), session_id))
            else:
                cursor.execute('''
                    UPDATE sessions
                    SET updated_at = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), session_id))
            
            conn.commit()
            return cursor.rowcount > 0
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its messages"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Delete messages first
            cursor.execute('DELETE FROM messages WHERE session_id = ?', (session_id,))
            
            # Delete session
            cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            
            conn.commit()
            return cursor.rowcount > 0
    
    def add_message(
        self, 
        session_id: str, 
        role: str, 
        content: str, 
        sources: Optional[List[dict]] = None
    ) -> ChatMessage:
        """Add a message to a session"""
        message = ChatMessage(
            role=role,
            content=content,
            sources=sources
        )
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Insert message
            cursor.execute('''
                INSERT INTO messages (id, session_id, role, content, timestamp, sources)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                message.id,
                session_id,
                message.role,
                message.content,
                message.timestamp.isoformat(),
                json.dumps(sources) if sources else None
            ))
            
            # Update session's updated_at
            cursor.execute('''
                UPDATE sessions
                SET updated_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), session_id))
            
            conn.commit()
        
        return message
    
    def clear_all_sessions(self) -> int:
        """Delete all sessions and messages"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM messages')
            cursor.execute('DELETE FROM sessions')
            conn.commit()
            return cursor.rowcount


# Global instance
_chat_storage: Optional[ChatStorage] = None


def get_chat_storage() -> ChatStorage:
    """Get or create the global chat storage instance"""
    global _chat_storage
    if _chat_storage is None:
        _chat_storage = ChatStorage()
    return _chat_storage
