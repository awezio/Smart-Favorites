# Smart Favorites 智能收藏夹

<p align="center">
  <img src="extension/icons/icon128.png" alt="Smart Favorites Logo" width="128" height="128">
</p>

<p align="center">
  <strong>基于 AI 的浏览器收藏夹智能管理系统</strong><br>
  支持语义搜索、RAG 问答、智能分类和重复检测
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Version-1.1.0-green.svg" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Edge%20%7C%20Chrome-orange.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Python-3.11+-yellow.svg" alt="Python">
</p>

---

## v1.1 新特性

- **侧边栏模式**: 插件现在以侧边栏形式打开，不再遮挡页面内容
- **双主题系统**: 支持深色模式、浅色模式和自动跟随系统
- **工具栏增强**: 新增刷新、独立窗口、主题切换、关闭按钮
- **独立窗口**: 可将侧边栏分离为独立浏览器窗口

## 功能特性

### 核心功能

| 功能              | 描述                                                   |
| ----------------- | ------------------------------------------------------ |
| 🔍 **语义搜索**   | 使用向量数据库进行智能语义检索，不仅仅是关键词匹配     |
| 💬 **AI 问答**    | 基于 RAG 技术，用自然语言询问收藏夹相关问题            |
| 🔄 **自动同步**   | 直接读取浏览器收藏夹，支持自动/定时/手动同步           |
| 🤖 **多模型支持** | 适配 OpenAI、DeepSeek、Kimi、Qwen、Claude 等主流大模型 |

### 智能工具

| 功能            | 描述                                   |
| --------------- | -------------------------------------- |
| 🏷️ **智能分类** | AI 分析书签内容，建议更合理的分类方式  |
| 🔍 **重复检测** | 自动检测重复或相似的书签，提供整合建议 |
| ✅ **用户确认** | 所有 AI 建议需用户手动确认后才会执行   |

## 截图预览

<p align="center">
  <i>侧边栏深色模式</i><br>
  <!-- <img src="docs/screenshots/dark-mode.png" alt="Dark Mode" width="400"> -->
</p>

<p align="center">
  <i>侧边栏浅色模式</i><br>
  <!-- <img src="docs/screenshots/light-mode.png" alt="Light Mode" width="400"> -->
</p>

## 快速开始

### 1. 环境要求

- Python 3.11+
- Edge/Chrome 浏览器 (支持 Manifest V3)
- 至少一个 AI 模型的 API Key

### 2. 安装后端

```bash
# 克隆仓库
git clone https://github.com/yourusername/smart-favorites.git
cd smart-favorites

# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp env.example .env  # Linux/Mac
copy env.example .env  # Windows
```

### 3. 配置 AI 模型

编辑 `backend/.env` 文件，配置你的 API 密钥：

```env
# 选择默认使用的模型提供商
DEFAULT_LLM_PROVIDER=deepseek

# DeepSeek (推荐国内用户使用)
DEEPSEEK_API_KEY=sk-your-api-key

# 或其他模型
OPENAI_API_KEY=sk-your-api-key
KIMI_API_KEY=sk-your-api-key
```

### 4. 启动后端服务

```bash
cd backend
python run.py
```

服务将在 http://localhost:8000 启动

### 5. 安装浏览器插件

**方法 A: 从 Release 下载**

1. 前往 [Releases](https://github.com/yourusername/smart-favorites/releases) 页面
2. 下载最新版本的 `smart-favorites-extension.zip`
3. 解压到本地目录

**方法 B: 从源码安装**

直接使用项目中的 `extension` 目录

**加载插件:**

1. 打开 Edge 浏览器，访问 `edge://extensions/`
2. 开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择 `extension` 目录

## 项目结构

```
Smart Favorites/
├── backend/                    # Python 后端服务
│   ├── app/
│   │   ├── api/               # FastAPI 路由
│   │   ├── config/            # 配置管理
│   │   ├── models/            # 数据模型
│   │   └── services/          # 核心服务
│   │       ├── bookmark_parser.py  # 书签解析
│   │       ├── vector_store.py     # 向量存储
│   │       ├── llm_adapter.py      # LLM 适配器
│   │       ├── rag_engine.py       # RAG 引擎
│   │       └── ai_analyzer.py      # AI 分析
│   ├── requirements.txt       # Python 依赖
│   ├── env.example           # 环境变量示例
│   └── run.py                # 启动脚本
├── extension/                  # 浏览器插件
│   ├── manifest.json          # 插件配置 (Manifest V3)
│   ├── sidepanel/            # 侧边栏界面 (v1.1 新增)
│   │   ├── sidepanel.html
│   │   ├── sidepanel.css     # 含深色/浅色双主题
│   │   └── sidepanel.js
│   ├── background/            # 后台服务
│   ├── options/               # 设置页面
│   └── icons/                 # 图标资源
├── LICENSE                    # Apache 2.0 许可证
└── README.md
```

## API 接口

### 健康检查

```http
GET /api/health
```

### 同步收藏夹

```http
POST /api/bookmarks/sync
Content-Type: application/json

{
  "html_content": "<书签 HTML>",
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
  "include_sources": true
}
```

### AI 智能分类

```http
POST /api/ai/categorize
```

### 重复检测

```http
POST /api/ai/duplicates
```

完整 API 文档请访问: http://localhost:8000/docs

## 支持的 AI 模型

| 提供商   | 模型                 | 说明                   |
| -------- | -------------------- | ---------------------- |
| OpenAI   | gpt-3.5-turbo, gpt-4 | 需要 API Key           |
| DeepSeek | deepseek-chat        | 国内可用，性价比高     |
| Kimi     | moonshot-v1-8k       | 月之暗面，支持长文本   |
| Qwen     | qwen-turbo           | 阿里通义千问           |
| Claude   | claude-3-sonnet      | Anthropic              |
| Gemini   | gemini-pro           | Google                 |
| GLM      | glm-4                | 智谱 AI                |
| Ollama   | llama2 等            | 本地部署，无需 API Key |

## 技术栈

### 后端

- **FastAPI** - 高性能 Python Web 框架
- **ChromaDB** - 向量数据库
- **Sentence Transformers** - 本地 Embedding 模型
- **多 LLM SDK** - OpenAI、Anthropic、Google 等

### 前端/插件

- **Manifest V3** - 现代浏览器插件标准
- **Side Panel API** - Chrome/Edge 侧边栏功能
- **原生 JavaScript** - 轻量无依赖
- **CSS 变量** - 支持主题切换

## 开发计划

- [x] 收藏夹 HTML 解析
- [x] ChromaDB 向量存储
- [x] RAG 检索增强生成
- [x] 多 LLM 适配器
- [x] FastAPI 后端
- [x] Edge 浏览器插件
- [x] 直接读取浏览器收藏夹
- [x] 自动/定时同步
- [x] AI 书签分类建议
- [x] AI 重复书签检测
- [x] 侧边栏模式 (v1.1)
- [x] 深色/浅色主题切换 (v1.1)
- [ ] 死链检测
- [ ] 书签标签自动生成
- [ ] 多语言支持

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 故障排除

### 常见问题

**Q: 后端启动时提示 "远程主机强迫关闭连接"**

A: 这是下载 Embedding 模型时的网络问题，请参考 `backend/TROUBLESHOOTING.md`

**Q: 插件无法连接后端**

A: 确保后端服务正在运行 (http://localhost:8000)，检查浏览器控制台是否有 CORS 错误

**Q: 侧边栏无法打开**

A: 确保使用的是支持 Side Panel API 的浏览器版本 (Edge 114+ / Chrome 114+)

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可证。

## 致谢

- [ChromaDB](https://www.trychroma.com/) - 向量数据库
- [FastAPI](https://fastapi.tiangolo.com/) - Web 框架
- [Sentence Transformers](https://www.sbert.net/) - Embedding 模型
- [Lucide Icons](https://lucide.dev/) - 图标库

---

<p align="center">
  <strong>Smart Favorites</strong> - 让收藏夹更智能 🔖✨
</p>
