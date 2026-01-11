"""
Configuration manager service for Smart Favorites
Securely stores API keys and configuration in SQLite with encryption
"""
import sqlite3
import base64
import os
import hashlib
from typing import Optional, Dict, List
from pathlib import Path
from cryptography.fernet import Fernet

from ..models.config import ProviderStatus


# Provider display names
PROVIDER_NAMES = {
    "openai": "OpenAI (GPT)",
    "deepseek": "DeepSeek",
    "kimi": "Kimi (Moonshot)",
    "qwen": "Qwen (通义千问)",
    "claude": "Claude",
    "gemini": "Gemini",
    "glm": "GLM (智谱)",
    "ollama": "Ollama (本地)"
}


class ConfigManager:
    """Manages configuration with encrypted API key storage"""
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = Path(__file__).parent.parent.parent
            data_dir = base_dir / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "config.db")
        
        self.db_path = db_path
        self._encryption_key = self._get_or_create_key()
        self._fernet = Fernet(self._encryption_key)
        self._init_db()
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key"""
        base_dir = Path(__file__).parent.parent.parent
        key_file = base_dir / "data" / ".encryption_key"
        
        if key_file.exists():
            return key_file.read_bytes()
        else:
            key = Fernet.generate_key()
            key_file.write_bytes(key)
            return key
    
    def _init_db(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Config table for general settings
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            ''')
            
            # API keys table (encrypted)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_keys (
                    provider TEXT PRIMARY KEY,
                    encrypted_key TEXT NOT NULL
                )
            ''')
            
            conn.commit()
    
    def _encrypt(self, plaintext: str) -> str:
        """Encrypt a string"""
        return self._fernet.encrypt(plaintext.encode()).decode()
    
    def _decrypt(self, ciphertext: str) -> str:
        """Decrypt a string"""
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except Exception:
            return ""
    
    def _mask_key(self, key: str) -> str:
        """Mask an API key for display"""
        if not key or len(key) < 8:
            return "***"
        return f"{key[:3]}***{key[-3:]}"
    
    # ==================== General Config ====================
    
    def get_config(self, key: str, default: str = "") -> str:
        """Get a config value"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT value FROM config WHERE key = ?', (key,))
            row = cursor.fetchone()
            return row[0] if row else default
    
    def set_config(self, key: str, value: str):
        """Set a config value"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)
            ''', (key, value))
            conn.commit()
    
    # ==================== Default Provider ====================
    
    def get_default_provider(self) -> str:
        """Get default LLM provider"""
        # First check database, then fall back to env
        db_provider = self.get_config("default_provider")
        if db_provider:
            return db_provider
        return os.getenv("DEFAULT_LLM_PROVIDER", "deepseek")
    
    def set_default_provider(self, provider: str) -> bool:
        """Set default LLM provider"""
        if provider not in PROVIDER_NAMES:
            return False
        self.set_config("default_provider", provider)
        return True
    
    # ==================== API Keys ====================
    
    def get_api_key(self, provider: str) -> Optional[str]:
        """Get decrypted API key for a provider"""
        # First check database
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT encrypted_key FROM api_keys WHERE provider = ?', (provider,))
            row = cursor.fetchone()
            if row:
                return self._decrypt(row[0])
        
        # Fall back to environment variables
        env_map = {
            "openai": "OPENAI_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "kimi": "KIMI_API_KEY",
            "qwen": "QWEN_API_KEY",
            "claude": "CLAUDE_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "glm": "GLM_API_KEY",
            "ollama": "OLLAMA_BASE_URL"
        }
        
        env_key = env_map.get(provider)
        if env_key:
            return os.getenv(env_key)
        
        return None
    
    def set_api_key(self, provider: str, api_key: str) -> bool:
        """Set API key for a provider (encrypted)"""
        if provider not in PROVIDER_NAMES:
            return False
        
        encrypted = self._encrypt(api_key)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO api_keys (provider, encrypted_key) VALUES (?, ?)
            ''', (provider, encrypted))
            conn.commit()
        
        return True
    
    def delete_api_key(self, provider: str) -> bool:
        """Delete API key for a provider"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM api_keys WHERE provider = ?', (provider,))
            conn.commit()
            return cursor.rowcount > 0
    
    def get_api_key_masked(self, provider: str) -> str:
        """Get masked API key for display"""
        key = self.get_api_key(provider)
        if key:
            return self._mask_key(key)
        return ""
    
    def is_provider_configured(self, provider: str) -> bool:
        """Check if a provider has an API key configured"""
        key = self.get_api_key(provider)
        return bool(key and len(key) > 0)
    
    # ==================== Status ====================
    
    def get_providers_status(self) -> List[ProviderStatus]:
        """Get configuration status for all providers"""
        return [
            ProviderStatus(
                provider=provider,
                configured=self.is_provider_configured(provider),
                display_name=display_name
            )
            for provider, display_name in PROVIDER_NAMES.items()
        ]
    
    def get_all_masked_keys(self) -> Dict[str, str]:
        """Get all API keys masked for display"""
        return {
            provider: self.get_api_key_masked(provider)
            for provider in PROVIDER_NAMES.keys()
        }


# Global instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get or create the global config manager instance"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager
