# Smart Favorites 快速开始指南

## 🚀 5 分钟快速部署

### 第一步：创建 Supabase 项目

1. 访问 https://supabase.com 并注册/登录
2. 点击 "New Project"
3. 填写项目信息并创建
4. 等待项目初始化完成（约 2 分钟）

### 第二步：设置数据库

1. 进入 Supabase Dashboard
2. 点击左侧 "SQL Editor"
3. 依次复制并运行以下 SQL 文件的内容：
   - 📄 `supabase/migrations/001_initial_schema.sql`
   - 📄 `supabase/migrations/002_vector_search_functions.sql`

### 第三步：获取 API 密钥

1. 进入 "Settings" > "API"
2. 复制以下信息：
   ```
   Project URL → NEXT_PUBLIC_SUPABASE_URL
   anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
   service_role → SUPABASE_SERVICE_ROLE_KEY (⚠️保密)
   ```

### 第四步：配置环境变量

1. 复制 `.env.local.example` 为 `.env.local`
2. 填写 Supabase 信息和至少一个 AI Provider Key
3. 示例配置：

```env
# Supabase (必需)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# AI Provider (至少配置一个)
DEEPSEEK_API_KEY=sk-your-key

# 默认 Provider
DEFAULT_LLM_PROVIDER=deepseek
```

### 第五步：部署到 Vercel

#### 方法 A：使用 Vercel CLI（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd smart-favorites-web
vercel --prod
```

按提示操作，**记得在 Vercel Dashboard 中配置环境变量！**

#### 方法 B：通过 GitHub 自动部署

1. 将代码推送到 GitHub
2. 访问 https://vercel.com/dashboard
3. 点击 "Import Project"
4. 选择 GitHub 仓库
5. **重要**：在环境变量中添加所有 `.env.local` 的内容
6. 点击 "Deploy"

### 第六步：配置浏览器插件

部署完成后，Vercel 会给出域名，例如：`https://smart-favorites-abc123.vercel.app`

1. 打开浏览器，右键点击 Smart Favorites 插件图标
2. 选择"选项"
3. 选择"生产环境 (Vercel/远程)"
4. 粘贴 Vercel 域名
5. 点击"测试连接"
6. 点击"保存设置"

## ✅ 验证部署

访问以下 URL 确认一切正常：

```bash
# 1. 主页
https://your-app.vercel.app/

# 2. Health Check
https://your-app.vercel.app/api/health

# 应返回：
{
  "status": "ok",
  "database": "connected",
  "bookmarks_count": 0,
  "stars_count": 0,
  "model": "deepseek"
}
```

## 🎯 开始使用

### 导入书签

**方法 1：使用插件**
1. 打开浏览器侧边栏（点击插件图标）
2. 切换到"同步"标签
3. 点击"立即同步收藏夹"

**方法 2：使用网页**
1. 访问 `https://your-app.vercel.app/bookmarks`
2. 点击"导入 HTML"
3. 选择从浏览器导出的书签 HTML 文件

### 同步 GitHub Stars

1. 访问 `https://your-app.vercel.app/stars`
2. 输入你的 GitHub 用户名
3. 点击"同步"

（可选）在设置中配置 GitHub Token 以提高 API 限制

### 开始搜索

1. 访问首页或打开浏览器插件
2. 输入关键词或自然语言问题
3. 查看 AI 智能搜索结果

### AI 问答

1. 访问 `https://your-app.vercel.app/chat`
2. 向 AI 提问关于你的收藏内容
3. AI 会基于你的书签和 Stars 回答

## 💡 最佳实践

1. **定期同步**：设置自动同步或定期手动同步
2. **添加描述**：为重要书签生成 AI 描述，提高搜索准确度
3. **使用查新**：定期运行 diff 检测，了解收藏变化
4. **多设备**：通过远程 API，在任何设备上访问收藏夹

## 🔧 故障排除

### 部署失败？

1. 检查环境变量是否正确配置
2. 查看 Vercel Deployment Logs
3. 确认 Supabase 项目可访问

### 搜索无结果？

1. 确认已导入数据
2. 检查 embedding 是否生成（数据库中 embedding 列不为空）
3. 尝试降低搜索阈值

### AI 问答不工作？

1. 确认 AI Provider API Key 配置正确
2. 检查 API 额度是否用尽
3. 查看浏览器控制台错误信息

## 📚 更多资源

- 📖 完整文档：[README.md](README.md)
- 🚀 详细部署指南：[DEPLOYMENT.md](DEPLOYMENT.md)
- ✅ 部署检查清单：[CHECKLIST.md](CHECKLIST.md)
- 🗂️ Supabase 设置：[supabase/README.md](supabase/README.md)

## 🆘 需要帮助？

如遇到问题，请检查：
1. Vercel Function Logs
2. Supabase Logs
3. 浏览器控制台
4. Network 请求详情

---

**祝您使用愉快！🎉**
