# Smart Favorites - LLM Wiki 平台建设计划

**最后更新**: 2026-05-08  
**项目版本**: v2.1 开发中  
**定位**: 个人知识库 + 学习研究工具 + AI 应用平台

---

## 🎯 项目愿景

将 Smart Favorites 发展为**个人知识库 + AI 工具调用平台**：

```
当前状态 (v2.0)          目标状态 (v3.0)
├─ 书签管理      ─────→  ├─ 统一知识库
├─ GitHub Stars         ├─ 多格式文档
├─ RAG 问答              ├─ 插件生态系统
└─ 多 LLM 支持          ├─ AI 工具调用 API
                         └─ 学术/研究助手
```

---

## 📋 需求分析

### 用户需求

| 需求 | 现状 | 目标 | 优先级 |
|------|------|------|--------|
| 多格式文件支持 | ❌ | PDF、Office、Markdown、网页 | 🔴 高 |
| 统一知识库问答 | ⚠️ 部分 | 文档+书签+Stars 聚合检索 | 🔴 高 |
| 自定义插件 | ❌ | NPM 包框架 | 🟡 中 |
| AI 工具调用 | ❌ | Function Calling 标准 | 🟡 中 |
| 研究助手功能 | ❌ | 论文总结、文献引用、知识图谱 | 🟢 低 |

### 技术需求

| 需求 | 选型 | 说明 |
|------|------|------|
| 部署架构 | Serverless | Vercel + Supabase 无运维 |
| 文件解析 | 多库 | PDF/pdfjs, Office/mammoth, 文本/原生 |
| 向量数据库 | pgvector | Supabase 内置，无额外部署 |
| 插件系统 | npm | 用户可发布独立包 |
| AI 集成 | Function Calling | OpenAI、Claude、DeepSeek 等标准 |

### 非功能需求

- **可靠性**: 文件上传失败自动重试
- **性能**: 向量搜索 < 500ms, RAG 问答 < 5s
- **可扩展性**: 支持 10+ 插件并发加载
- **安全性**: API Key 加密存储，工具权限控制

---

## 📚 Phase 0 核心文档库

**以下文档已完成，可作为后续开发参考和复用**：

### 1. 🏗️ 架构与设计
- **KARPATHY_RESEARCH.md** - Karpathy LLM-wiki 设计思想研究
  - LLM-wiki 核心概念和三支柱 (可发现性、可检索性、可共享性)
  - 系统架构分层设计参考
  - AI 技术应用 (自动标签、摘要、关联推荐)
  - **用途**: 知识库功能设计参考

- **DATABASE_SCHEMA_DESIGN.md** - 数据库 Schema 完整设计
  - documents 表设计 (包含所有必要字段)
  - document_chunks 表设计 (向量存储)
  - 向量搜索存储过程实现
  - RLS 安全策略
  - **用途**: Phase 1 直接创建迁移脚本

### 2. 🔧 技术选型
- **FILE_PARSING_RESEARCH.md** - 文件解析库调研
  - PDF: pdfjs-dist (推荐)
  - DOCX: mammoth (推荐)
  - XLSX: xlsx (推荐)
  - HTML: cheerio (推荐)
  - 详细的库对比、性能基准、集成代码示例
  - **用途**: Phase 1 文件解析器实现参考

- **TECH_DECISIONS.md** - 技术选型与架构决策
  - Serverless 部署架构权衡
  - PostgreSQL + pgvector 数据库选型
  - 本地向量化 vs API 向量化对比
  - 混合搜索 + RRF 算法设计
  - 插件系统选型 (NPM + 动态加载)
  - LLM 多提供商适配策略
  - **用途**: 理解设计决策的背景，便于未来评审和调整

### 3. 🔌 插件系统规范
- **PLUGIN_SPEC.md** - Smart Favorites 插件规范 v1.0
  - SmartFavoritesPlugin 接口定义
  - PluginAPI 完整 API 参考
  - 工具定义和钩子系统
  - 权限和安全模型
  - 4 个完整的示例插件代码
  - 发布流程和审核清单
  - **用途**: Phase 3 插件系统实现指南

### 4. 📋 开发计划
- **BUILD.md** - 完整的项目开发计划
  - 5 个开发阶段详细规划 (Phase 1-5)
  - 每个阶段的子任务、API 设计、完成标志
  - 实时进度追踪
  - 决策点和风险分析
  - **用途**: 项目总指挥，定期更新进度

---

## 🗓️ 完整开发路线图

### Phase 0：规划与研究（🟢 待开始）

**时间**: 3-5 天  
**目标**: 明确架构和技术选型

#### 任务清单
- [ ] 研究 Karpathy LLM-wiki 设计思想
  - [ ] 阅读相关论文或博客
  - [ ] 分析文件管理策略
  - [ ] 学习向量化流程
  - [ ] 研究协作机制

- [ ] 调研文件解析库
  - [ ] PDF: `pdfjs-dist` vs `pdfparse` 对比
  - [ ] Office: `mammoth` (DOCX) vs `python-docx`
  - [ ] Excel: `xlsx` 库测试
  - [ ] HTML: `cheerio` 集成

- [ ] 设计系统架构
  - [ ] 数据库 Schema 设计（`008_create_documents_table.sql`）
  - [ ] 异步处理管道设计
  - [ ] 插件加载机制
  - [ ] API 接口规范

#### 交付物
- `docs/ARCHITECTURE.md` - 系统架构详设
- `docs/TECH_CHOICES.md` - 技术选型说明
- `docs/PLUGIN_SPEC.md` - 插件规范 v1.0
- `docs/API_DESIGN.md` - API 接口设计

#### 完成标志
- ✅ 架构评审通过
- ✅ 技术选型确认
- ✅ 数据库设计定稿

---

### Phase 1：文件系统基础（🟡 待开始）

**时间**: 2-3 周  
**工作量**: 40-60 人时  
**目标**: 支持多格式文件上传、解析、向量化

#### 1.1 数据库扩展 (3-4 天)

**迁移脚本**:
```
smart-favorites-web/supabase/migrations/
├── 008_create_documents_table.sql
│   ├── documents 表（文件元数据）
│   ├── document_chunks 表（文本分块）
│   └── 向量索引配置
│
└── 009_create_document_indexes.sql
    ├── pgvector IVFFlat 索引
    ├── 内容哈希唯一性约束
    └── 用户隔离策略
```

**关键表设计**:
```sql
-- documents 表
- id, user_id, name, file_type, status
- total_chunks, embedded_chunks, processing_error
- uploaded_at, processed_at

-- document_chunks 表  
- id, document_id, user_id, content, embedding
- chunk_index, page_number, section_title
- content_hash (去重), created_at

-- 索引优化
- documents(user_id, status) - 查询待处理文件
- document_chunks(user_id) + embedding vector_cosine_ops
```

**完成标志**:
- ✅ 迁移脚本测试通过
- ✅ RLS 策略验证正确
- ✅ 索引性能达到预期

---

#### 1.2 文件上传 API (3-4 天)

**新增路由**:
```
POST   /api/documents/upload
       ├─ 接收 FormData (file + metadata)
       ├─ 验证文件大小 (限 100MB)
       ├─ 检查文件类型白名单
       └─ 返回 { document_id, status: 'pending' }

GET    /api/documents
       ├─ 列出用户文档（带分页）
       ├─ 支持筛选（file_type, status, tag）
       └─ 返回 Document[]

GET    /api/documents/[id]
       └─ 获取文档详情 + 处理进度

DELETE /api/documents/[id]
       └─ 删除文档（级联删除 chunks）

PATCH  /api/documents/[id]
       ├─ 更新元数据（标题、标签、描述）
       └─ 返回更新后的文档
```

**实现位置**:
```
smart-favorites-web/app/api/documents/
├── route.ts (GET POST)
├── [id]/route.ts (GET PATCH DELETE)
├── [id]/summarize.ts (POST - Phase 2)
└── middleware/validation.ts
```

**完成标志**:
- ✅ 文件上传 API 测试通过
- ✅ Supabase Storage 集成验证
- ✅ 错误处理完善

---

#### 1.3 多格式文件解析 (5-7 天)

**核心模块**:
```
smart-favorites-web/lib/file-parsers/
├── index.ts                    # 统一入口
├── types.ts                    # 类型定义
├── pdf-parser.ts               # PDF 解析 (pdfjs-dist)
├── office-parser.ts            # Office 解析 (mammoth, xlsx)
├── text-parser.ts              # 文本/Markdown 解析
├── html-parser.ts              # HTML 快照解析
├── chunk-splitter.ts           # 文本分块与重叠
└── __tests__/                  # 单元测试
```

**API 设计**:
```typescript
interface ParsedDocument {
  title: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: {
    pageCount?: number;
    wordCount: number;
    language?: string;
  };
}

export async function parseDocument(
  file: File,
  fileType: string
): Promise<ParsedDocument>

function splitIntoChunks(
  text: string,
  chunkSize: number = 800,
  overlap: number = 200
): DocumentChunk[]
```

**支持的格式**:

| 格式 | 库 | 支持 | 复杂度 |
|------|-----|------|--------|
| PDF | pdfjs-dist | ✅ | 中 |
| DOCX | mammoth | ✅ | 中 |
| XLSX | xlsx | ✅ | 低 |
| TXT | 原生 | ✅ | 低 |
| MD | 原生 | ✅ | 低 |
| HTML | cheerio | ✅ | 低 |
| PPTX | pptx-parser | ⏳ | 中 |

**完成标志**:
- ✅ 所有格式解析器单元测试通过
- ✅ 分块算法验证（无丢失、无重复）
- ✅ 测试覆盖率 > 80%

---

#### 1.4 异步处理管道 (4-5 天)

**Vercel Cron Job**:
```
smart-favorites-web/app/api/cron/
└── process-documents.ts

// GET /api/cron/process-documents
// 执行周期: 每分钟
// 处理逻辑:
//   1. 查询 status='pending' 文档 (limit 5)
//   2. 下载文件到内存
//   3. 调用解析器获取 chunks
//   4. 对每个 chunk 生成 embedding (batch: 100)
//   5. 批量插入 document_chunks 表
//   6. 更新 documents.status='completed'
//   7. 错误时更新 processing_error
```

**处理流程**:
```
pending 文档
    ↓
下载文件 (Supabase Storage)
    ↓
调用解析器 (file-parsers)
    ↓
文本分块 (chunk-splitter)
    ↓
生成 embedding (Xenova/transformers)
    ↓ (批处理: 100个/次)
存储 chunks (Supabase PostgreSQL)
    ↓
更新 documents.status='completed'
    ✅ 处理完成
```

**错误处理**:
- 文件损坏 → status='failed', 记录错误
- 网络中断 → 保持 'pending'，下次重试
- 向量化失败 → 重试 3 次后标记失败

**完成标志**:
- ✅ Cron Job 可靠运行
- ✅ 无丢失块（验证总数）
- ✅ 错误恢复机制有效

---

#### 1.5 文件管理 UI (3-4 天)

**新建组件**:
```
smart-favorites-web/components/
├── document-upload.tsx         # 拖拽上传
├── document-list.tsx           # 文档列表
├── document-card.tsx           # 文档卡片
├── upload-progress.tsx         # 上传进度条
└── file-type-badge.tsx         # 文件类型标签
```

**功能特性**:
- 拖拽上传支持
- 进度条显示处理状态
- 支持的文件类型提示
- 错误提示和重试按钮
- 文档删除确认

**完成标志**:
- ✅ 上传功能完整
- ✅ 进度显示准确
- ✅ 错误处理友好

---

#### Phase 1 完成条件
- ✅ 所有格式文件可成功上传并解析
- ✅ 处理管道 24h 无故障运行
- ✅ 向量化完成率 > 99%
- ✅ UI 测试通过，用户反馈正面

---

### Phase 2：RAG 系统增强（🟡 待开始）

**时间**: 2-3 周  
**工作量**: 30-40 人时  
**目标**: 统一知识库搜索、改进 RAG 质量

#### 2.1 统一搜索层 (4-5 天)

**新建模块**:
```
smart-favorites-web/lib/unified-search/
├── index.ts                    # 统一搜索入口
├── types.ts                    # 搜索结果类型
├── hybrid-search.ts            # 混合搜索 (RRF)
└── result-ranking.ts           # 结果融合排序
```

**搜索策略**:

1. **向量搜索** (语义相似度)
   - 生成查询 embedding
   - 查询三个表: bookmarks, stars, document_chunks
   - 使用 pgvector 余弦相似度
   - 各表独立搜索

2. **关键词搜索** (精确匹配)
   - ILIKE 模糊匹配
   - 权重排序: 标题 > URL > 内容 > 标签
   - 用于无向量结果或增强相关性

3. **融合排序** (RRF - Reciprocal Rank Fusion)
   ```
   score = α * (1 / (k + vector_rank)) 
         + β * (1 / (k + keyword_rank))
   
   推荐: α=0.7, β=0.3 (向量优先)
   ```

**API 设计**:
```typescript
interface UnifiedSearchResult {
  type: 'bookmark' | 'star' | 'chunk';
  id: string;
  title: string;
  url?: string;
  content: string;
  source: {
    type: string;
    name: string;
    documentId?: string;
  };
  similarity: number;
  metadata: Record<string, any>;
}

export async function searchUnified(
  query: string,
  options: {
    types?: ('bookmark' | 'star' | 'document')[];
    topK?: number;
    threshold?: number;
    includeMetadata?: boolean;
  }
): Promise<UnifiedSearchResult[]>
```

**完成标志**:
- ✅ 三类型搜索结果都返回正确
- ✅ 相关性评分合理
- ✅ 查询性能 < 500ms

---

#### 2.2 改进 RAG 提示词 (2-3 天)

**新建**:
```
smart-favorites-web/lib/rag/
├── system-prompt.ts            # 系统提示词构建
├── context-builder.ts          # 上下文组装
└── source-formatter.ts         # 来源格式化
```

**提示词改进**:

```typescript
function buildKnowledgeBasePrompt(sources: UnifiedSearchResult[]): string {
  // 格式化不同类型的来源
  const bookmarkSources = formatBookmarkSources(sources);
  const starSources = formatStarSources(sources);
  const documentSources = formatDocumentSources(sources);
  
  return `你是一个个人知识库助手。
  
根据以下资料回答用户问题：

【书签】(${bookmarkSources.length} 项)
${bookmarkSources}

【GitHub 项目】(${starSources.length} 项)
${starSources}

【文档】(${documentSources.length} 项)
${documentSources}

请基于上述资料进行回答，并在答案中标注来源。`;
}
```

**完成标志**:
- ✅ 提示词清晰易懂
- ✅ LLM 生成的引用准确
- ✅ 上下文长度优化 (< 4k tokens)

---

#### 2.3 新增 RAG API (3-4 天)

**路由**:
```
POST /api/knowledge/query
POST /api/knowledge/chat
GET  /api/knowledge/stats
```

**`/api/knowledge/query` 请求**:
```json
{
  "query": "什么是向量数据库？",
  "types": ["bookmark", "document", "star"],
  "topK": 15,
  "threshold": 0.3,
  "include_metadata": true,
  "model": "gpt-4o-mini",
  "provider": "openai"
}
```

**`/api/knowledge/query` 响应**:
```json
{
  "query": "什么是向量数据库？",
  "answer": "基于你的知识库，向量数据库是...",
  "sources": [
    {
      "type": "document",
      "title": "Vector DB Paper",
      "chunk": "向量数据库是...",
      "similarity": 0.92,
      "document_id": "doc-uuid"
    },
    {
      "type": "bookmark",
      "title": "Chroma Docs",
      "url": "https://...",
      "similarity": 0.87
    }
  ],
  "metadata": {
    "query_time_ms": 450,
    "chunk_count": 3,
    "model": "gpt-4o-mini",
    "provider": "openai"
  }
}
```

**完成标志**:
- ✅ API 返回完整准确
- ✅ 响应时间 < 5s (不含 LLM)
- ✅ 错误处理完善

---

#### 2.4 改进检索策略 (3-4 天)

**实现**:
```
smart-favorites-web/lib/rag/
├── hybrid-search.ts            # RRF 融合
├── semantic-reranker.ts        # 语义重排序 (可选)
└── context-optimization.ts     # 上下文优化
```

**优化策略**:
1. **RRF 融合** - 并行查询，融合排序
2. **语义重排序** - 对前 50 个结果重新排序
3. **上下文优化** - 只保留高相关性的 chunks
4. **去重** - 相同内容去重

**完成标志**:
- ✅ 检索相关性提升 30%+
- ✅ 无重复结果
- ✅ 性能无下降

---

#### Phase 2 完成条件
- ✅ 统一搜索覆盖三类型资源
- ✅ RAG 问答准确率 > 90%
- ✅ 用户反馈"找到的资料相关"比例 > 80%
- ✅ 文档内容被成功利用 > 60%

---

### Phase 3：插件生态系统（🟡 待开始）

**时间**: 2-3 周  
**工作量**: 50-70 人时  
**目标**: 完整的插件框架和示例生态

#### 3.1 插件规范设计 (2-3 天)

**创建**:
```
docs/
├── PLUGIN_SPEC.md              # 插件规范 v1.0
├── PLUGIN_DEVELOPMENT.md       # 开发教程
└── PLUGIN_EXAMPLES.md          # 示例合集

packages/
└── @smart-favorites/
    ├── types/                  # 类型定义
    ├── core/                   # 核心库
    └── plugin-template/        # 模板项目
```

**插件接口设计**:
```typescript
// @smart-favorites/types/index.ts

export interface SmartFavoritesPlugin {
  // 必需字段
  name: string;                 // 包名
  version: string;              // 版本
  apiVersion: string;           // 兼容的 API 版本
  
  // 可选字段
  description?: string;
  author?: string;
  license?: string;
  permissions?: PluginPermission[];
  
  // 生命周期钩子
  onLoad?(api: PluginAPI): Promise<void>;
  onUnload?(api: PluginAPI): Promise<void>;
  onError?(error: Error): Promise<void>;
  
  // 工具定义
  tools?: PluginTool[];
  
  // 事件钩子
  hooks?: {
    'search:before'?: SearchHook;
    'search:after'?: SearchHook;
    'chat:before'?: ChatHook;
    'chat:after'?: ChatHook;
    'document:uploaded'?: DocumentHook;
    'document:processing'?: DocumentHook;
  };
}

export interface PluginAPI {
  // 知识库访问
  searchKnowledge(query: string): Promise<SearchResult[]>;
  queryKnowledge(query: string, topK?: number): Promise<SearchResult[]>;
  
  // 文档操作
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document>;
  uploadDocument(file: File, metadata?: Record<string, any>): Promise<string>;
  updateDocument(id: string, updates: Record<string, any>): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  
  // 书签操作
  getBookmarks(): Promise<Bookmark[]>;
  createBookmark(data: BookmarkInput): Promise<Bookmark>;
  
  // 设置管理
  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any): Promise<void>;
  
  // 工具注册
  registerTool(tool: PluginTool): void;
  
  // 通知
  notify(message: string, type: 'info' | 'success' | 'error' | 'warning'): void;
  
  // 存储
  getStorage(key: string): Promise<any>;
  setStorage(key: string, value: any): Promise<void>;
  
  // 日志
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void;
}

export interface PluginTool {
  name: string;
  description: string;
  category?: string;           // 'knowledge' | 'document' | 'bookmark' | 'util'
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  execute(input: Record<string, any>): Promise<any>;
}

export type PluginPermission = 
  | 'knowledge:read'
  | 'knowledge:write'
  | 'documents:read'
  | 'documents:write'
  | 'bookmarks:read'
  | 'bookmarks:write'
  | 'settings:read'
  | 'settings:write'
  | 'notifications:write'
  | 'storage:read'
  | 'storage:write';
```

**完成标志**:
- ✅ 规范文档完整清晰
- ✅ API 设计合理可扩展
- ✅ 示例代码可运行

---

#### 3.2 插件加载系统 (4-5 天)

**创建**:
```
smart-favorites-web/lib/plugins/
├── plugin-manager.ts           # 插件管理器
├── plugin-loader.ts            # 动态加载
├── plugin-validator.ts         # 验证器
├── plugin-storage.ts           # 存储管理
└── types.ts                    # 类型定义
```

**核心实现**:
```typescript
export class PluginManager {
  private plugins: Map<string, SmartFavoritesPlugin> = new Map();
  private tools: Map<string, PluginTool[]> = new Map();
  private hooks: Map<string, HookHandler[]> = new Map();
  
  // 加载插件
  async loadPlugin(packageName: string): Promise<void> {
    // 1. 从 npm 获取包 / 从用户存储获取
    // 2. 动态 import
    // 3. 验证 API 兼容性
    // 4. 检查权限
    // 5. 调用 onLoad 钩子
    // 6. 注册工具和钩子
  }
  
  // 卸载插件
  async unloadPlugin(packageName: string): Promise<void> {
    // 1. 调用 onUnload 钩子
    // 2. 清理资源
    // 3. 移除工具和钩子
  }
  
  // 获取所有工具
  getAllTools(): Map<string, PluginTool[]> { }
  
  // 执行钩子
  async executeHook(hookName: string, context: any): Promise<void> {
    // 按优先级顺序执行
  }
}
```

**加载策略**:

1. **本地开发** - 从 `file://` 或 `http://localhost`
2. **NPM 包** - 从 unpkg.com 或 npm cdn
3. **用户上传** - 从 Supabase Storage
4. **官方市场** - 从插件市场 API

**完成标志**:
- ✅ 插件加载正常工作
- ✅ 权限检查有效
- ✅ 错误恢复机制完善

---

#### 3.3 插件市场 (3-4 天)

**新建页面**:
```
smart-favorites-web/app/plugins/
├── page.tsx                    # 插件市场列表
├── [name]/page.tsx             # 插件详情页
├── [name]/install/route.ts     # 安装端点
└── my-plugins/page.tsx         # 已安装插件
```

**数据模型**:
```sql
CREATE TABLE plugins_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  author TEXT,
  author_url TEXT,
  npm_package TEXT,
  repository TEXT,
  documentation_url TEXT,
  license TEXT,
  tags TEXT[],
  downloads BIGINT DEFAULT 0,
  stars BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_installed_plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plugin_name TEXT NOT NULL,
  installed_version TEXT,
  installed_at TIMESTAMP DEFAULT NOW(),
  enabled BOOLEAN DEFAULT true,
  settings JSONB,
  UNIQUE(user_id, plugin_name)
);
```

**功能**:
- 插件列表（搜索、筛选、排序）
- 插件详情页（说明、截图、评分）
- 一键安装/卸载
- 已安装插件管理
- 插件配置界面

**完成标志**:
- ✅ 插件市场页面正常运行
- ✅ 安装卸载功能完整
- ✅ 管理界面友好

---

#### 3.4 示例插件开发 (5-7 天)

**示例 1：论文摘要插件**
```
@smart-favorites/plugin-paper-summarizer

功能：
- 上传 PDF 论文
- 自动提取摘要、摘要、关键词
- 生成引用格式 (BibTeX, APA, MLA)
- 添加个人笔记和标注

权限: documents:read, knowledge:write
```

**示例 2：网页快照插件**
```
@smart-favorites/plugin-web-snapshot

功能：
- 截存网页为 HTML
- 自动提取正文
- 支持全文搜索
- 离线阅读

权限: documents:write, knowledge:write
```

**示例 3：学习笔记同步插件**
```
@smart-favorites/plugin-notes-sync

功能：
- 从 Notion/Obsidian 同步笔记
- 自动向量化
- 与知识库统一搜索

权限: documents:write, notifications:write
```

**示例 4：AI 研究助手插件**
```
@smart-favorites/plugin-research-assistant

功能：
- 基于知识库生成论文大纲
- 自动查找相关文献
- 生成引用和参考文献列表

权限: knowledge:read, notifications:write
```

**示例 5：知识图谱插件**
```
@smart-favorites/plugin-knowledge-graph

功能：
- 自动提取概念和关系
- 可视化知识图谱
- 探索相关知识

权限: knowledge:read
```

**完成标志**:
- ✅ 5 个示例插件可运行
- ✅ 代码规范一致
- ✅ 文档完整

---

#### Phase 3 完成条件
- ✅ 插件框架稳定无重大 bug
- ✅ 3+ 示例插件可正常工作
- ✅ 文档齐备（规范、教程、API 文档）
- ✅ 社区反馈积极

---

### Phase 4：AI 工具调用接口（🟡 待开始）

**时间**: 1-2 周  
**工作量**: 20-30 人时  
**目标**: 标准化工具接口，支持第三方 AI 应用调用

#### 4.1 工具接口设计 (2-3 天)

**新建路由**:
```
smart-favorites-web/app/api/tools/
├── route.ts                    # GET /api/tools (列表)
├── [tool]/route.ts             # POST /api/tools/{tool}/execute
└── middleware/auth.ts          # 工具认证中间件
```

**工具列表端点**:
```
GET /api/tools

响应:
{
  "tools": [
    {
      "name": "search_knowledge",
      "description": "搜索个人知识库",
      "category": "search",
      "input_schema": {...},
      "output_schema": {...},
      "permissions": ["knowledge:read"]
    },
    ...
  ]
}
```

**工具执行端点**:
```
POST /api/tools/{tool_name}/execute
Authorization: Bearer {api_key}

请求:
{
  "input": {
    "query": "什么是深度学习？",
    "top_k": 10
  }
}

响应:
{
  "output": {...},
  "metadata": {
    "execution_time_ms": 450,
    "model_used": "gpt-4o-mini"
  }
}
```

**核心工具集**:

| 工具 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `search_knowledge` | 搜索知识库 | query, top_k | SearchResult[] |
| `get_document` | 获取文档内容 | document_id | content |
| `create_bookmark` | 创建书签 | url, title, tags | bookmark |
| `list_documents` | 列表文档 | filter | Document[] |
| `query_semantic` | 语义查询 | query, scope | SearchResult[] |
| `get_statistics` | 统计信息 | - | stats |
| `add_annotation` | 添加标注 | doc_id, text, note | annotation |

**完成标志**:
- ✅ 工具列表 API 正常
- ✅ 所有工具可执行
- ✅ 输入验证正确

---

#### 4.2 OpenAI Function Calling 集成 (2-3 天)

**创建**:
```
smart-favorites-web/lib/tools/
├── openai-functions.ts         # OpenAI 函数定义
├── claude-tools.ts             # Claude tool_use 定义
├── deepseek-functions.ts       # DeepSeek 函数定义
└── generic-schema.ts           # 通用 schema
```

**实现**:
```typescript
// lib/tools/openai-functions.ts
export function getOpenAIFunctions(): ChatCompletionCreateParams['functions'] {
  return [
    {
      name: 'search_knowledge',
      description: '在个人知识库中搜索相关信息',
      parameters: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: '搜索查询词' 
          },
          top_k: { 
            type: 'number', 
            description: '返回结果数（1-20）',
            default: 10
          },
          types: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['bookmark', 'document', 'star']
            },
            description: '搜索资源类型'
          }
        },
        required: ['query']
      }
    },
    // 其他工具...
  ];
}

// 使用示例
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  functions: getOpenAIFunctions(),
  function_call: 'auto'
});

// 处理函数调用
if (response.choices[0].message.function_call) {
  const toolName = response.choices[0].message.function_call.name;
  const toolInput = JSON.parse(response.choices[0].message.function_call.arguments);
  const result = await executeTool(toolName, toolInput);
  // 返回结果给 LLM...
}
```

**完成标志**:
- ✅ OpenAI integration 测试通过
- ✅ Claude tools 集成测试通过
- ✅ DeepSeek functions 集成测试通过

---

#### 4.3 API 密钥与权限管理 (2-3 天)

**实现**:
```
smart-favorites-web/app/api/
├── keys/
│   ├── route.ts                # GET, POST (创建、列表)
│   └── [id]/route.ts           # PATCH, DELETE (管理)
└── audit-logs/route.ts         # 审计日志

数据库表:
├── api_keys (用户的 API Key)
├── api_key_permissions (权限绑定)
├── api_usage_logs (使用日志)
└── api_audit_logs (审计日志)
```

**功能**:
- 创建/管理 API Keys
- 为每个 Key 配置权限
- 设置使用配额
- 查看使用日志
- 审计跟踪

**完成标志**:
- ✅ API Key 管理界面完整
- ✅ 权限控制有效
- ✅ 使用日志准确记录

---

#### 4.4 第三方应用集成示例 (3-4 天)

**示例 1：LangChain 集成**
```python
from langchain.tools import Tool
from smart_favorites import SmartFavoritesTools

# 创建 LangChain 工具
sf_tools = SmartFavoritesTools(api_key='sk_...')
tools = sf_tools.get_langchain_tools()

agent = initialize_agent(
  tools,
  llm,
  agent="zero-shot-react-description"
)

result = agent.run("我的知识库中关于机器学习的资源有哪些？")
```

**示例 2：Claude with Tool Use**
```python
from anthropic import Anthropic

client = Anthropic()

tools = [
  {
    "name": "search_knowledge",
    "description": "搜索个人知识库",
    "input_schema": {...}
  }
]

response = client.messages.create(
  model="claude-3-5-sonnet-20241022",
  max_tokens=1024,
  tools=tools,
  messages=[...]
)
```

**示例 3：ChatGPT 插件**
```json
{
  "schema_version": "v1",
  "name_for_human": "Smart Favorites",
  "name_for_model": "smart_favorites_plugin",
  "description_for_human": "访问个人知识库",
  "description_for_model": "插件用于访问用户的个人知识库...",
  "auth": {
    "type": "oauth",
    "client_url": "https://..."
  },
  "api": {
    "type": "openapi",
    "url": "https://your-domain.com/.well-known/openapi.json"
  }
}
```

**完成标志**:
- ✅ 3+ 框架集成示例可运行
- ✅ 文档清晰
- ✅ 用户反馈正面

---

#### Phase 4 完成条件
- ✅ 工具接口稳定
- ✅ 支持 3+ LLM 框架
- ✅ 权限控制有效
- ✅ API 文档完整

---

### Phase 5：优化、文档、发布（🟡 待开始）

**时间**: 1-2 周  
**工作量**: 20-30 人时  
**目标**: 生产就绪、完整文档、社区启动

#### 5.1 性能优化 (3-4 天)

**优化项**:

| 项目 | 目标 | 方法 |
|------|------|------|
| 向量搜索 | < 300ms | pgvector 索引调优 |
| 文件解析 | 5MB/s | Web Worker 并行化 |
| RAG 问答 | < 5s | 缓存、流式响应 |
| 插件加载 | < 500ms | 代码分割、预加载 |
| 工具调用 | < 200ms | 缓存、批处理 |

**具体措施**:
- [ ] 数据库查询优化（执行计划分析）
- [ ] 文件解析 Worker 实现
- [ ] Redis 缓存层（热数据）
- [ ] CDN 加速（静态资源）
- [ ] 函数冷启动优化（Vercel）

**完成标志**:
- ✅ 性能基准达到预期
- ✅ 99% 响应时间 < 定值
- ✅ 无明显性能回归

---

#### 5.2 文档完善 (3-4 天)

**新增文档**:

```
docs/
├── README.md                   # 快速开始
├── ARCHITECTURE.md             # 系统架构设计
├── FEATURES.md                 # 功能说明
├── FILE_PARSING.md             # 文件解析指南
├── PLUGIN_SPEC.md              # 插件规范
├── PLUGIN_DEVELOPMENT.md       # 插件开发教程
├── API_REFERENCE.md            # API 完整参考
├── TOOLS_INTEGRATION.md        # 工具集成指南
├── DEPLOYMENT.md               # 部署指南
├── EXAMPLES.md                 # 使用示例
├── TROUBLESHOOTING.md          # 故障排除
├── FAQ.md                      # 常见问题
└── CHANGELOG.md                # 版本更新日志
```

**关键文档内容**:
- ✅ 快速开始（3 分钟上手）
- ✅ 详细 API 文档（所有端点）
- ✅ 插件开发完整教程
- ✅ 常见问题和解决方案
- ✅ 视频演示链接

**完成标志**:
- ✅ 文档覆盖所有功能
- ✅ 代码示例可运行
- ✅ 用户反馈文档清晰

---

#### 5.3 示例应用开发 (4-5 天)

**5 个示例应用**:

1. **论文研究助手**
   - 上传 PDF 论文
   - 自动提取关键信息
   - 生成研究笔记模板
   - 插件：@smart-favorites/plugin-paper-assistant

2. **个人知识库网站**
   - 展示所有文档和书签
   - 公开分享功能
   - 全文搜索
   - 项目：smart-favorites-public-wiki

3. **课程学习管理**
   - 组织课程资料
   - 生成学习进度
   - AI 辅导问答
   - 项目：smart-favorites-course-helper

4. **博客写作助手**
   - 从知识库检索素材
   - 自动生成引用
   - 内容建议
   - 项目：smart-favorites-blog-writer

5. **AI 研究代理**
   - 基于知识库回答研究问题
   - 生成论文大纲
   - 查找相关文献
   - 项目：smart-favorites-research-agent

**完成标志**:
- ✅ 5 个示例应用可运行
- ✅ 代码质量高、有注释
- ✅ 演示视频已录制

---

#### 5.4 发布与推广 (2-3 天)

**发布清单**:

- [ ] 创建 GitHub 组织 `@smart-favorites`
- [ ] 发布核心包到 NPM
  - [ ] `@smart-favorites/types`
  - [ ] `@smart-favorites/core`
  - [ ] `@smart-favorites/plugin-template`
- [ ] 创建插件市场网站
- [ ] 撰写发布公告
- [ ] 录制演示视频
- [ ] 发送社区公告（HN、ProductHunt）
- [ ] 创建官方博客
- [ ] 联系技术媒体

**推广渠道**:
- GitHub
- NPM
- ProductHunt
- HackerNews
- 技术博客
- 社交媒体

**完成标志**:
- ✅ 项目正式发布
- ✅ NPM 包可安装
- ✅ 社区反馈积极
- ✅ 媒体报道

---

#### Phase 5 完成条件
- ✅ 所有性能指标达到预期
- ✅ 文档完整详尽
- ✅ 5+ 示例应用可运行
- ✅ 项目正式发布
- ✅ 社区有活跃反馈

---

## 📈 实时进度追踪

### 总体进度
- **当前状态**: ✅ Phase 1 - UI 深度打磨完成 (智能收藏/个人资料/广场系列)
- **下一步**: 🟡 Phase 2 - 文件系统基础开发 (LLM-wiki功能)
- **完成率**: 25% (UI系列完成 + 深度规划 / 总体)

### 各阶段进度

```
Phase 0: 规划与研究 (UI 系列 - 智能收藏/个人资料/广场)
├─ [x] UI 打磨规划设计            (完成 → docs/plans/2026-02-14-ui-profile-square-extension-plan.md)
└─ [x] 架构设计
✅ 完成 | 实际: 2026-02-14

Phase 1: UI 深度打磨 (UI 系列)
├─ [x] 集成 next-themes 主题切换      (完成 → components/theme-provider.tsx, theme-toggle.tsx)
├─ [x] 创建 Skeleton 骨架屏          (完成 → components/ui/skeleton.tsx)
├─ [x] 空状态插图与动画              (完成 → components/empty-state.tsx)
└─ [x] 应用于 bookmarks 和 stars 页面 (完成 → app/dashboard/bookmarks/page.tsx, stars/page.tsx)
✅ 完成 | 实际: 2026-05-09

Phase 2: Dashboard 个人资料设置页 (UI 系列)
├─ [ ] 创建 profiles 表与 Supabase Storage  (预计: 2026-05-16)
├─ [ ] 头像库与 Profile API               (预计: 2026-05-18)
├─ [ ] Profile 编辑页面 UI               (预计: 2026-05-20)
└─ [ ] 布局显示 Profile                  (预计: 2026-05-22)
🟡 待开始 | 预计: 2026-05-22

Phase 3: 广场分享功能 (UI 系列 - Steam 风格)
├─ [ ] 数据库与 Storage               (预计: 2026-05-29)
├─ [ ] Square API 与类型              (预计: 2026-05-31)
└─ [ ] 广场页面 UI                    (预计: 2026-06-05)
⏳ 未开始 | 预计: 2026-06-05

Phase 4: 浏览器扩展与 Web 联动 (UI 系列)
├─ [ ] 扩展配置与 API 端点            (预计: 2026-06-12)
├─ [ ] 扩展 OAuth 登录               (预计: 2026-06-15)
└─ [ ] 扩展数据同步                   (预计: 2026-06-18)
⏳ 未开始 | 预计: 2026-06-18

---

Phase 1: 文件系统基础 (LLM-wiki 功能系列)
├─ [ ] 数据库扩展          (预计: 2026-05-22)
├─ [ ] 文件上传 API        (预计: 2026-05-25)
├─ [ ] 多格式解析器        (预计: 2026-06-01)
├─ [ ] 异步处理管道        (预计: 2026-06-05)
└─ [ ] UI 组件             (预计: 2026-06-08)
🟡 待开始 | 预计: 2026-06-15

Phase 2: RAG 系统增强
├─ [ ] 统一搜索层          (预计: 2026-06-22)
├─ [ ] 改进提示词          (预计: 2026-06-25)
├─ [ ] 新增 RAG API        (预计: 2026-06-28)
└─ [ ] 检索优化            (预计: 2026-07-01)
⏳ 未开始 | 预计: 2026-07-05

Phase 3: 插件生态系统
├─ [ ] 插件规范设计        (预计: 2026-07-12)
├─ [ ] 加载系统            (预计: 2026-07-19)
├─ [ ] 插件市场            (预计: 2026-07-26)
└─ [ ] 示例插件            (预计: 2026-08-02)
⏳ 未开始 | 预计: 2026-08-09

Phase 4: AI 工具调用接口
├─ [ ] 接口设计            (预计: 2026-08-16)
├─ [ ] OpenAI 集成         (预计: 2026-08-19)
├─ [ ] 权限管理            (预计: 2026-08-22)
└─ [ ] 集成示例            (预计: 2026-08-25)
⏳ 未开始 | 预计: 2026-08-28

Phase 5: 优化、文档、发布
├─ [ ] 性能优化            (预计: 2026-09-04)
├─ [ ] 文档完善            (预计: 2026-09-08)
├─ [ ] 示例应用            (预计: 2026-09-12)
└─ [ ] 社区发布            (预计: 2026-09-15)
⏳ 未开始 | 预计: 2026-09-18
```

---

## 🔄 更新日志

### 2026-05-09 - Phase 1 完成 (UI 系列)
- ✅ 完成 next-themes 集成与主题切换 → `components/theme-provider.tsx`, `components/theme-toggle.tsx`
- ✅ 完成 Skeleton 骨架屏组件 → `components/ui/skeleton.tsx`
- ✅ 完成 EmptyState 空状态组件与动画 → `components/empty-state.tsx`
- ✅ 在 bookmarks 页面集成 Skeleton + EmptyState → `app/dashboard/bookmarks/page.tsx`
- ✅ 在 stars 页面集成 Skeleton + EmptyState → `app/dashboard/stars/page.tsx`
- ✅ 在 dashboard layout 添加 ThemeToggleCompact → header 区域
- ✅ 所有卡片添加 transition-all 和 hover 动画
- 📝 已应用 framer-motion 用于入场动画
- 🚀 Phase 2 (个人资料设置页) 准备就绪

### 2026-05-08 - Phase 0 完成 (规划与研究)
- ✅ 完成 Karpathy LLM-wiki 设计思想研究 → `docs/KARPATHY_RESEARCH.md`
- ✅ 完成文件解析库调研与技术选型 → `docs/FILE_PARSING_RESEARCH.md`
- ✅ 完成数据库 Schema 详细设计 → `docs/DATABASE_SCHEMA_DESIGN.md`
- ✅ 完成插件规范 v1.0 设计 → `docs/PLUGIN_SPEC.md`
- ✅ 完成技术决策与架构权衡分析 → `docs/TECH_DECISIONS.md`
- ✅ 创建完整的 BUILD.md 开发计划文档
- 📝 核心决策已记录，可复用参考
- 🚀 Phase 1 准备就绪

### 2026-05-08 之前
- ✅ 创建 BUILD.md 文档
- ✅ 完成需求分析
- ✅ 设计五个开发阶段
- ✅ 创建详细的任务清单

### 下次更新 (Phase 1 启动)
- 创建数据库迁移脚本
- 开始文件上传 API 开发
- 集成第一个文件解析器 (PDF)

---

## 🤔 决策点与风险

### 关键决策

1. **Serverless vs 自托管**
   - ✅ 决策: Serverless 优先 (Vercel + Supabase)
   - 理由: 无运维、自动扩展、成本低

2. **文件格式支持范围**
   - ✅ 决策: 优先 PDF、DOCX、TXT；PPTX 延期
   - 理由: MVP 快速发布，覆盖 80% 使用场景

3. **插件系统复杂度**
   - ✅ 决策: NPM 包框架，动态加载
   - 理由: 成熟生态、用户友好、易于维护

### 风险和缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 文件解析库不稳定 | 高 | 低 | 选择成熟库、添加备选方案 |
| 向量搜索性能不达预期 | 中 | 低 | 提前性能测试、准备优化方案 |
| 插件系统安全隐患 | 高 | 中 | 严格权限检查、代码审计 |
| 异步任务丢失 | 中 | 低 | 添加重试机制、任务持久化 |
| 第三方 API 变更 | 中 | 中 | 定期版本更新、社区反馈 |

---

## 📚 参考资源

### 官方文档
- [Supabase 向量搜索](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Vercel Edge Functions](https://vercel.com/docs/edge-functions/overview)
- [Next.js App Router](https://nextjs.org/docs/app)

### 开源项目
- [LlamaIndex](https://github.com/run-llama/llama_index) - RAG 框架
- [LangChain](https://github.com/langchain-ai/langchain) - 链式调用
- [Chroma](https://github.com/chroma-core/chroma) - 向量数据库

### 论文和文章
- Karpathy LLM-wiki 相关设计
- RAG 系统最佳实践
- 插件系统设计模式

---

## 📞 联系方式

- **项目主页**: https://github.com/awezio/Smart-Favorites
- **问题反馈**: GitHub Issues
- **讨论**: GitHub Discussions
- **贡献指南**: CONTRIBUTING.md

---

**文档维护者**: Smart Favorites 开发团队  
**最后更新**: 2026-05-08  
**下次计划更新**: 每两周一次
