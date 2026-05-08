# 数据库 Schema 设计详案

**设计日期**: 2026-05-08  
**数据库**: Supabase PostgreSQL + pgvector  
**应用**: Phase 1 文件系统基础

---

## 🎯 设计原则

1. **简洁性** - 数据模型尽可能简洁，避免过度设计
2. **可扩展性** - 易于添加新功能，如版本控制、权限管理
3. **性能优先** - 关键查询路径优化，合理使用索引
4. **数据完整性** - 约束和触发器保证数据一致性
5. **隐私安全** - 行级安全（RLS）策略确保用户隔离

---

## 📊 核心数据表设计

### 1. documents 表 - 文件元数据

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 文件基本信息
  name TEXT NOT NULL,                        -- 原始文件名
  file_type VARCHAR(50) NOT NULL,           -- pdf, docx, xlsx, txt, md, html
  file_size INTEGER NOT NULL,               -- 文件大小 (bytes)
  file_path TEXT NOT NULL,                  -- Supabase Storage 路径
  
  -- 文档元数据 (AI 生成或用户输入)
  title TEXT,                               -- 文档标题
  description TEXT,                        -- 文档描述
  tags TEXT[] DEFAULT '{}',                 -- 标签数组
  source_url TEXT,                          -- 原始网址 (网页快照场景)
  author TEXT,                              -- 作者
  
  -- 处理状态
  status VARCHAR(20) DEFAULT 'pending',     -- pending | processing | completed | failed
  processing_error TEXT,                    -- 处理错误信息
  
  -- 处理进度
  total_chunks INTEGER DEFAULT 0,           -- 总分块数
  embedded_chunks INTEGER DEFAULT 0,        -- 已向量化分块数
  
  -- 内容统计
  word_count INTEGER DEFAULT 0,
  page_count INTEGER,
  
  -- 时间戳
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束
  CONSTRAINT file_size_positive CHECK (file_size > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT title_not_empty CHECK (title IS NULL OR length(title) > 0)
);

-- 索引
CREATE INDEX idx_documents_user_id 
  ON documents(user_id);

CREATE INDEX idx_documents_status 
  ON documents(status);

CREATE INDEX idx_documents_created_at 
  ON documents(created_at DESC);

CREATE INDEX idx_documents_updated_at 
  ON documents(updated_at DESC);

-- 查询待处理文档时需要
CREATE INDEX idx_documents_status_created 
  ON documents(user_id, status, created_at DESC)
  WHERE status = 'pending';

-- 行级安全
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" 
  ON documents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
  ON documents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
  ON documents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
  ON documents FOR DELETE 
  USING (auth.uid() = user_id);
```

**设计说明**:
- `status` 字段用于异步处理管道追踪
- `total_chunks` 和 `embedded_chunks` 用于监控处理进度
- 使用 CHECK 约束而不是 trigger 的原因：性能更好
- 为 "获取待处理文档" 这个常见查询创建复合索引

---

### 2. document_chunks 表 - 文本分块

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 内容
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,        -- SHA-256 hash，用于去重
  
  -- 分块位置信息
  chunk_index INTEGER NOT NULL,             -- 在文档中的顺序 (0-based)
  page_number INTEGER,                      -- PDF 页码
  section_title TEXT,                       -- 所属章节标题
  char_start_pos INTEGER,                   -- 在原文本中的起始位置
  char_end_pos INTEGER,                     -- 在原文本中的结束位置
  
  -- 向量表示 (384 维)
  embedding vector(384) NOT NULL,
  
  -- 内容统计
  char_count INTEGER,
  estimated_token_count INTEGER,            -- 粗略估计的 token 数
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束
  CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
  CONSTRAINT content_not_empty CHECK (length(content) > 0),
  UNIQUE(document_id, chunk_index),
  UNIQUE(user_id, content_hash)              -- 同一用户不重复存储相同内容
);

-- 向量搜索索引 (IVFFlat)
CREATE INDEX idx_document_chunks_embedding 
  ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- 查询文档的所有 chunks 时需要
CREATE INDEX idx_document_chunks_document_id 
  ON document_chunks(document_id, chunk_index);

-- 统计用户的 chunks
CREATE INDEX idx_document_chunks_user_id 
  ON document_chunks(user_id);

-- 内容去重查找
CREATE INDEX idx_document_chunks_content_hash 
  ON document_chunks(user_id, content_hash);

-- 行级安全
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chunks" 
  ON document_chunks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks" 
  ON document_chunks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks" 
  ON document_chunks FOR DELETE 
  USING (auth.uid() = user_id);
```

**设计说明**:
- `embedding` 向量字段支持 pgvector 扩展
- IVFFlat 索引用于快速向量相似度搜索 (1M+ rows 级别)
- `content_hash` 和 `UNIQUE(user_id, content_hash)` 用于去重
- 保存 `char_start_pos` 和 `char_end_pos` 便于追踪来源

---

## 🔍 向量搜索函数

### 混合搜索存储过程

```sql
-- 向量搜索：返回相似的 chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector,
  user_id_param UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  page_number INT,
  section_title TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.page_number,
    dc.section_title
  FROM document_chunks dc
  WHERE dc.user_id = user_id_param
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 关键词搜索：返回匹配的 chunks
CREATE OR REPLACE FUNCTION keyword_search_document_chunks(
  query_text TEXT,
  user_id_param UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  relevance_score FLOAT,
  page_number INT,
  section_title TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    -- 简单的相关性评分：匹配次数 / 内容长度
    (
      (
        (CASE WHEN dc.section_title ILIKE '%' || query_text || '%' THEN 10 ELSE 0 END)
        + (CASE WHEN dc.content ILIKE query_text || '%' THEN 3 ELSE 0 END)
        + (CASE WHEN dc.content ILIKE '%' || query_text || '%' THEN 1 ELSE 0 END)
        + (SELECT COUNT(*) FROM regexp_matches(dc.content, query_text, 'gi'))
      )::FLOAT / (char_length(dc.content)::FLOAT / 100)
    ) AS relevance_score,
    dc.page_number,
    dc.section_title
  FROM document_chunks dc
  WHERE dc.user_id = user_id_param
    AND (
      dc.section_title ILIKE '%' || query_text || '%'
      OR dc.content ILIKE '%' || query_text || '%'
    )
  ORDER BY relevance_score DESC, dc.document_id, dc.chunk_index
  LIMIT match_count;
$$;
```

---

## 📋 表关系图

```
┌─────────────────────────┐
│     auth.users          │
│   (Supabase Built-in)   │
└────────────┬────────────┘
             │ references (user_id)
             ↓
┌──────────────────────────┐         ┌──────────────────────────┐
│     documents            │◄────────│  document_chunks         │
│ (文件元数据)              │ 1:many  │ (文本分块 + 向量)       │
│                          │         │                          │
│ - id                     │         │ - id                     │
│ - user_id ◄──────────────┼─────────├─ document_id             │
│ - name                   │         │ - user_id ◄──────┐      │
│ - file_type              │         │ - content        │      │
│ - status                 │         │ - embedding      │      │
│ - total_chunks           │         │ - chunk_index    │      │
│ - embedded_chunks        │         │ - page_number    │      │
│                          │         │                  │      │
└──────────────────────────┘         └──────────────────┼──────┘
         │                                              │
         └──────────────────┬───────────────────────────┘
                            │
                    Both reference user_id
                    for Row-Level Security
```

---

## 🛡️ 行级安全策略

```sql
-- 确认所有 RLS 策略已启用
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 验证策略正确性
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename IN ('documents', 'document_chunks');
```

---

## 📈 性能优化建议

### 1. 索引选择

| 查询场景 | 所需索引 | 原因 |
|---------|---------|------|
| 获取用户的文档列表 | `(user_id, created_at)` | 常见查询 |
| 搜索待处理文档 | `(user_id, status)` | Cron 任务 |
| 向量相似度搜索 | `embedding` (IVFFlat) | RAG 核心 |
| 内容去重 | `(user_id, content_hash)` | 避免重复 |

### 2. 查询优化

```sql
-- ❌ 不好：返回全部字段
SELECT * FROM document_chunks 
WHERE user_id = 'xxx' 
LIMIT 100;

-- ✅ 好：只选择需要的字段
SELECT id, content, page_number, embedding
FROM document_chunks 
WHERE user_id = 'xxx' 
ORDER BY chunk_index
LIMIT 100;
```

### 3. 分页策略

```sql
-- 使用 keyset 分页而不是 OFFSET
-- ❌ 不好：OFFSET 会扫描前 N 行
SELECT * FROM documents 
WHERE user_id = 'xxx'
ORDER BY created_at DESC
OFFSET 1000 LIMIT 20;

-- ✅ 好：使用游标分页
SELECT * FROM documents 
WHERE user_id = 'xxx'
  AND created_at < 'cursor-timestamp'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚀 迁移策略

### 创建迁移文件

```
smart-favorites-web/supabase/migrations/
├── 20260508_001_create_documents_table.sql
└── 20260508_002_create_chunks_and_functions.sql
```

### 迁移脚本执行顺序

```bash
# 1. 启用扩展
supabase migration add enable_pgvector
# 内容：CREATE EXTENSION IF NOT EXISTS vector;

# 2. 创建表
supabase migration add create_documents_table

# 3. 创建搜索函数
supabase migration add create_search_functions

# 4. 本地测试
supabase db reset

# 5. 提交到生产
supabase db push
```

---

## 🧪 测试 SQL 查询

### 测试数据插入

```sql
-- 插入测试文档
INSERT INTO documents (user_id, name, file_type, file_size, file_path, title, status)
VALUES (
  'test-user-id',
  'sample.pdf',
  'pdf',
  1024000,
  'documents/test-user-id/doc-001/sample.pdf',
  'Sample PDF Document',
  'completed'
);

-- 插入测试 chunks (使用随机向量)
INSERT INTO document_chunks (
  document_id, user_id, content, content_hash, chunk_index,
  page_number, embedding
) VALUES (
  'document-id',
  'test-user-id',
  'This is a test chunk content.',
  'hash-123',
  0,
  1,
  '[0.1, 0.2, 0.3, ...]'::vector  -- 384 维向量
);
```

### 测试向量搜索

```sql
-- 准备查询向量 (假设已计算)
SELECT * FROM match_document_chunks(
  '[0.1, 0.2, 0.3, ...]'::vector,  -- query_embedding (384 维)
  'test-user-id'::UUID,             -- user_id
  10,                               -- match_count
  0.3                               -- similarity_threshold
);
```

### 测试关键词搜索

```sql
SELECT * FROM keyword_search_document_chunks(
  'vector database',
  'test-user-id'::UUID,
  10
);
```

---

## 📊 Schema 演变计划

### Phase 1 (当前)
- ✅ documents 表
- ✅ document_chunks 表
- ✅ 向量和关键词搜索函数

### Phase 2 (RAG 增强)
- 可能添加：annotations 表（用户笔记）
- 可能添加：knowledge_entities 表（实体提取）
- 可能添加：knowledge_relations 表（知识图谱）

### Phase 3+ (协作功能)
- document_versions 表（版本控制）
- document_comments 表（评论）
- document_shares 表（权限共享）

---

## ⚠️ 常见问题

### Q1: 为什么使用 IVFFlat 而不是 HNSW？

**A**: 
- IVFFlat 更稳定成熟，Supabase 默认支持
- HNSW 需要额外 extension，且需要自己管理
- Phase 1 优先稳定性，可后续优化

### Q2: content_hash 用 SHA-256 有性能问题吗？

**A**:
- 计算成本低，只在插入时计算一次
- 可以在应用层预先计算，减少数据库负担

### Q3: chunks 表的数据量会很大吗？

**A**:
- 一个 100 页 PDF：约 100-200 chunks
- 100 个这样的 PDF：20,000 chunks
- 500 万行 chunks：Supabase 完全支持
- 关键是正确的索引

### Q4: 需要经常清理老的 chunks 吗？

**A**:
- 只在删除对应 document 时级联删除
- 使用 `ON DELETE CASCADE` 处理

---

## 📝 数据库维护清单

- [ ] 定期备份 (Supabase 自动处理)
- [ ] 监控表大小增长
- [ ] 检查索引使用率 (`pg_stat_user_indexes`)
- [ ] 定期 VACUUM (Supabase 自动处理)
- [ ] 监控查询性能 (Supabase 提供分析)

---

## 🔗 关联文档

- `KARPATHY_RESEARCH.md` - 知识图谱设计参考
- `FILE_PARSING_RESEARCH.md` - 文件处理流程
- `BUILD.md` - Phase 1 实现计划

---

**最后更新**: 2026-05-08  
**下次审核**: Phase 1 实现中期
