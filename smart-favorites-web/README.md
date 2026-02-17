# Smart Favorites Web

基于 AI 的智能书签和 GitHub Stars 管理系统 - 云端版本

## ✨ 功能特性

### 核心功能

- 🔍 **智能语义搜索** - 使用向量嵌入进行语义搜索
- 💬 **AI 问答** - 基于 RAG 的智能问答系统
- 📚 **书签管理** - 导入、同步、查新浏览器书签
- ⭐ **GitHub Stars** - 自动同步和管理 GitHub 标星项目
- 🤖 **AI 描述生成** - 自动为书签生成智能描述
- 🔄 **增量同步** - 智能 diff 检测，只更新变更内容

### 技术特性

- ⚡ **Next.js 15** - 最新的 React 框架
- 🎨 **Tailwind CSS + shadcn/ui** - 现代化 UI 组件
- 🗄️ **Supabase** - PostgreSQL + pgvector 向量存储
- 🧠 **多 LLM 支持** - OpenAI, DeepSeek, Kimi, Qwen, Claude, Gemini, GLM, Ollama
- 🚀 **Vercel 部署** - 一键部署到云端
- 🔐 **类型安全** - 完整的 TypeScript 支持

## 🚀 快速开始

### 前提条件

- Node.js 18+
- Supabase 账号
- 至少一个 AI Provider 的 API Key
- Vercel 账号（可选，用于部署）

### 本地开发

1. **克隆项目**

```bash
cd smart-favorites-web
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填入 Supabase 和 AI Provider 配置
```

4. **设置 Supabase 数据库**

- 访问 https://supabase.com 创建项目
- 运行 `supabase/migrations/` 中的 SQL 脚本
- 获取 API 密钥并填入 `.env.local`

5. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:3000

### 部署到 Vercel

1. **使用 Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel --prod
```

2. **或通过 GitHub**

- 将代码推送到 GitHub
- 在 Vercel Dashboard 中导入项目
- 配置环境变量
- 部署

详见 [DEPLOYMENT.md](DEPLOYMENT.md)

## 📁 项目结构

```
smart-favorites-web/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # 仪表板页面
│   │   ├── page.tsx       # 搜索页
│   │   ├── chat/          # AI 问答
│   │   ├── bookmarks/     # 书签管理
│   │   ├── stars/         # GitHub Stars
│   │   └── settings/      # 设置
│   ├── api/               # API 路由
│   │   ├── bookmarks/     # 书签 API
│   │   ├── stars/         # Stars API
│   │   ├── search/        # 搜索 API
│   │   ├── chat/          # 聊天 API
│   │   └── ai/            # AI 服务
│   └── layout.tsx         # 根布局
├── components/            # UI 组件
│   └── ui/                # shadcn/ui 组件
├── lib/                   # 核心逻辑
│   ├── ai/                # AI 服务
│   ├── db/                # 数据库操作
│   ├── llm/               # LLM 适配器
│   ├── parsers/           # 数据解析器
│   ├── rag/               # RAG 引擎
│   ├── supabase/          # Supabase 客户端
│   └── utils/             # 工具函数
├── types/                 # TypeScript 类型
├── supabase/              # Supabase 配置
│   ├── migrations/        # 数据库迁移
│   └── README.md          # Supabase 设置指南
└── public/                # 静态资源
```

## 🔌 API 文档

### 搜索 API

**POST /api/search**

```json
{
  "query": "搜索内容",
  "type": "all|bookmarks|stars",
  "topK": 10,
  "threshold": 0.3
}
```

### 书签 API

- `GET /api/bookmarks` - 获取书签列表
- `POST /api/bookmarks` - 创建书签
- `PUT /api/bookmarks` - 更新书签
- `DELETE /api/bookmarks` - 删除书签
- `POST /api/bookmarks/sync` - 同步书签
- `POST /api/bookmarks/diff` - 查新

### GitHub Stars API

- `GET /api/stars` - 获取 Stars 列表
- `POST /api/stars` - 创建 Star
- `PUT /api/stars` - 更新 Star
- `DELETE /api/stars` - 删除 Star
- `POST /api/stars/sync` - 同步 Stars

### AI API

- `POST /api/chat` - AI 问答
- `POST /api/ai/describe` - 生成描述
- `GET /api/settings` - 获取配置

## 🔧 配置

### 环境变量

所有环境变量在 `.env.local.example` 中有详细说明。

**必需配置：**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 公开密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务密钥
- 至少一个 AI Provider 的 API Key

**可选配置：**

- `GITHUB_TOKEN` - GitHub 个人访问令牌
- `DEFAULT_LLM_PROVIDER` - 默认 LLM 提供商
- `EMBEDDING_MODEL` - 嵌入模型

### LLM Provider 配置

支持以下 LLM 提供商：

- **OpenAI** - `OPENAI_API_KEY`
- **DeepSeek** - `DEEPSEEK_API_KEY` (推荐，性价比高)
- **Kimi** - `KIMI_API_KEY`
- **Qwen** - `QWEN_API_KEY`
- **Claude** - `CLAUDE_API_KEY`
- **Gemini** - `GEMINI_API_KEY`
- **GLM** - `GLM_API_KEY`
- **Ollama** - `OLLAMA_BASE_URL` (本地部署)

## 📚 文档

- [START_HERE.md](START_HERE.md) - 新手入门
- [QUICK_START.md](QUICK_START.md) - 5 分钟快速部署
- [DEPLOYMENT.md](DEPLOYMENT.md) - 详细部署指南
- [CHECKLIST.md](CHECKLIST.md) - 部署检查清单
- [FEATURES.md](FEATURES.md) - 功能详解
- [supabase/README.md](supabase/README.md) - 数据库设置

## 🔒 安全性

- 使用环境变量存储敏感信息
- Supabase Row Level Security (RLS)
- API 密钥服务器端验证
- HTTPS 加密传输

## 🤝 贡献

欢迎贡献！请随时提交 Issue 或 Pull Request。

## 📝 许可证

MIT License

## 🆘 需要帮助？

- 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 的故障排除章节
- 检查 Vercel 和 Supabase 日志
- 查看浏览器控制台错误

---

**开始使用：**

1. 📖 阅读 [START_HERE.md](START_HERE.md)
2. ⚡ 按照 [QUICK_START.md](QUICK_START.md) 部署
3. ✅ 使用 [CHECKLIST.md](CHECKLIST.md) 验证

**祝您使用愉快！** 🎉
