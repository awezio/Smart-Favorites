"""
Configuration models for Smart Favorites
"""
from typing import Optional, Dict, List
from pydantic import BaseModel


class ProviderStatus(BaseModel):
    """Status of a single provider"""
    provider: str
    configured: bool
    display_name: str


class ConfigResponse(BaseModel):
    """Configuration response (without sensitive data)"""
    backend_url: str = "http://localhost:8000"
    default_provider: str = "deepseek"
    providers_status: List[ProviderStatus] = []


class SetProviderRequest(BaseModel):
    """Request to set default provider"""
    provider: str


class SetApiKeyRequest(BaseModel):
    """Request to set API key for a provider"""
    provider: str
    api_key: str


class ApiKeyMasked(BaseModel):
    """Masked API key for display"""
    provider: str
    masked_key: str  # e.g., "sk-***...***abc"
    configured: bool
