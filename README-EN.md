<a href="README.md">🌐 中文</a> | <a >🌐 English</a>
# Smart Favorites

<p align="center">
  <img src="extension/icons/icon128.png" alt="Smart Favorites Logo" width="128" height="128">
</p>

<p align="center">
  <strong>AI-Powered Browser Bookmark Intelligent Management System</strong><br>
  Supports semantic search, RAG Q&A, intelligent categorization, chat history persistence, and multi-model switching
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Version-1.1.0-green.svg" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Edge%20%7C%20Chrome-orange.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Python-3.11+-yellow.svg" alt="Python">
</p>

---

## ✨ v1.1 New Features

- **Sidebar Mode**: The extension opens as a sidebar, no longer blocking page content.
- **Dual Theme System**: Supports dark mode (Cyber Teal), light mode (Ocean Teal), and auto-follow system.
- **Chat History Persistence**: Conversation history is saved to a local database and automatically restored upon restart.
- **Session Management**: Supports creating, renaming, and deleting multiple conversation sessions.
- **Integrated Settings Panel**: Configure backend and API keys directly within the sidebar.
- **API Key Encrypted Storage**: Sensitive information is encrypted using Fernet and stored on the backend.
- **Independent Window Mode**: Detach the sidebar as a standalone browser window.
- **Toolbar Enhancement**: Added refresh connection, independent window, and theme toggle buttons.

## 🎯 Features

### Core Features

<table style="width:100%">
  <tr>
    <th style="width:20%">Feature</th>
    <th style="width:80%">Description</th>
  </tr>
  <tr>
    <td>🔍 <b>Semantic Search</b></td>
    <td>Intelligent semantic retrieval using a vector database, not just keyword matching.</td>
  </tr>
  <tr>
    <td>💬 <b>AI Q&A</b></td>
    <td>Ask questions about your bookmarks in natural language based on RAG technology.</td>
  </tr>
  <tr>
    <td>📝 <b>Chat History</b></td>
    <td>Conversation history is automatically saved, supporting multi-session management.</td>
  </tr>
  <tr>
    <td>🔄 <b>Auto Sync</b></td>
    <td>Directly reads browser bookmarks, supports automatic/scheduled/manual synchronization.</td>
  </tr>
  <tr>
    <td>🤖 <b>Multi-Model Support</b></td>
    <td>Adapts to OpenAI, DeepSeek, Kimi, Qwen, Claude, Gemini, GLM, Ollama.</td>
  </tr>
</table>

### Intelligent Tools

<table style="width:100%">
  <tr>
    <th style="width:20%">Feature</th>
    <th style="width:80%">Description</th>
  </tr>
  <tr>
    <td>🏷️ <b>Intelligent Categorization</b></td>
    <td>AI analyzes bookmark content and suggests more reasonable categorization methods.</td>
  </tr>
  <tr>
    <td>🔍 <b>Duplicate Detection</b></td>
    <td>Automatically detects duplicate or similar bookmarks and provides consolidation suggestions.</td>
  </tr>
  <tr>
    <td>✅ <b>User Confirmation</b></td>
    <td>All AI suggestions require manual user confirmation before execution.</td>
  </tr>
</table>

### Interface Features

<table style="width:100%">
  <tr>
    <th style="width:20%">Feature</th>
    <th style="width:80%">Description</th>
  </tr>
  <tr>
    <td>🌙 <b>Dual Theme</b></td>
    <td>Dark/Light mode toggle, supports following system settings</td>
  </tr>
  <tr>
    <td>📱 <b>Sidebar</b></td>
    <td>Does not block page content, always accessible</td>
  </tr>
  <tr>
    <td>🪟 <b>Independent Window</b></td>
    <td>Can be detached as a standalone window</td>
  </tr>
  <tr>
    <td>⚙️ <b>Integrated Settings</b></td>
    <td>Configure directly within the extension, no need to open a new page</td>
  </tr>
</table>

## 🖼️ Screenshots Preview

<p align="center">
  <img src="image/dark-mode.jpg" alt="Dark Mode" width="350">
  <img src="image/light-mode.jpg" alt="Light Mode" width="350">
</p>

## 🚀 Quick Start

### 1. Prerequisites

- **Python 3.11+**
- **Edge 114+ / Chrome 114+** (Supports Side Panel API)
- **At least one AI model's API Key** (DeepSeek is recommended for its availability in China and high cost-effectiveness)

### 2. Install Backend

```bash
# 克隆仓库
git clone https://github.com/yourusername/smart-favorites.git
cd smart-favorites

# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. Configure AI Models

**Method A: Using .env file (Recommended for initial setup)**

```bash
# 复制环境变量配置
copy env.example .env  # Windows
cp env.example .env    # Linux/Mac
```

Edit the `backend/.env` file:

```env
# 选择默认使用的模型提供商
DEFAULT_LLM_PROVIDER=deepseek

# DeepSeek (推荐国内用户)
DEEPSEEK_API_KEY=sk-your-api-key

# 或其他模型 (按需配置)
OPENAI_API_KEY=sk-your-api-key
KIMI_API_KEY=sk-your-api-key
QWEN_API_KEY=sk-your-api-key
CLAUDE_API_KEY=sk-your-api-key
GEMINI_API_KEY=your-api-key
GLM_API_KEY=your-api-key
```

**Method B: Using in-extension settings (Recommended for daily use)**

After starting the backend, click the settings icon ⚙️ in the extension sidebar to configure directly:

- Backend address
- Default AI service provider
- API keys for each service provider

API keys are encrypted and stored in the backend database for enhanced security.

### 4. Start Backend Service

```bash
cd backend
python run.py
```

The service will start at **http://localhost:8000**

The first startup will automatically download the Embedding model (approx. 90MB), please be patient.

### 5. Install Browser Extension

**Method A: Install from source (Recommended for developers)**

1. Open the Edge browser and go to `edge://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `extension` directory in the project

**Method B: Download from Release**

1. Go to the [Releases](https://github.com/yourusername/smart-favorites/releases) page
2. Download the latest version of `smart-favorites-extension.zip`
3. Extract it to a local directory
4. Follow steps 1-4 from Method A to load the extracted directory

### 6. Start Using

1. Click the Smart Favorites icon in the browser toolbar, the sidebar will open automatically
2. On first use, go to the **Sync** tab to synchronize your browser bookmarks
3. Perform semantic searches in the **Search** tab
4. Chat with AI in the **Q&A** tab to ask questions about your bookmarks
5. Use intelligent categorization and duplicate detection features in the **AI** tab

## 📁 Project Structure

```
Smart Favorites/
├── backend/                       # Python 后端服务
│   ├── app/
│   │   ├── api/                  # FastAPI 路由
│   │   │   └── routes.py         # API 端点定义
│   │   ├── config/               # 配置管理
│   │   ├── models/               # 数据模型
│   │   │   ├── api_models.py     # API 请求/响应模型
│   │   │   ├── bookmark.py       # 书签模型
│   │   │   ├── chat.py           # 聊天会话模型
│   │   │   └── config.py         # 配置模型
│   │   └── services/             # 核心服务
│   │       ├── bookmark_parser.py    # 书签解析
│   │       ├── vector_store.py       # ChromaDB 向量存储
│   │       ├── llm_adapter.py        # 多 LLM 适配器
│   │       ├── rag_engine.py         # RAG 检索增强生成
│   │       ├── ai_analyzer.py        # AI 分析服务
│   │       ├── chat_storage.py       # 聊天记录存储
│   │       └── config_manager.py     # 配置与密钥管理
│   ├── data/                     # 数据目录 (自动创建)
│   │   ├── chroma/               # 向量数据库
│   │   ├── chat_history.db       # 聊天记录
│   │   └── config.db             # 加密配置
│   ├── requirements.txt          # Python 依赖
│   ├── env.example              # 环境变量示例
│   └── run.py                   # 启动脚本
│
├── extension/                     # 浏览器插件 (Manifest V3)
│   ├── manifest.json             # 插件配置
│   ├── sidepanel/               # 侧边栏界面
│   │   ├── sidepanel.html       # 主界面
│   │   ├── sidepanel.css        # 样式 (含双主题)
│   │   └── sidepanel.js         # 交互逻辑
│   ├── background/              # Service Worker
│   │   └── background.js        # 后台服务
│   ├── options/                 # 设置页面
│   └── icons/                   # 图标资源
│
├── .gitignore                    # Git 忽略配置
├── LICENSE                       # Apache 2.0 许可证
└── README.md                     # 项目说明
```

## 🔌 API Interfaces

### Health Check

```http
GET /health
```

### Connection Status

```http
GET /api/status
```

Response Example:

```json
{
  "status": "connected",
  "model": "deepseek-chat",
  "provider": "deepseek",
  "bookmark_count": 256
}
```

### Sync Favorites

```http
POST /api/bookmarks/sync
Content-Type: application/json

{
  "html_content": "<书签 HTML 内容>",
  "replace_existing": true
}
```

### Semantic Search

```http
POST /api/search
Content-Type: application/json

{
  "query": "机器学习教程",
  "top_k": 10
}
```

### AI Q&A

```http
POST /api/chat
Content-Type: application/json

{
  "message": "我收藏了哪些关于 Python 的网站？",
  "session_id": "会话ID",
  "include_sources": true
}
```

### Session Management

```http
# 获取所有会话
GET /api/chat/sessions

# 创建新会话
POST /api/chat/sessions
{ "title": "新会话" }

# 获取会话详情（含消息）
GET /api/chat/sessions/{session_id}

# 更新会话
PATCH /api/chat/sessions/{session_id}
{ "title": "新标题" }

# 删除会话
DELETE /api/chat/sessions/{session_id}
```

### Settings Management

```http
# 获取当前设置
GET /api/settings

# 设置默认服务商
POST /api/settings/provider
{ "provider": "deepseek" }

# 设置 API 密钥（加密存储）
POST /api/settings/apikey
{ "provider": "deepseek", "api_key": "sk-xxx" }
```

### AI Smart Tools

```http
# 智能分类
POST /api/ai/categorize

# 重复检测
POST /api/ai/duplicates
```

Complete API documentation is available at: **http://localhost:8000/docs**

## 🤖 Supported AI Models

<table style="width:100%">
  <tr>
    <th style="width:20%">Provider</th>
    <th style="width:30%">Model</th>
    <th style="width:50%">Description</th>
  </tr>
  <tr>
    <td><b>DeepSeek</b></td>
    <td>deepseek-chat</td>
    <td>⭐ Recommended, available in China, cost-effective</td>
  </tr>
  <tr>
    <td>OpenAI</td>
    <td>gpt-3.5-turbo, gpt-4</td>
    <td>Requires API Key, may need a proxy</td>
  </tr>
  <tr>
    <td>Kimi</td>
    <td>moonshot-v1-8k</td>
    <td>Moonshot AI, supports long context</td>
  </tr>
  <tr>
    <td>Qwen</td>
    <td>qwen-turbo</td>
    <td>Alibaba Tongyi Qianwen</td>
  </tr>
  <tr>
    <td>Claude</td>
    <td>claude-3-sonnet</td>
    <td>Anthropic</td>
  </tr>
  <tr>
    <td>Gemini</td>
    <td>gemini-pro</td>
    <td>Google</td>
  </tr>
  <tr>
    <td>GLM</td>
    <td>glm-4</td>
    <td>Zhipu AI</td>
  </tr>
  <tr>
    <td>Ollama</td>
    <td>llama2, mistral, etc.</td>
    <td>Local deployment, no API Key required</td>
  </tr>
</table>

## 🛠️ Tech Stack

### Backend

- **FastAPI** - High-performance asynchronous Python web framework
- **ChromaDB** - Vector database for semantic search
- **Sentence Transformers** - Local Embedding model (paraphrase-multilingual-MiniLM-L12-v2)
- **SQLite** - Chat history and configuration storage
- **Cryptography (Fernet)** - API key encryption
- **Multi-LLM SDK** - Official SDKs for OpenAI, Anthropic, Google, etc.

### Frontend/Plugin

- **Manifest V3** - Modern browser extension standard
- **Side Panel API** - Chrome/Edge side panel functionality
- **Native JavaScript** - Lightweight with no dependencies
- **CSS Variables** - Supports theme switching
- **Chrome Storage API** - Local settings storage

## 📋 Development Plan

- [x] Favorites HTML parsing
- [x] ChromaDB vector storage
- [x] RAG (Retrieval-Augmented Generation)
- [x] Multi-LLM adapter
- [x] FastAPI backend
- [x] Edge/Chrome browser extension
- [x] Direct browser favorites reading
- [x] Automatic/scheduled synchronization
- [x] AI bookmark categorization suggestions
- [x] AI duplicate bookmark detection
- [x] Side panel mode (v1.1)
- [x] Dark/light theme switching (v1.1)
- [x] Chat history persistence (v1.1)
- [x] Session management (v1.1)
- [x] API key encrypted storage (v1.1)
- [x] Integrated settings panel (v1.1)
- [ ] Dead link detection
- [ ] Automatic bookmark tagging
- [ ] Multi-language support
- [ ] User login system

## 🤝 Contribution Guidelines

Welcome to submit Issues and Pull Requests!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## ❓ Troubleshooting

### Common Issues

**Q: Backend startup reports "Remote host forced connection closure"**

A: This is a network issue when downloading the Embedding model. Solutions:

- Use a proxy or mirror source
- Manually download the model to `~/.cache/torch/sentence_transformers/`
- Refer to `backend/TROUBLESHOOTING.md`

**Q: Extension cannot connect to the backend**

A: Check the following:

- Is the backend service running? (http://localhost:8000)
- Are there any CORS errors in the browser console?
- Is the connection blocked by a firewall?

**Q: Side panel cannot be opened**

A: Ensure you are using a browser version that supports the Side Panel API:

- Edge 114+
- Chrome 114+

**Q: Chat history is not saved**

A: Ensure:

- The backend service is running
- The session ID is valid (not a local session starting with `local-`)
- Check the backend logs for errors

**Q: API key does not take effect after saving**

A:

- Click the refresh button to reconnect after saving
- Check the backend logs to confirm the key was saved correctly
- Ensure the correct default service provider is selected

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

## 🙏 Acknowledgments

- [ChromaDB](https://www.trychroma.com/) - Vector Database
- [FastAPI](https://fastapi.tiangolo.com/) - Web Framework
- [Sentence Transformers](https://www.sbert.net/) - Embedding Model
- [Lucide Icons](https://lucide.dev/) - Icon Library

---

<p align="center">
  <strong>Smart Favorites</strong> - Make Your Bookmarks Smarter 🔖✨
</p>
