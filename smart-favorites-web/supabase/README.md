# Supabase 设置指南

本目录包含 Smart Favorites 项目的数据库迁移脚本和配置。

## 🚀 快速开始

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册/登录账号
3. 创建新项目
4. 等待项目初始化完成

### 2. 启用 pgvector 扩展

pgvector 扩展已在迁移脚本中自动启用，但如果遇到问题，可以手动启用：

1. 进入 Supabase Dashboard
2. 点击 "Database" > "Extensions"
3. 搜索 "vector"
4. 启用 pgvector 扩展

### 3. 运行迁移脚本

按顺序在 SQL Editor 中运行以下脚本：

#### 步骤 1: 创建表结构

```sql
-- 复制并运行 migrations/001_initial_schema.sql 的内容
```

这个脚本会创建：
- `bookmarks` 表（书签数据）
- `github_stars` 表（GitHub Stars 数据）
- `chat_sessions` 表（聊天会话数据）
- 相关索引和触发器
- Row Level Security (RLS) 策略

#### 步骤 2: 创建向量搜索函数

```sql
-- 复制并运行 migrations/002_vector_search_functions.sql 的内容
```

这个脚本会创建：
- `match_bookmarks()` - 搜索书签
- `match_stars()` - 搜索 GitHub Stars
- `match_all_items()` - 跨表搜索

### 4. 获取 API 密钥

1. 进入 "Settings" > "API"
2. 复制以下信息：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # ⚠️ 保密！
```

3. 将这些信息填入 `.env.local` 文件

## 📊 数据库结构

### bookmarks 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| title | TEXT | 书签标题 |
| url | TEXT | 书签 URL |
| description | TEXT | AI 生成的描述 |
| folder_path | TEXT | 文件夹路径 |
| add_date | TIMESTAMPTZ | 添加日期 |
| icon | TEXT | 图标 URL |
| embedding | VECTOR(384) | 向量嵌入 |
| source_hash | TEXT | 内容哈希 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### github_stars 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| owner | TEXT | 仓库所有者 |
| repo | TEXT | 仓库名称 |
| url | TEXT | 仓库 URL |
| description | TEXT | 仓库描述 |
| language | TEXT | 主要语言 |
| stars | INTEGER | Star 数量 |
| forks | INTEGER | Fork 数量 |
| updated | TIMESTAMPTZ | 最后更新时间 |
| embedding | VECTOR(384) | 向量嵌入 |
| source_hash | TEXT | 内容哈希 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### chat_sessions 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| title | TEXT | 会话标题 |
| messages | JSONB | 消息列表 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

## 🔍 向量搜索函数

### match_bookmarks

搜索书签：

```sql
SELECT * FROM match_bookmarks(
  query_embedding := ARRAY[0.1, 0.2, ...],  -- 384维向量
  match_threshold := 0.3,                    -- 相似度阈值
  match_count := 10                          -- 返回数量
);
```

### match_stars

搜索 GitHub Stars：

```sql
SELECT * FROM match_stars(
  query_embedding := ARRAY[0.1, 0.2, ...],
  match_threshold := 0.3,
  match_count := 10
);
```

### match_all_items

跨表搜索：

```sql
SELECT * FROM match_all_items(
  query_embedding := ARRAY[0.1, 0.2, ...],
  match_threshold := 0.3,
  match_count := 10
);
```

## 🔒 安全性

### Row Level Security (RLS)

当前配置为允许所有操作（适用于单用户或开发环境）。

如需多用户支持，可以修改 RLS 策略：

```sql
-- 删除现有策略
DROP POLICY "Allow all operations on bookmarks" ON bookmarks;

-- 创建用户隔离策略
CREATE POLICY "Users can only access their own bookmarks"
  ON bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## 🧪 测试数据库连接

运行健康检查 API：

```bash
curl https://your-app.vercel.app/api/health
```

预期响应：

```json
{
  "status": "ok",
  "database": "connected",
  "bookmarks_count": 0,
  "stars_count": 0,
  "model": "deepseek"
}
```

## 🔧 故障排除

### 问题：向量搜索函数失败

**解决方案**：
1. 确认 pgvector 扩展已启用
2. 检查向量维度是否为 384
3. 确认表中有 embedding 数据

### 问题：RLS 策略阻止访问

**解决方案**：
1. 检查是否使用了 `SUPABASE_SERVICE_ROLE_KEY`
2. 临时禁用 RLS 进行测试：
   ```sql
   ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
   ```

### 问题：索引构建失败

**解决方案**：
1. 确保表中至少有 1000 行数据再创建 IVFFlat 索引
2. 或使用 HNSW 索引（需要 pgvector 0.5.0+）：
   ```sql
   CREATE INDEX ON bookmarks USING hnsw (embedding vector_cosine_ops);
   ```

## 📚 更多资源

- [Supabase 文档](https://supabase.com/docs)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [Vector 索引性能优化](https://supabase.com/docs/guides/ai/vector-indexes)
