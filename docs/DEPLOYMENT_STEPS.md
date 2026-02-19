# Smart Favorites 部署前步骤指南

本文档列出部署 Web 应用和浏览器扩展前需要完成的配置与设置步骤。

---

## 一、Supabase 配置

### 1.1 应用数据库迁移

在 Supabase Dashboard 的 SQL Editor 中依次执行以下迁移（若已执行可跳过）：

| 迁移文件 | 说明 |
|---------|------|
| `001_initial_schema.sql` | 基础表：bookmarks, github_stars, chat_sessions |
| `002_vector_search_functions.sql` | 向量搜索函数 |
| `003_keyword_search_functions.sql` | 关键词搜索函数 |
| `004_create_user_settings.sql` | 用户设置表 |
| `005_create_profiles.sql` | 用户资料表（头像、昵称、简介） |
| `006_create_square_posts.sql` | 广场：帖子、媒体、投票 |
| `007_add_extension_token.sql` | 扩展手动 Token 字段 |

或使用 Supabase CLI 在项目根目录执行：

```bash
cd smart-favorites-web
npx supabase db push
```

### 1.2 创建 Storage Buckets

在 Supabase Dashboard → Storage 中创建以下 bucket：

| Bucket 名称 | 访问策略 | 用途 |
|-------------|----------|------|
| `avatars` | Public 读取，Authenticated 写入 | 用户头像 |
| `square_media` | Public 读取，Authenticated 写入 | 广场图片/视频 |

**Storage 策略示例（avatars）**：

- **读取**：`bucket_id = 'avatars'` → 允许所有人读取
- **写入**：`bucket_id = 'avatars'` 且 `auth.uid() IS NOT NULL` → 仅登录用户可写入

### 1.3 配置 Supabase Auth 提供方

在 Authentication → Providers 中启用：

- **Email**：用于邮箱+密码登录
- **GitHub**（可选）
- **Google**（可选）

若使用 OAuth，需在对应平台配置 Redirect URI：

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

---

## 二、Web 应用环境变量

在 `smart-favorites-web` 目录创建 `.env.local`（或 Vercel 环境变量）填入：

```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# AI 相关（按需配置）
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
# 其他 AI 提供商密钥见 .env.local.example

# GitHub（若需同步 Stars）
GITHUB_TOKEN=ghp_...
```

---

## 三、Vercel 部署配置

1. 将 `smart-favorites-web` 目录关联到 Vercel 项目
2. 配置环境变量（同上）
3. 部署后记下域名，如 `https://smart-favorites-web.vercel.app`
4. 在 Supabase Auth → URL Configuration 中设置：
   - **Site URL**：`https://your-app.vercel.app`
   - **Redirect URLs**：`https://your-app.vercel.app/**`

---

## 四、浏览器扩展配置

### 4.1 host_permissions

在 `extension/manifest.json` 中，`host_permissions` 需包含你的 Web 应用域名，例如：

```json
"host_permissions": [
  "https://your-app.vercel.app/*",
  "http://localhost:3000/*",
  "https://*.vercel.app/*"
]
```

### 4.2 首次使用流程

1. 安装扩展（Chrome：扩展管理页 → 开发者模式 → 加载已解压的扩展程序）
2. 点击扩展图标，打开侧边栏
3. 点击右下角齿轮进入设置（或右键图标 → 选项）
4. 在「后端服务地址」填入 Web 地址：
   - 生产：`https://smart-favorites-web.vercel.app`
   - 本地：`http://localhost:3000`
5. 保存后，在「云端登录」中：
   - **推荐**：点击「通过 Web 端登录」→ 在 Web 端登录 → 完成后自动连接扩展
   - **或**：在 Web 设置页「生成扩展 Token」→ 复制 Token → 粘贴到扩展「手动粘贴 API Token」

### 4.3 登录与数据同步

- 扩展与 Web 使用同一 Supabase 账号
- 登录后：书签、个人资料、聊天会话等自动与 Web 端同步
- 扩展侧边栏顶部用户区域：显示头像、昵称，点击可打开 Web 个人资料页

---

## 五、检查清单

部署前请确认：

- [ ] 所有数据库迁移已执行
- [ ] `avatars`、`square_media` Storage bucket 已创建
- [ ] Supabase Auth 提供方已启用
- [ ] Web 环境变量已配置
- [ ] Supabase URL Configuration 中 Site URL、Redirect URLs 正确
- [ ] 扩展 `host_permissions` 包含 Web 域名
- [ ] 首次使用时扩展「后端服务地址」指向正确 Web URL

---

## 六、常见问题

**Q：扩展显示「未连接」**
- 检查 backendUrl 是否指向正确的 Web 地址
- 确认已登录（点击用户区域完成登录）

**Q：扩展登录后仍提示 token 无效**
- Supabase JWT 有效期为 1 小时，过期需重新点击「通过 Web 端登录」
- 或使用「生成扩展 Token」方式（Token 长期有效）

**Q：Storage 上传失败**
- 检查 bucket 名称与权限是否与代码一致
- 确认 RLS 策略允许当前用户写入
