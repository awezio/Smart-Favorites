# Smart Favorites 部署指南

完整的 Vercel 部署指南

## 📋 部署前准备

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册/登录账号
3. 点击 "New Project"
4. 填写项目信息：
   - Name: smart-favorites
   - Database Password: (设置一个强密码)
   - Region: (选择离您最近的区域)
5. 等待项目初始化完成（约 2 分钟）

### 2. 配置 Supabase 数据库

#### 步骤 1: 启用 pgvector 扩展

1. 进入 Supabase Dashboard
2. 点击左侧 "Database" > "Extensions"
3. 搜索 "vector"
4. 点击启用 pgvector 扩展

#### 步骤 2: 运行迁移脚本

1. 点击左侧 "SQL Editor"
2. 点击 "New query"
3. 复制并运行 `supabase/migrations/001_initial_schema.sql` 的内容
4. 等待执行完成
5. 再次创建新查询，运行 `supabase/migrations/002_vector_search_functions.sql`

#### 步骤 3: 获取 API 密钥

1. 进入 "Settings" > "API"
2. 复制以下信息并保存：
   ```
   Project URL (NEXT_PUBLIC_SUPABASE_URL)
   anon public (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   service_role (SUPABASE_SERVICE_ROLE_KEY) ⚠️ 保密！
   ```

### 3. 获取 AI Provider API Key

至少需要配置一个 AI Provider：

#### 推荐：DeepSeek (性价比最高)

1. 访问 https://platform.deepseek.com
2. 注册并充值（最低 10 元）
3. 创建 API Key
4. 保存 Key

#### 其他可选 Provider

- **OpenAI**: https://platform.openai.com
- **Kimi (月之暗面)**: https://platform.moonshot.cn
- **Qwen (通义千问)**: https://dashscope.aliyun.com
- **Claude**: https://console.anthropic.com
- **Gemini**: https://makersuite.google.com
- **GLM (智谱)**: https://open.bigmodel.cn
- **Ollama**: 本地部署，无需 API Key

### 4. 准备 GitHub Token (可选)

如需同步 GitHub Stars：

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" > "Generate new token (classic)"
3. 勾选 `public_repo` 权限
4. 生成并保存 Token

## 🚀 部署到 Vercel

### 方法 A: 使用 Vercel CLI (推荐)

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署项目

```bash
cd smart-favorites-web
vercel --prod
```

#### 4. 配置环境变量

在部署过程中或部署后，在 Vercel Dashboard 中配置：

1. 进入项目 > Settings > Environment Variables
2. 添加所有环境变量：

**必需变量：**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DEEPSEEK_API_KEY=sk-xxx
DEFAULT_LLM_PROVIDER=deepseek
```

**可选变量：**

```env
GITHUB_TOKEN=ghp_xxx
OPENAI_API_KEY=sk-xxx
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

#### 5. 重新部署

```bash
vercel --prod
```

### 方法 B: 通过 GitHub 自动部署

#### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/smart-favorites-web.git
git push -u origin main
```

#### 2. 在 Vercel 中导入

1. 访问 https://vercel.com/dashboard
2. 点击 "Add New..." > "Project"
3. 从 GitHub 导入项目
4. 配置项目：
   - Framework Preset: Next.js
   - Root Directory: smart-favorites-web
5. 添加环境变量（见上方）
6. 点击 "Deploy"

#### 3. 等待部署完成

- Vercel 会自动构建和部署
- 部署完成后会获得一个域名：`https://your-app.vercel.app`

## ✅ 验证部署

### 1. 访问应用

```
https://your-app.vercel.app
```

### 2. 检查 Health Endpoint

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
  "model": "deepseek",
  "timestamp": "2026-02-04T..."
}
```

### 3. 测试搜索功能

1. 访问主页
2. 先导入一些书签或同步 GitHub Stars
3. 尝试搜索功能

### 4. 测试 AI 问答

1. 访问 `/chat` 页面
2. 创建新对话
3. 提问并查看 AI 回答

## 🔧 配置浏览器插件

### 1. 打开插件选项

- Chrome: 右键点击插件图标 > "选项"
- Edge: 右键点击插件图标 > "选项"

### 2. 配置远程服务器

1. 选择 "生产环境 (Vercel/远程)"
2. 输入 Vercel 域名：`https://your-app.vercel.app`
3. 点击 "测试连接"
4. 确认连接成功后点击 "保存设置"

### 3. 测试同步

1. 打开浏览器侧边栏（点击插件图标）
2. 切换到 "同步" 标签
3. 点击 "立即同步收藏夹"
4. 等待同步完成

## 🐛 故障排除

### 问题 1: 部署失败 - 构建错误

**原因**: TypeScript 类型错误或依赖问题

**解决方案**:

```bash
# 本地测试构建
npm run build

# 检查错误日志
```

### 问题 2: API 请求失败 - 500 错误

**原因**: 环境变量配置错误或 Supabase 连接问题

**解决方案**:

1. 检查 Vercel 环境变量是否正确
2. 确认 Supabase 项目可访问
3. 查看 Vercel Function Logs

### 问题 3: 搜索无结果

**原因**: 数据未导入或 embedding 未生成

**解决方案**:

1. 确认已导入数据
2. 检查数据库中 embedding 字段不为空
3. 尝试重新同步数据

### 问题 4: AI 描述生成失败

**原因**: AI Provider API Key 错误或额度不足

**解决方案**:

1. 检查 API Key 是否正确
2. 确认 API 额度充足
3. 尝试切换其他 Provider
4. 查看 Network 请求详情

### 问题 5: GitHub Stars 同步失败

**原因**: API 限制或 Token 无效

**解决方案**:

1. 配置 GitHub Token
2. 等待 API 限制重置（每小时 60 次）
3. 检查 Token 权限

### 问题 6: 向量搜索函数失败

**原因**: pgvector 扩展未启用或索引问题

**解决方案**:

```sql
-- 检查扩展
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 重新创建索引
DROP INDEX IF EXISTS bookmarks_embedding_idx;
CREATE INDEX bookmarks_embedding_idx ON bookmarks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

## 📊 性能优化

### 1. 向量索引优化

对于大量数据（>10000 条），考虑使用 HNSW 索引：

```sql
-- 需要 pgvector 0.5.0+
CREATE INDEX bookmarks_embedding_hnsw_idx ON bookmarks 
  USING hnsw (embedding vector_cosine_ops);
```

### 2. Vercel Function 超时

如果遇到超时问题，可以在 `vercel.json` 中调整：

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

注意：免费版最大 10 秒，Pro 版最大 300 秒。

### 3. Embedding 缓存

考虑缓存 embedding 以减少计算：

```typescript
// 在生产环境中，可以使用 Redis 缓存 embedding
const cachedEmbedding = await redis.get(`embedding:${textHash}`);
if (cachedEmbedding) {
  return JSON.parse(cachedEmbedding);
}
```

## 🔐 安全最佳实践

### 1. 环境变量

- ⚠️ **永远不要**提交 `.env.local` 到 Git
- ✅ 使用 Vercel 环境变量管理敏感信息
- ✅ 定期轮换 API Key

### 2. Supabase RLS

如需多用户支持，配置 Row Level Security：

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

### 3. API 限流

考虑添加 rate limiting：

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

## 📈 监控和日志

### 1. Vercel Logs

```bash
vercel logs --follow
```

### 2. Supabase Logs

Supabase Dashboard > Logs > API Logs

### 3. 错误追踪

考虑集成 Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## 🎉 部署完成

恭喜！您的 Smart Favorites 已成功部署到云端。

**下一步：**

1. 导入您的书签和 GitHub Stars
2. 探索 AI 搜索和问答功能
3. 自定义配置和设置
4. 分享给朋友使用

**需要帮助？**

- 查看 [README.md](README.md) 了解更多功能
- 查看 [FEATURES.md](FEATURES.md) 了解详细使用方法
- 提交 Issue 报告问题

---

**祝您使用愉快！** 🚀
