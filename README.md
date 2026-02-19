<a >🌐 中文</a> | <a href="README-EN.md">🌐 English</a>

# Smart Favorites 智能收藏夹

[![GitHub stars](https://img.shields.io/github/stars/awezio/Smart-Favorites?logo=github)](https://github.com/awezio/Smart-Favorites/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/awezio/Smart-Favorites?logo=github)](https://github.com/awezio/Smart-Favorites/issues)
[![license](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/Version-2.0.3-green.svg)
![Platform](https://img.shields.io/badge/Platform-Edge%20%7C%20Chrome%20%7C%20Web-orange.svg)
![Python](https://img.shields.io/badge/Python-3.11+-yellow.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-blue.svg)

<p align="center">
  <img src="extension/icons/icon128.png" alt="Smart Favorites Logo" width="128" height="128">
</p>

<p align="center">
  <strong>基于 AI 的浏览器收藏夹智能管理系统</strong><br>
  支持语义搜索、RAG 问答、智能分类、聊天记录持久化和多模型切换
</p>

<p align="center">
  <strong>Web 端 + 浏览器插件</strong>：先部署 <a href="smart-favorites-web/QUICK_START.md">Web 端</a>（Next.js + Supabase / Vercel），插件统一接入 Web 端 API；如需本地运行也可自行部署 <code>backend/</code>。
</p>

---

## ✨ v2.0 新特性

- **Web 端应用**: 独立 Next.js 应用，支持部署到 Vercel，无需本地运行后端
- **Supabase 后端**: 书签与 GitHub Stars 使用 PostgreSQL + pgvector 向量搜索
- **GitHub Stars 支持**: 管理 GitHub 星标仓库，与书签统一检索与 AI 问答
- **插件统一接入 Web 端**: 浏览器插件默认连接 Web 端 API，数据云端同步

## ✨ v1.1 新特性

- **侧边栏模式**: 插件以侧边栏形式打开，不再遮挡页面内容
- **双主题系统**: 支持深色模式（Cyber Teal）、浅色模式（Ocean Teal）和自动跟随系统
- **聊天记录持久化**: 对话历史保存到本地数据库，重启后自动恢复
- **会话管理**: 支持创建、重命名、删除多个对话会话
- **集成设置面板**: 在侧边栏内直接配置后端和 API 密钥
- **API 密钥加密存储**: 敏感信息使用 Fernet 加密存储在后端
- **独立窗口模式**: 可将侧边栏分离为独立浏览器窗口
- **工具栏增强**: 新增刷新连接、独立窗口、主题切换按钮

## 🎯 功能特性

### 核心功能

<table style="width:100%">
  <tr>
    <th style="width:20%">功能</th>
    <th style="width:80%">描述</th>
  </tr>
  <tr>
    <td>🔍 <b>语义搜索</b></td>
    <td>使用向量数据库进行智能语义检索，不仅仅是关键词匹配</td>
  </tr>
  <tr>
    <td>💬 <b>AI 问答</b></td>
    <td>基于 RAG 技术，用自然语言询问收藏夹相关问题</td>
  </tr>
  <tr>
    <td>📝 <b>聊天记录</b></td>
    <td>对话历史自动保存，支持多会话管理</td>
  </tr>
  <tr>
    <td>🔄 <b>自动同步</b></td>
    <td>直接读取浏览器收藏夹，支持自动/定时/手动同步</td>
  </tr>
  <tr>
    <td>🤖 <b>多模型支持</b></td>
    <td>适配 OpenAI、DeepSeek、Kimi、Qwen、Claude、Gemini、GLM、Ollama</td>
  </tr>
</table>


### 智能工具

<table style="width:100%">
  <tr>
    <th style="width:20%">功能</th>
    <th style="width:80%">描述</th>
  </tr>
  <tr>
    <td>🏷️ <b>智能分类</b></td>
    <td>AI 分析书签内容，建议更合理的分类方式</td>
  </tr>
  <tr>
    <td>🔍 <b>重复检测</b></td>
    <td>自动检测重复或相似的书签，提供整合建议</td>
  </tr>
  <tr>
    <td>✅ <b>用户确认</b></td>
    <td>所有 AI 建议需用户手动确认后才会执行</td>
  </tr>
</table>


### 界面特性

<table style="width:100%">
  <tr>
    <th style="width:20%">功能</th>
    <th style="width:80%">描述</th>
  </tr>
  <tr>
    <td>🌙 <b>双主题</b></td>
    <td>深色/浅色模式切换，支持跟随系统</td>
  </tr>
  <tr>
    <td>📱 <b>侧边栏</b></td>
    <td>不遮挡页面内容，随时可用</td>
  </tr>
  <tr>
    <td>🪟 <b>独立窗口</b></td>
    <td>可分离为独立窗口使用</td>
  </tr>
  <tr>
    <td>⚙️ <b>集成设置</b></td>
    <td>在插件内直接配置，无需打开新页面</td>
  </tr>
</table>


## 🖼️ 截图预览

<p align="center">
  <img src="image/dark-mode.jpg" alt="Dark Mode" width="350">
  <img src="image/light-mode.jpg" alt="Light Mode" width="350">
</p>

## 🚀 快速开始

### 1. 部署 Web 端

1. 进入目录 `smart-favorites-web`
2. 按照 [smart-favorites-web/QUICK_START.md](smart-favorites-web/QUICK_START.md) 完成 Supabase 建表、环境变量与 Vercel 部署
3. 获得你的 Web 端地址（如 `https://xxx.vercel.app`）

### 2. 安装浏览器插件并接入 Web 端

1. 打开 Edge / Chrome，访问 `edge://extensions/` 或 `chrome://extensions/`
2. 开启「**开发人员模式**」，点击「**加载解压缩的扩展**」，选择项目中的 `extension` 目录（或从 [Releases](https://github.com/yourusername/smart-favorites/releases) 下载并解压后加载）
3. 在插件侧边栏中打开 **设置**，将「后端地址」填写为你的 Web 端地址（如 `https://xxx.vercel.app`），保存并刷新连接

### 3. 开始使用

在侧边栏中同步书签、语义搜索、AI 问答与智能分类等，数据均保存在 Web 端。

---

**可选：本地后端**  
如需在本地运行后端（不依赖 Vercel/Supabase），可自行部署 `backend/`，详见 `backend/README.md`。插件将后端地址指向 `http://localhost:8000` 即可。

## 📁 项目结构

```
Smart Favorites/
├── backend/                       # 本地 Python 后端（可选，自托管用）
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
├── smart-favorites-web/          # Web 端 (Next.js 15 + Supabase)
│   ├── app/                     # Next.js App Router 页面与 API
│   ├── components/              # React 组件
│   ├── supabase/                # 迁移与类型
│   │   └── migrations/          # 数据库建表与向量搜索函数
│   ├── QUICK_START.md           # Web 端快速开始
│   └── package.json
│
├── .gitignore                    # Git 忽略配置
├── LICENSE                       # Apache 2.0 许可证
├── README.md                     # 项目说明（中文）
└── README-EN.md                  # 项目说明（英文）
```

## 🔌 API 接口

以下为**本地后端**（`backend/`）的 API；使用 Web 端时请以 Web 端实际路由与文档为准。

### 健康检查

```http
GET /health
```

### 连接状态

```http
GET /api/status
```

响应示例：
```json
{
  "status": "connected",
  "model": "deepseek-chat",
  "provider": "deepseek",
  "bookmark_count": 256
}
```

### 同步收藏夹

```http
POST /api/bookmarks/sync
Content-Type: application/json

{
  "html_content": "<书签 HTML 内容>",
  "replace_existing": true
}
```

### 语义搜索

```http
POST /api/search
Content-Type: application/json

{
  "query": "机器学习教程",
  "top_k": 10
}
```

### AI 问答

```http
POST /api/chat
Content-Type: application/json

{
  "message": "我收藏了哪些关于 Python 的网站？",
  "session_id": "会话ID",
  "include_sources": true
}
```

### 会话管理

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

### 设置管理

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

### AI 智能工具

```http
# 智能分类
POST /api/ai/categorize

# 重复检测
POST /api/ai/duplicates
```

完整 API 文档请访问: **http://localhost:8000/docs**

## 🤖 支持的 AI 模型

<table style="width:100%">
  <tr>
    <th style="width:20%">提供商</th>
    <th style="width:30%">模型</th>
    <th style="width:50%">说明</th>
  </tr>
  <tr>
    <td><b>DeepSeek</b></td>
    <td>deepseek-chat</td>
    <td>⭐ 推荐，国内可用，性价比高</td>
  </tr>
  <tr>
    <td>OpenAI</td>
    <td>gpt-3.5-turbo, gpt-4</td>
    <td>需要 API Key，可能需要代理</td>
  </tr>
  <tr>
    <td>Kimi</td>
    <td>moonshot-v1-8k</td>
    <td>月之暗面，支持长文本</td>
  </tr>
  <tr>
    <td>Qwen</td>
    <td>qwen-turbo</td>
    <td>阿里通义千问</td>
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
    <td>智谱 AI</td>
  </tr>
  <tr>
    <td>Ollama</td>
    <td>llama2, mistral 等</td>
    <td>本地部署，无需 API Key</td>
  </tr>
</table>

## 🛠️ 技术栈

### Web 端 (smart-favorites-web)

- **Next.js 15** - React 全栈框架（App Router）
- **Supabase** - PostgreSQL + pgvector 向量搜索、认证与存储
- **Vercel** - 前端与 Serverless 部署
- **Tailwind CSS / shadcn/ui** - 样式与组件

### 本地后端（可选，自托管时使用）

- **FastAPI** - 高性能异步 Python Web 框架
- **ChromaDB** - 向量数据库，用于语义搜索
- **Sentence Transformers** - 本地 Embedding 模型 (paraphrase-multilingual-MiniLM-L12-v2)
- **SQLite** - 聊天记录和配置存储
- **Cryptography (Fernet)** - API 密钥加密
- **多 LLM SDK** - OpenAI、Anthropic、Google 等官方 SDK

### 前端/插件

- **Manifest V3** - 现代浏览器插件标准
- **Side Panel API** - Chrome/Edge 侧边栏功能
- **原生 JavaScript** - 轻量无依赖
- **CSS 变量** - 支持主题切换
- **Chrome Storage API** - 本地设置存储

## 📋 开发计划

- [x] 收藏夹 HTML 解析
- [x] ChromaDB 向量存储
- [x] RAG 检索增强生成
- [x] 多 LLM 适配器
- [x] FastAPI 后端
- [x] Edge/Chrome 浏览器插件
- [x] 直接读取浏览器收藏夹
- [x] 自动/定时同步
- [x] AI 书签分类建议
- [x] AI 重复书签检测
- [x] 侧边栏模式 (v1.1)
- [x] 深色/浅色主题切换 (v1.1)
- [x] 聊天记录持久化 (v1.1)
- [x] 会话管理 (v1.1)
- [x] API 密钥加密存储 (v1.1)
- [x] 集成设置面板 (v1.1)
- [x] Web 端应用 Next.js + Supabase (v2.0)
- [x] GitHub Stars 管理与统一检索 (v2.0)
- [x] Vercel 部署与扩展连接 Web API (v2.0)
- [ ] 死链检测
- [ ] 书签标签自动生成
- [ ] 多语言支持
- [ ] 用户登录系统

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## ❓ 故障排除

### 常见问题

**Q: 后端启动时提示 "远程主机强迫关闭连接"**

A: 这是下载 Embedding 模型时的网络问题。解决方案：
- 使用代理或镜像源
- 手动下载模型到 `~/.cache/torch/sentence_transformers/`
- 参考 `backend/TROUBLESHOOTING.md`

**Q: 插件无法连接后端**

A: 检查以下几点：
- 后端服务是否正在运行 (http://localhost:8000)
- 浏览器控制台是否有 CORS 错误
- 防火墙是否阻止了连接

**Q: 侧边栏无法打开**

A: 确保使用的是支持 Side Panel API 的浏览器版本：
- Edge 114+
- Chrome 114+

**Q: 聊天记录没有保存**

A: 确保：
- 后端服务正在运行
- 会话 ID 有效（不是以 `local-` 开头的本地会话）
- 检查后端日志是否有错误

**Q: API 密钥保存后不生效**

A: 
- 保存后点击刷新按钮重新连接
- 检查后端日志确认密钥是否正确保存
- 确保选择了正确的默认服务商

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可证。

## 🙏 致谢

- [ChromaDB](https://www.trychroma.com/) - 向量数据库
- [FastAPI](https://fastapi.tiangolo.com/) - Web 框架
- [Sentence Transformers](https://www.sbert.net/) - Embedding 模型
- [Lucide Icons](https://lucide.dev/) - 图标库

---

<p align="center">
  <strong>Smart Favorites</strong> - 让收藏夹更智能 🔖✨
</p>
