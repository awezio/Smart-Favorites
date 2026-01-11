"""
LLM Adapter - Unified interface for multiple LLM providers

Supports: OpenAI, DeepSeek, Kimi, Qwen, Claude, Gemini, GLM, Ollama
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, AsyncGenerator
from dataclasses import dataclass
from loguru import logger

from ..config import settings


@dataclass
class Message:
    """Chat message"""
    role: str  # 'system', 'user', 'assistant'
    content: str


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
        max_tokens: int = 2000
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


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider"""
    
    provider_name = "openai"
    
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.base_url = settings.openai_base_url
        self.default_model = settings.openai_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None, 
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        model = model or self.default_model
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
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
    """DeepSeek API provider (OpenAI compatible)"""
    
    provider_name = "deepseek"
    
    def __init__(self):
        self.api_key = settings.deepseek_api_key
        self.base_url = settings.deepseek_base_url
        self.default_model = settings.deepseek_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        model = model or self.default_model
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
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


class KimiProvider(BaseLLMProvider):
    """Kimi (Moonshot) API provider (OpenAI compatible)"""
    
    provider_name = "kimi"
    
    def __init__(self):
        self.api_key = settings.kimi_api_key
        self.base_url = settings.kimi_base_url
        self.default_model = settings.kimi_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        model = model or self.default_model
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
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


class QwenProvider(BaseLLMProvider):
    """Qwen (Aliyun DashScope) API provider"""
    
    provider_name = "qwen"
    
    def __init__(self):
        self.api_key = settings.qwen_api_key
        self.default_model = settings.qwen_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        import dashscope
        from dashscope import Generation
        
        dashscope.api_key = self.api_key
        model = model or self.default_model
        
        response = Generation.call(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            result_format='message'
        )
        
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
    """Claude (Anthropic) API provider"""
    
    provider_name = "claude"
    
    def __init__(self):
        self.api_key = settings.claude_api_key
        self.default_model = settings.claude_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
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
    """Gemini (Google) API provider"""
    
    provider_name = "gemini"
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.default_model = settings.gemini_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        import google.generativeai as genai
        
        genai.configure(api_key=self.api_key)
        model_name = model or self.default_model
        
        gen_model = genai.GenerativeModel(model_name)
        
        # Convert messages to Gemini format
        history = []
        for m in messages[:-1]:
            role = "user" if m.role == "user" else "model"
            history.append({"role": role, "parts": [m.content]})
        
        chat = gen_model.start_chat(history=history)
        response = chat.send_message(messages[-1].content)
        
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
    """GLM (Zhipu) API provider (OpenAI compatible)"""
    
    provider_name = "glm"
    
    def __init__(self):
        self.api_key = settings.glm_api_key
        self.base_url = settings.glm_base_url
        self.default_model = settings.glm_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        model = model or self.default_model
        
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
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


class OllamaProvider(BaseLLMProvider):
    """Ollama local API provider"""
    
    provider_name = "ollama"
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.default_model = settings.ollama_model
    
    async def chat(self, messages: List[Message], model: Optional[str] = None,
                   temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        import httpx
        
        model = model or self.default_model
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
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
        self.default_provider = settings.default_llm_provider
    
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
        max_tokens: int = 2000
    ) -> LLMResponse:
        """Send chat request to specified provider"""
        llm = self.get_provider(provider)
        
        if not llm.is_available():
            raise ValueError(f"Provider {provider or self.default_provider} is not configured")
        
        return await llm.chat(messages, model, temperature, max_tokens)


# Singleton instance
_llm_adapter: Optional[LLMAdapter] = None

def get_llm_adapter() -> LLMAdapter:
    """Get the singleton LLMAdapter instance"""
    global _llm_adapter
    if _llm_adapter is None:
        _llm_adapter = LLMAdapter()
    return _llm_adapter
