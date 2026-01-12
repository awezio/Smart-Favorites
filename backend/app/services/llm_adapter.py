"""
LLM Adapter - Unified interface for multiple LLM providers

Supports: OpenAI, DeepSeek, Kimi, Qwen, Claude, Gemini, GLM, Ollama
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, AsyncGenerator
from dataclasses import dataclass
from loguru import logger

from ..config import settings
from .config_manager import get_config_manager


@dataclass
class Message:
    """Chat message"""
    role: str  # 'system', 'user', 'assistant'
    content: str
    attachments: Optional[List[dict]] = None  # For multimodal messages


@dataclass
class LLMResponse:
    """LLM response"""
    content: str
    model: str
    provider: str
    usage: Optional[Dict[str, int]] = None


class BaseLLMProvider(ABC):
    """Base class for LLM providers"""
    
    provider_name: str = "base"
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        attachments: Optional[List[dict]] = None,
        web_search: bool = False
    ) -> LLMResponse:
        """Send chat completion request"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available"""
        pass
    
    def get_default_model(self) -> str:
        """Get default model for this provider"""
        return ""
    
    def _build_multimodal_content(self, text: str, attachments: List[dict]) -> List[dict]:
        """Build multimodal content for OpenAI-compatible APIs"""
        content = [{"type": "text", "text": text}]
        
        for att in attachments:
            if att.get('type') == 'image':
                # Extract base64 data from data URL
                image_data = att.get('content', '')
                if image_data.startswith('data:'):
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": image_data}
                    })
        
        return content


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider"""
    
    provider_name = "openai"
    
    def __init__(self):
        self.base_url = settings.openai_base_url
        self.default_model = settings.openai_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("openai") or settings.openai_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None, 
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        from openai import AsyncOpenAI
        import httpx
        
        # Create httpx client explicitly to avoid proxies parameter issue
        http_client = httpx.AsyncClient()
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, http_client=http_client)
        model = model or self.default_model
        
        # Build messages with multimodal support
        formatted_messages = []
        for m in messages:
            if attachments and m.role == "user":
                # Add images to the last user message
                content = self._build_multimodal_content(m.content, attachments)
                formatted_messages.append({"role": m.role, "content": content})
            else:
                formatted_messages.append({"role": m.role, "content": m.content})
        
        response = await client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=model,
            provider=self.provider_name,
            usage={"total_tokens": response.usage.total_tokens} if response.usage else None
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek API provider (OpenAI compatible) with web search support"""
    
    provider_name = "deepseek"
    
    def __init__(self):
        self.base_url = settings.deepseek_base_url
        self.default_model = settings.deepseek_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("deepseek") or settings.deepseek_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        from openai import AsyncOpenAI
        import httpx
        
        # Create httpx client explicitly to avoid proxies parameter issue
        http_client = httpx.AsyncClient()
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, http_client=http_client)
        model = model or self.default_model
        
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]
        
        # Build request kwargs
        request_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Enable web search if requested (DeepSeek supports this via tools)
        if web_search:
            request_kwargs["tools"] = [{"type": "web_search", "web_search": {"enable": True}}]
            logger.info("DeepSeek web search enabled")
        
        response = await client.chat.completions.create(**request_kwargs)
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=model,
            provider=self.provider_name,
            usage={"total_tokens": response.usage.total_tokens} if response.usage else None
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class KimiProvider(BaseLLMProvider):
    """Kimi (Moonshot) API provider (OpenAI compatible) with web search support"""
    
    provider_name = "kimi"
    
    def __init__(self):
        self.base_url = settings.kimi_base_url
        self.default_model = settings.kimi_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("kimi") or settings.kimi_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        from openai import AsyncOpenAI
        import httpx
        
        # Create httpx client explicitly to avoid proxies parameter issue
        http_client = httpx.AsyncClient()
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, http_client=http_client)
        model = model or self.default_model
        
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]
        
        # Build request kwargs
        request_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Kimi supports web search via tools
        if web_search:
            request_kwargs["tools"] = [{"type": "web_search"}]
            logger.info("Kimi web search enabled")
        
        response = await client.chat.completions.create(**request_kwargs)
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=model,
            provider=self.provider_name,
            usage={"total_tokens": response.usage.total_tokens} if response.usage else None
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class QwenProvider(BaseLLMProvider):
    """Qwen (Aliyun DashScope) API provider with multimodal and web search support"""
    
    provider_name = "qwen"
    
    def __init__(self):
        self.default_model = settings.qwen_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("qwen") or settings.qwen_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        import dashscope
        from dashscope import Generation
        
        dashscope.api_key = self.api_key
        model = model or self.default_model
        
        # Build messages with potential multimodal content
        formatted_messages = []
        for m in messages:
            if attachments and m.role == "user":
                # Qwen-VL format for multimodal
                content = [{"text": m.content}]
                for att in attachments:
                    if att.get('type') == 'image':
                        content.insert(0, {"image": att.get('content', '')})
                formatted_messages.append({"role": m.role, "content": content})
            else:
                formatted_messages.append({"role": m.role, "content": m.content})
        
        # Build call kwargs
        call_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "result_format": 'message'
        }
        
        # Qwen supports web search via enable_search parameter
        if web_search:
            call_kwargs["enable_search"] = True
            logger.info("Qwen web search enabled")
        
        response = Generation.call(**call_kwargs)
        
        if response.status_code == 200:
            return LLMResponse(
                content=response.output.choices[0].message.content,
                model=model,
                provider=self.provider_name,
                usage={"total_tokens": response.usage.total_tokens} if response.usage else None
            )
        else:
            raise Exception(f"Qwen API error: {response.message}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class ClaudeProvider(BaseLLMProvider):
    """Claude (Anthropic) API provider with multimodal support"""
    
    provider_name = "claude"
    
    def __init__(self):
        self.default_model = settings.claude_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("claude") or settings.claude_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        from anthropic import AsyncAnthropic
        
        client = AsyncAnthropic(api_key=self.api_key)
        model = model or self.default_model
        
        # Extract system message
        system = ""
        chat_messages = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                # Build multimodal content for user messages with attachments
                if attachments and m.role == "user":
                    content = []
                    # Add images first
                    for att in attachments:
                        if att.get('type') == 'image':
                            image_data = att.get('content', '')
                            if image_data.startswith('data:'):
                                # Extract base64 and media type
                                parts = image_data.split(',')
                                if len(parts) == 2:
                                    media_type = parts[0].replace('data:', '').replace(';base64', '')
                                    base64_data = parts[1]
                                    content.append({
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": media_type,
                                            "data": base64_data
                                        }
                                    })
                    # Add text
                    content.append({"type": "text", "text": m.content})
                    chat_messages.append({"role": m.role, "content": content})
                else:
                    chat_messages.append({"role": m.role, "content": m.content})
        
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=chat_messages
        )
        
        return LLMResponse(
            content=response.content[0].text,
            model=model,
            provider=self.provider_name,
            usage={"total_tokens": response.usage.input_tokens + response.usage.output_tokens}
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class GeminiProvider(BaseLLMProvider):
    """Gemini (Google) API provider with multimodal support"""
    
    provider_name = "gemini"
    
    def __init__(self):
        self.default_model = settings.gemini_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("gemini") or settings.gemini_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        import google.generativeai as genai
        import base64
        
        genai.configure(api_key=self.api_key)
        model_name = model or self.default_model
        
        gen_model = genai.GenerativeModel(model_name)
        
        # Convert messages to Gemini format
        history = []
        for m in messages[:-1]:
            role = "user" if m.role == "user" else "model"
            history.append({"role": role, "parts": [m.content]})
        
        chat = gen_model.start_chat(history=history)
        
        # Build content parts for the last message
        last_message = messages[-1]
        content_parts = []
        
        # Add images if attachments present
        if attachments:
            for att in attachments:
                if att.get('type') == 'image':
                    image_data = att.get('content', '')
                    if image_data.startswith('data:'):
                        # Extract base64 data
                        parts = image_data.split(',')
                        if len(parts) == 2:
                            mime_type = parts[0].replace('data:', '').replace(';base64', '')
                            base64_data = parts[1]
                            content_parts.append({
                                "mime_type": mime_type,
                                "data": base64_data
                            })
        
        # Add text
        content_parts.append(last_message.content)
        
        response = chat.send_message(content_parts if len(content_parts) > 1 else last_message.content)
        
        return LLMResponse(
            content=response.text,
            model=model_name,
            provider=self.provider_name
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class GLMProvider(BaseLLMProvider):
    """GLM (Zhipu) API provider (OpenAI compatible) with multimodal and web search support"""
    
    provider_name = "glm"
    
    def __init__(self):
        self.base_url = settings.glm_base_url
        self.default_model = settings.glm_model
    
    @property
    def api_key(self):
        """Get API key from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_api_key("glm") or settings.glm_api_key
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        from openai import AsyncOpenAI
        import httpx
        
        # Create httpx client explicitly to avoid proxies parameter issue
        http_client = httpx.AsyncClient()
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, http_client=http_client)
        model = model or self.default_model
        
        # Build messages with multimodal support for GLM-4V
        formatted_messages = []
        for m in messages:
            if attachments and m.role == "user":
                # GLM-4V uses OpenAI-compatible multimodal format
                content = self._build_multimodal_content(m.content, attachments)
                formatted_messages.append({"role": m.role, "content": content})
            else:
                formatted_messages.append({"role": m.role, "content": m.content})
        
        # Build request kwargs
        request_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # GLM supports web search via tools
        if web_search:
            request_kwargs["tools"] = [{"type": "web_search", "web_search": {"enable": True}}]
            logger.info("GLM web search enabled")
        
        response = await client.chat.completions.create(**request_kwargs)
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=model,
            provider=self.provider_name,
            usage={"total_tokens": response.usage.total_tokens} if response.usage else None
        )
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def get_default_model(self) -> str:
        return self.default_model


class OllamaProvider(BaseLLMProvider):
    """Ollama local API provider with multimodal support for llava models"""
    
    provider_name = "ollama"
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.default_model = settings.ollama_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000,
                   attachments: Optional[List[dict]] = None,
                   web_search: bool = False) -> LLMResponse:
        import httpx
        
        model = model or self.default_model
        
        # Build messages with optional images for multimodal models (llava, etc.)
        formatted_messages = []
        for m in messages:
            msg = {"role": m.role, "content": m.content}
            if attachments and m.role == "user":
                # Add images as base64 for Ollama multimodal models
                images = []
                for att in attachments:
                    if att.get('type') == 'image':
                        image_data = att.get('content', '')
                        if image_data.startswith('data:'):
                            # Extract base64 data
                            parts = image_data.split(',')
                            if len(parts) == 2:
                                images.append(parts[1])
                if images:
                    msg["images"] = images
            formatted_messages.append(msg)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": formatted_messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
        
        return LLMResponse(
            content=data["message"]["content"],
            model=model,
            provider=self.provider_name
        )
    
    def is_available(self) -> bool:
        import httpx
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=5.0)
            return response.status_code == 200
        except Exception:
            return False
    
    def get_default_model(self) -> str:
        return self.default_model


class LLMAdapter:
    """Unified LLM adapter supporting multiple providers"""
    
    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {
            "openai": OpenAIProvider(),
            "deepseek": DeepSeekProvider(),
            "kimi": KimiProvider(),
            "qwen": QwenProvider(),
            "claude": ClaudeProvider(),
            "gemini": GeminiProvider(),
            "glm": GLMProvider(),
            "ollama": OllamaProvider(),
        }
        self._active_connections: Dict[str, Any] = {}  # Track active connections
    
    @property
    def default_provider(self) -> str:
        """Get default provider from ConfigManager (dynamic)"""
        config = get_config_manager()
        return config.get_default_provider()
    
    def get_provider(self, provider_name: Optional[str] = None) -> BaseLLMProvider:
        """Get a specific provider"""
        name = provider_name or self.default_provider
        if name not in self.providers:
            raise ValueError(f"Unknown provider: {name}")
        return self.providers[name]
    
    def get_available_providers(self) -> List[str]:
        """Get list of available (configured) providers"""
        return [name for name, provider in self.providers.items() if provider.is_available()]
    
    def get_all_models(self) -> List[Dict[str, Any]]:
        """Get all available models"""
        models = []
        for name, provider in self.providers.items():
            models.append({
                "provider": name,
                "model": provider.get_default_model(),
                "display_name": f"{name.upper()} - {provider.get_default_model()}",
                "available": provider.is_available()
            })
        return models
    
    async def chat(
        self,
        messages: List[Message],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        attachments: Optional[List[dict]] = None,
        web_search: bool = False
    ) -> LLMResponse:
        """Send chat request to specified provider"""
        provider_name = provider or self.default_provider
        
        # Close previous provider's connections if switching
        if provider_name in self._active_connections:
            previous_provider = self._active_connections.get(provider_name)
            if previous_provider and previous_provider != provider_name:
                await self._close_provider_connections(previous_provider)
        
        llm = self.get_provider(provider_name)
        
        if not llm.is_available():
            raise ValueError(f"Provider {provider_name} is not configured")
        
        # Track active provider
        self._active_connections[provider_name] = provider_name
        
        # If attachments are provided, use vision model for supported providers
        actual_model = model
        if attachments and any(a.get('type') == 'image' for a in attachments):
            vision_model = self._get_vision_model(provider_name)
            if vision_model:
                actual_model = vision_model
                logger.info(f"Using vision model {vision_model} for multimodal request")
        
        try:
            return await llm.chat(
                messages, 
                actual_model, 
                temperature, 
                max_tokens,
                attachments=attachments,
                web_search=web_search
            )
        finally:
            # Clean up connections after use (for providers that create new clients each time)
            pass
    
    def _get_vision_model(self, provider_name: str) -> Optional[str]:
        """Get vision-capable model for a provider"""
        vision_models = {
            "openai": settings.openai_vision_model,
            "claude": settings.claude_vision_model,
            "gemini": settings.gemini_vision_model,
            "glm": settings.glm_vision_model,
            "qwen": settings.qwen_vision_model,
        }
        return vision_models.get(provider_name)
    
    async def _close_provider_connections(self, provider_name: str):
        """Close connections for a specific provider"""
        try:
            provider = self.providers.get(provider_name)
            if provider and hasattr(provider, 'close'):
                await provider.close()
            logger.debug(f"Closed connections for provider: {provider_name}")
        except Exception as e:
            logger.warning(f"Error closing connections for {provider_name}: {e}")
    
    async def close_all_connections(self):
        """Close all active connections"""
        for provider_name in list(self._active_connections.keys()):
            await self._close_provider_connections(provider_name)
        self._active_connections.clear()
        logger.info("All LLM provider connections closed")


# Singleton instance
_llm_adapter: Optional[LLMAdapter] = None

def get_llm_adapter() -> LLMAdapter:
    """Get the singleton LLMAdapter instance"""
    global _llm_adapter
    if _llm_adapter is None:
        _llm_adapter = LLMAdapter()
    return _llm_adapter
