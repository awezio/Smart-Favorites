# Smart Favorites: UI Polish, Profile, Square & Extension Synergy

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 UI 深度打磨（骨架屏、主题切换、空状态）、Dashboard 个人资料编辑页、Steam 风格的「广场」分享功能，以及浏览器扩展与 Web 端联动。

**Architecture:** 采用分阶段实施：Phase 1 UI 打磨（独立，无 DB 变更）；Phase 2 个人资料（新增 profiles 表 + Supabase Storage 头像）；Phase 3 广场（posts + media + ratings 表，Steam 式测评）；Phase 4 扩展与 Web 联动（共享 Supabase 后端、OAuth 登录）。每阶段可独立交付。

**Tech Stack:** Next.js 15, Supabase (Auth, Postgres, Storage), next-themes, DiceBear (头像), Tailwind, Manifest V3 Extension

---

## Phase 1: UI 深度打磨

### Task 1.1: 集成 next-themes 主题切换

**Files:**

- Create: `smart-favorites-web/components/theme-provider.tsx`
- Modify: `smart-favorites-web/app/layout.tsx`
- Create: `smart-favorites-web/components/theme-toggle.tsx`
- Modify: `smart-favorites-web/app/dashboard/layout.tsx`

**Step 1: 创建 ThemeProvider 包装组件**

```tsx
// components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

**Step 2: 在 layout.tsx 包裹 ThemeProvider**

修改 `app/layout.tsx`，在 body 内包裹 `<ThemeProvider>{children}</ThemeProvider>`。

**Step 3: 创建主题切换按钮组件**

`ThemeToggle` 使用 `useTheme` 切换 `light`/`dark`/`system`，带 Sun/Moon/Monitor 图标。

**Step 4: 在 Dashboard 侧边栏或 header 添加主题切换**

在 `dashboard/layout.tsx` 的 header 区域（移动端）或 sidebar 底部区域添加 `<ThemeToggle />`。

**Step 5: Commit**

```bash
git add components/theme-provider.tsx components/theme-toggle.tsx app/layout.tsx app/dashboard/layout.tsx
git commit -m "feat(ui): integrate next-themes with theme toggle"
```

---

### Task 1.2: 创建 Skeleton 组件并应用于列表加载

**Files:**

- Create: `smart-favorites-web/components/ui/skeleton.tsx`
- Modify: `smart-favorites-web/app/dashboard/bookmarks/page.tsx`
- Modify: `smart-favorites-web/app/dashboard/stars/page.tsx`

**Step 1: 添加 shadcn Skeleton 组件**

使用 `npx shadcn@latest add skeleton` 或手动创建：

```tsx
// components/ui/skeleton.tsx
import { cn } from "@/lib/utils";
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
export { Skeleton };
```

**Step 2: 为 Bookmarks 页面添加加载骨架**

当 `loading` 且 `bookmarks.length === 0` 时，渲染 `BookmarkListSkeleton`：卡片式占位，包含 6–8 个 Skeleton 项（标题行、URL 行、描述行）。

**Step 3: 为 Stars 页面添加加载骨架**

同理创建 `StarListSkeleton`，结构与 stars 列表一致。

**Step 4: Commit**

```bash
git add components/ui/skeleton.tsx app/dashboard/bookmarks/page.tsx app/dashboard/stars/page.tsx
git commit -m "feat(ui): add skeleton loading for bookmarks and stars"
```

---

### Task 1.3: 空状态插图与更细腻动画

**Files:**

- Create: `smart-favorites-web/components/empty-state.tsx`
- Modify: `smart-favorites-web/app/dashboard/bookmarks/page.tsx`
- Modify: `smart-favorites-web/app/dashboard/stars/page.tsx`
- Modify: `smart-favorites-web/package.json` (add framer-motion if needed)

**Step 1: 安装 framer-motion（可选，用于入场动画）**

```bash
cd smart-favorites-web && npm install framer-motion
```

**Step 2: 创建 EmptyState 组件**

Props: `icon`, `title`, `description`, `action` (ReactNode)。使用 Lucide 图标（如 Bookmark、Star、Search）、居中布局、可选的 `motion.div` 淡入。

**Step 3: 替换书签/Stars 的空状态**

将 "还没有书签" 等纯文本替换为 `<EmptyState ... />`，使用相应图标和引导文案。

**Step 4: 为列表项添加 hover/transition**

在 Card 上添加 `transition-all duration-200`，hover 时 `shadow-md`。列表项使用 `transition-colors`。

**Step 5: Commit**

```bash
git add components/empty-state.tsx app/dashboard/bookmarks/page.tsx app/dashboard/stars/page.tsx package.json package-lock.json
git commit -m "feat(ui): empty state illustrations and subtle animations"
```

---

## Phase 2: Dashboard 个人资料设置页

### Task 2.1: 创建 profiles 表与 Supabase Storage

**Files:**

- Create: `smart-favorites-web/supabase/migrations/005_create_profiles.sql`
- Modify: `smart-favorites-web/types/supabase.ts` (regenerate after migration)

**Step 1: 编写 migration**

```sql
-- 005_create_profiles.sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  avatar_seed TEXT,  -- for DiceBear, e.g. user_id or custom string
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase Storage bucket for avatars (run in dashboard or add to migration if supported)
-- Create bucket 'avatars' with public read, authenticated write
```

**Step 2: Storage bucket**

在 Supabase Dashboard 创建 `avatars` bucket，policy: 公开读取，仅认证用户可写。

**Step 3: 应用 migration**

```bash
npx supabase db push
# 或 supabase migration up
```

**Step 4: regenerate types**

```bash
npx supabase gen types typescript --project-id <ref> > types/supabase.ts
```

**Step 5: Commit**

```bash
git add supabase/migrations/005_create_profiles.sql types/supabase.ts
git commit -m "feat(db): add profiles table and avatars storage"
```

---

### Task 2.2: 默认头像库与 Profile API

**Files:**

- Create: `smart-favorites-web/lib/avatars.ts`
- Create: `smart-favorites-web/app/api/profile/route.ts`
- Modify: `smart-favorites-web/types/index.ts`

**Step 1: 添加 DiceBear 工具**

```ts
// lib/avatars.ts
// DiceBear API: https://api.dicebear.com/8.x/{style}/svg?seed={seed}
export const AVATAR_STYLES = [
  "adventurer",
  "avataaars",
  "bottts",
  "lorelei",
  "micah",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
] as const;
export function getDiceBearUrl(
  style: string,
  seed: string,
  size = 120,
): string {
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}
```

**Step 2: 创建 profile API**

- `GET /api/profile`：返回当前用户的 profile，若不存在则从 `auth.users` 推断并创建默认 profile
- `PUT /api/profile`：更新 `display_name`, `bio`, `avatar_url`, `avatar_seed`

**Step 3: 添加 Profile 类型**

```ts
export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  updated_at: string;
};
```

**Step 4: Commit**

```bash
git add lib/avatars.ts app/api/profile/route.ts types/index.ts
git commit -m "feat(api): profile API and DiceBear avatar helpers"
```

---

### Task 2.3: Profile 编辑页面 UI

**Files:**

- Create: `smart-favorites-web/app/dashboard/profile/page.tsx`
- Modify: `smart-favorites-web/app/dashboard/layout.tsx` (add nav link)
- Modify: `smart-favorites-web/app/api/profile/route.ts` (add avatar upload to Supabase Storage)

**Step 1: 创建 profile 页面**

- 头像区域：显示当前头像（优先 `avatar_url`，否则 DiceBear `avatar_seed`）
- 头像选择器：网格展示 AVATAR_STYLES，每项显示 DiceBear 预览，点击设为 `avatar_seed`
- 上传自定义头像：file input -> 上传到 Supabase Storage `avatars/{user_id}` -> 更新 `avatar_url`
- 表单：display_name (Input), bio (Textarea)
- 保存按钮调用 `PUT /api/profile`

**Step 2: 在侧边栏添加「个人资料」入口**

在 navItems 中加 `{ href: "/dashboard/profile", icon: User, label: "个人资料" }`。

**Step 3: 实现头像上传**

在 `PUT /api/profile` 中处理 `FormData`，若有 `avatar` 文件则上传到 Storage，返回 public URL 写入 `avatar_url`。

**Step 4: Commit**

```bash
git add app/dashboard/profile/page.tsx app/dashboard/layout.tsx app/api/profile/route.ts
git commit -m "feat(ui): profile edit page with avatar library and upload"
```

---

### Task 2.4: 在布局中显示 Profile 头像/昵称

**Files:**

- Modify: `smart-favorites-web/app/dashboard/layout.tsx`

**Step 1: 从 profile 读取 display_name / avatar_url**

使用 `GET /api/profile` 或直接 Supabase 查询 `profiles`，侧边栏底部用户区域优先显示 `profile.display_name` 和 `profile.avatar_url`，fallback 到 `user_metadata`。

**Step 2: 点击用户区域跳转 profile 页**

将用户信息区域包在 `<Link href="/dashboard/profile">` 中。

**Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat(ui): show profile avatar and name in dashboard"
```

---

## Phase 3: 「广场」分享功能 (Steam 风格)

### Task 3.1: 数据库与 Storage

**Files:**

- Create: `smart-favorites-web/supabase/migrations/006_create_square_posts.sql`
- Supabase Dashboard: 创建 `square_media` bucket

**Step 1: posts 表**

```sql
CREATE TABLE IF NOT EXISTS square_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- 1-5 星
  target_type TEXT,   -- 'bookmark'|'star'|'general'
  target_id UUID,     -- 关联的 bookmark/star id
  target_url TEXT,    -- 分享的目标链接
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS square_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES square_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL,  -- 'image'|'video'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS square_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES square_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,  -- true=有用, false=无用 (Steam 风格)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX square_posts_user_id_idx ON square_posts(user_id);
CREATE INDEX square_posts_created_at_idx ON square_posts(created_at DESC);
CREATE INDEX square_post_media_post_id_idx ON square_post_media(post_id);
CREATE INDEX square_post_votes_post_id_idx ON square_post_votes(post_id);
```

**Step 2: RLS**

- square_posts: 所有人可 SELECT；仅作者可 INSERT/UPDATE/DELETE 自己的
- square_post_media: 同上
- square_post_votes: 所有人可 SELECT；仅认证用户可 INSERT，每人每帖一条

**Step 3: Commit**

```bash
git add supabase/migrations/006_create_square_posts.sql
git commit -m "feat(db): square posts, media, votes schema"
```

---

### Task 3.2: Square API 与类型

**Files:**

- Create: `smart-favorites-web/app/api/square/route.ts` (GET list, POST create)
- Create: `smart-favorites-web/app/api/square/[id]/route.ts` (GET, PUT, DELETE)
- Create: `smart-favorites-web/app/api/square/[id]/vote/route.ts` (POST vote)
- Modify: `smart-favorites-web/types/index.ts`

**Step 1: 类型**

```ts
SquarePost = { id, user_id, title, content, rating, target_type, target_id, target_url, created_at, author?: { display_name, avatar_url }, media?: { url, media_type }[], votes?: { helpful_count, not_helpful_count } }
```

**Step 2: GET /api/square**

分页、排序（最新优先）、可选筛选 target_type。联表 profiles 取 author 信息，聚合 votes。

**Step 3: POST /api/square**

body: title, content, rating?, target_type?, target_id?, target_url?。上传图片/视频到 `square_media`，写入 square_post_media。

**Step 4: POST /api/square/[id]/vote**

body: helpful (boolean)。upsert square_post_votes。

**Step 5: Commit**

```bash
git add app/api/square/ types/index.ts
git commit -m "feat(api): square posts and votes API"
```

---

### Task 3.3: 广场页面 UI

**Files:**

- Create: `smart-favorites-web/app/dashboard/square/page.tsx`
- Create: `smart-favorites-web/components/square/post-card.tsx`
- Create: `smart-favorites-web/components/square/create-post-modal.tsx`
- Modify: `smart-favorites-web/app/dashboard/layout.tsx`

**Step 1: 广场入口**

navItems 加 `{ href: "/dashboard/square", icon: Share2, label: "广场" }`。

**Step 2: 广场列表页**

- 顶部「发布」按钮，打开 CreatePostModal
- 帖子列表：卡片展示 title、content 摘要、rating 星级、作者头像+昵称、有用/无用按钮、图片/视频缩略图
- 分页或无限滚动

**Step 3: CreatePostModal**

- 表单：title, content (Textarea), rating (1-5 星选择), 可选 target_url
- 图片/视频上传：多文件上传到 Storage，预览列表可删除
- 可选「从书签/Stars 选择」：弹出选择器，选中后填充 target_url、target_type、target_id

**Step 4: PostCard 组件**

显示帖子、媒体轮播、投票区、作者信息。点击「有用/无用」调用 vote API。

**Step 5: Commit**

```bash
git add app/dashboard/square/ components/square/
git commit -m "feat(ui): square feed and create post"
```

---

## Phase 4: 浏览器扩展与 Web 端联动

### Task 4.1: 扩展配置与 API 端点

**Files:**

- Modify: `extension/options/options.html`（添加 Web API URL 配置）
- Modify: `extension/options/options.js`（保存 NEXTVERCEL_URL 或自定义 URL）
- Create: `extension/lib/api.js`（封装 fetch 到 Web API）

**Step 1: Options 页面配置**

- 输入框：Web API Base URL（默认 `https://smart-favorites-web.vercel.app` 或环境变量）
- 保存到 `chrome.storage.sync`

**Step 2: api.js**

- `getApiBase()`：从 storage 读取 base URL
- `apiGet(path)`, `apiPost(path, body)` 等，自动附加 Base URL，携带 auth token（若存在）

**Step 3: 更新 manifest host_permissions**

添加 `https://*.vercel.app/*` 或用户配置的域名。

**Step 4: Commit**

```bash
git add extension/options/ extension/lib/
git commit -m "feat(ext): configurable web API URL"
```

---

### Task 4.2: 扩展 OAuth 登录

**Files:**

- Create: `smart-favorites-web/app/auth/extension/route.ts`（生成 one-time token 或 session）
- Modify: `extension/sidepanel/sidepanel.js`（登录流程）
- Modify: `extension/background/background.js`

**Step 1: Web 端「连接扩展」流程**

- 设置页或独立页：显示「在扩展中打开此链接以登录」+ 一次性 token URL
- Token 存入 Redis 或 DB，5 分钟有效，扩展用该 token 换取 session

**Step 2: 扩展登录流程**

- 用户点击「登录」-> 打开 Web 登录页（新 tab）
- Web 登录成功后重定向到 `/auth/extension?token=xxx`
- 该页将 token 通过 `postMessage` 或 URL 传回扩展（需 secure channel）
- 扩展将 token 存入 storage，后续 API 请求带 `Authorization: Bearer <token>`

**Step 3: 简化方案（MVP）**

- 扩展侧边栏显示「请在 Web 端登录后，在设置中复制 API Token」
- Web 设置页增加「生成扩展 Token」按钮，存入 user_settings 或单独 token 表
- 扩展 Options 页支持粘贴 Token，存储后所有请求带此 Token

**Step 4: Commit**

```bash
git add app/auth/extension/ extension/
git commit -m "feat(ext): extension auth via web token"
```

---

### Task 4.3: 扩展与 Web 数据同步

**Files:**

- Modify: `extension/background/background.js`
- Modify: `extension/sidepanel/sidepanel.js`

**Step 1: 书签同步到 Web**

- 当用户点击「同步到云端」时，调用 Web API `POST /api/bookmarks/sync`，传入浏览器 `chrome.bookmarks.getTree()` 导出的 HTML 或 JSON
- 使用与 Web 相同的 sync 逻辑

**Step 2: 从 Web 拉取书签**

- 搜索时优先调用 Web `GET /api/search?q=xxx`，展示结果可跳转到 Web 或直接打开链接
- 若未登录则 fallback 到本地 `chrome.bookmarks` 搜索

**Step 3: 扩展状态与 Web 一致**

- 登录后，书签数量从 Web API 获取
- 主题：扩展可读取 Web 的 theme（通过 API 或 storage 同步），或保持独立设置

**Step 4: Commit**

```bash
git add extension/
git commit -m "feat(ext): sync bookmarks with web backend"
```

---

## Execution Checklist

- [ ] **1.1** next-themes 集成与主题切换
- [ ] **1.2** Skeleton 骨架屏
- [ ] **1.3** 空状态与动画
- [ ] **2.1** profiles 表与 Storage
- [ ] **2.2** 头像库与 Profile API
- [ ] **2.3** Profile 编辑页
- [ ] **2.4** 布局显示 Profile
- [ ] **3.1** Square 数据库
- [ ] **3.2** Square API
- [ ] **3.3** 广场 UI
- [ ] **4.1** 扩展 API 配置
- [ ] **4.2** 扩展登录
- [ ] **4.3** 扩展数据同步

---

## Dependencies to Add

```json
"framer-motion": "^11.x",
"@dicebear/core": "^8.x"  // optional, can use HTTP API only
```

DiceBear 可直接用 URL 无需 npm：`https://api.dicebear.com/8.x/{style}/svg?seed={seed}`
