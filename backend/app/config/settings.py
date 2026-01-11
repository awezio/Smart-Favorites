"""Application settings and configuration"""

from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)
    debug: bool = Field(default=True)
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None)
    openai_base_url: str = Field(default="https://api.openai.com/v1")
    openai_model: str = Field(default="gpt-3.5-turbo")
    
    # DeepSeek Configuration
    deepseek_api_key: Optional[str] = Field(default=None)
    deepseek_base_url: str = Field(default="https://api.deepseek.com/v1")
    deepseek_model: str = Field(default="deepseek-chat")
    
    # Kimi (Moonshot) Configuration
    kimi_api_key: Optional[str] = Field(default=None)
    kimi_base_url: str = Field(default="https://api.moonshot.cn/v1")
    kimi_model: str = Field(default="moonshot-v1-8k")
    
    # Qwen Configuration
    qwen_api_key: Optional[str] = Field(default=None)
    qwen_model: str = Field(default="qwen-turbo")
    
    # Claude Configuration
    claude_api_key: Optional[str] = Field(default=None)
    claude_model: str = Field(default="claude-3-sonnet-20240229")
    
    # Gemini Configuration
    gemini_api_key: Optional[str] = Field(default=None)
    gemini_model: str = Field(default="gemini-pro")
    
    # GLM Configuration
    glm_api_key: Optional[str] = Field(default=None)
    glm_base_url: str = Field(default="https://open.bigmodel.cn/api/paas/v4")
    glm_model: str = Field(default="glm-4")
    
    # Ollama Configuration
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="llama2")
    
    # Embedding Configuration
    embedding_provider: str = Field(default="local")
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    
    # ChromaDB Configuration
    chroma_persist_dir: str = Field(default="./data/chroma")
    chroma_collection_name: str = Field(default="bookmarks")
    
    # Default LLM Provider
    default_llm_provider: str = Field(default="deepseek")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
