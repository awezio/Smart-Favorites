# Smart Favorites Backend

Python 后端服务，基于 FastAPI 构建。

## 快速开始

```bash
# 1. 创建虚拟环境
python -m venv venv

# 2. 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
copy env.example .env
# 编辑 .env 配置 API 密钥

# 5. 启动服务
python run.py
```

## API 端点

- `GET /api/health` - 健康检查
- `POST /api/bookmarks/import` - 导入书签
- `POST /api/search` - 语义搜索
- `POST /api/chat` - AI 问答
- `GET /api/models` - 获取可用模型

详细文档访问: http://localhost:8000/docs

## 目录结构

```
backend/
├── app/
│   ├── api/          # API 路由
│   ├── config/       # 配置管理
│   ├── models/       # 数据模型
│   └── services/     # 核心服务
│       ├── bookmark_parser.py  # 书签解析
│       ├── vector_store.py     # 向量存储
│       ├── llm_adapter.py      # LLM 适配
│       └── rag_engine.py       # RAG 引擎
├── data/             # 数据目录 (ChromaDB)
├── requirements.txt
├── env.example
└── run.py
```
