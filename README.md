# Smart Favorites 智能收藏夹

基于 AI 的浏览器收藏夹智能管理系统，支持语义搜索和 RAG 问答。

## 功能特性

- **收藏夹导入**: 支持从 Edge/Chrome/Firefox 导出的 HTML 格式导入收藏夹
- **语义搜索**: 使用向量数据库进行智能语义检索，而不仅仅是关键词匹配
- **AI 问答**: 基于 RAG (检索增强生成) 技术，可以用自然语言询问收藏夹相关问题
- **多模型支持**: 适配多种 AI 大模型，包括 OpenAI、DeepSeek、Kimi、Qwen、Claude、Gemini、GLM、Ollama 等
- **浏览器插件**: 提供 Edge/Chrome 浏览器插件，方便快捷地使用

## 项目结构

```
Smart Favorites/
├── backend/                    # Python 后端服务
│   ├── app/
│   │   ├── api/               # FastAPI 路由
│   │   ├── config/            # 配置管理
│   │   ├── models/            # 数据模型
│   │   └── services/          # 核心服务
│   ├── requirements.txt       # Python 依赖
│   ├── env.example           # 环境变量示例
│   └── run.py                # 启动脚本
├── extension/                  # 浏览器插件
│   ├── manifest.json          # 插件配置
│   ├── popup/                 # 弹出窗口
│   ├── background/            # 后台服务
│   └── options/               # 设置页面
└── README.md
```

## 快速开始

### 1. 环境要求

- Python 3.11+
- Node.js 18+ (可选，用于插件开发)
- Edge/Chrome 浏览器

### 2. 安装后端

```bash
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
copy env.example .env  # Windows
# cp env.example .env  # Linux/Mac

# 编辑 .env 文件，配置 API 密钥
```

### 3. 配置 AI 模型

在 `.env` 文件中配置你想使用的 AI 模型 API 密钥：

```env
# 选择默认使用的模型提供商
DEFAULT_LLM_PROVIDER=deepseek

# DeepSeek (推荐国内用户使用)
DEEPSEEK_API_KEY=sk-your-api-key

# 或者其他模型
OPENAI_API_KEY=sk-your-api-key
KIMI_API_KEY=sk-your-api-key
# ...
```

### 4. 启动后端服务

```bash
cd backend
python run.py
```

服务将在 http://localhost:8000 启动，API 文档在 http://localhost:8000/docs

### 5. 安装浏览器插件

1. 打开 Edge 浏览器，访问 `edge://extensions/`
2. 开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择项目中的 `extension` 目录

## API 接口

### 健康检查
```
GET /api/health
```

### 导入收藏夹
```
POST /api/bookmarks/import
Content-Type: application/json

{
  "html_content": "<导出的书签 HTML>",
  "replace_existing": false
}
```

### 语义搜索
```
POST /api/search
Content-Type: application/json

{
  "query": "机器学习教程",
  "top_k": 10
}
```

### AI 问答
```
POST /api/chat
Content-Type: application/json

{
  "message": "我收藏了哪些关于 Python 的网站？",
  "include_sources": true
}
```

### 获取可用模型
```
GET /api/models
```

## 支持的 AI 模型

| 提供商 | 模型 | 说明 |
|--------|------|------|
| OpenAI | gpt-3.5-turbo, gpt-4 | 需要 API Key |
| DeepSeek | deepseek-chat | 国内可用，性价比高 |
| Kimi | moonshot-v1-8k | 月之暗面，支持长文本 |
| Qwen | qwen-turbo | 阿里通义千问 |
| Claude | claude-3-sonnet | Anthropic |
| Gemini | gemini-pro | Google |
| GLM | glm-4 | 智谱 AI |
| Ollama | llama2 等 | 本地部署，无需 API Key |

## 技术栈

### 后端
- **FastAPI**: 高性能 Python Web 框架
- **ChromaDB**: 向量数据库，存储书签 Embedding
- **Sentence Transformers**: 本地 Embedding 模型
- **多 LLM SDK**: OpenAI、Anthropic、Google 等

### 前端/插件
- **Manifest V3**: 现代浏览器插件标准
- **原生 JavaScript**: 轻量无依赖

## 开发计划

- [x] 收藏夹 HTML 解析
- [x] ChromaDB 向量存储
- [x] RAG 检索增强生成
- [x] 多 LLM 适配器
- [x] FastAPI 后端
- [x] Edge 浏览器插件
- [ ] 自动同步收藏夹变更
- [ ] 书签分类建议
- [ ] 重复书签检测
- [ ] 死链检测

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 Apache License 2.0 开源许可证。详见 [LICENSE](LICENSE) 文件。

## 致谢

- [ChromaDB](https://www.trychroma.com/) - 向量数据库
- [FastAPI](https://fastapi.tiangolo.com/) - Web 框架
- [Sentence Transformers](https://www.sbert.net/) - Embedding 模型

---

**Smart Favorites** - 让收藏夹更智能 🔖✨
