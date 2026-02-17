# 🎯 从这里开始

欢迎使用 Smart Favorites Web 应用！

## 📖 你应该先看哪个文档？

### 如果你想快速部署（推荐）

👉 **[QUICK_START.md](QUICK_START.md)** - 5 分钟快速部署指南

这个文档会带你完成：
1. 创建 Supabase 项目
2. 配置环境变量
3. 部署到 Vercel
4. 配置浏览器插件

### 如果你想了解完整细节

👉 **[DEPLOYMENT.md](DEPLOYMENT.md)** - 详细部署指南

包含：
- 详细的步骤说明
- 故障排除指南
- 性能优化建议
- 安全最佳实践

### 如果你想了解项目功能

👉 **[FEATURES.md](FEATURES.md)** - 功能完整说明

了解：
- 所有功能详解
- 使用技巧
- 最佳实践
- 扩展能力

### 如果你在部署过程中

👉 **[CHECKLIST.md](CHECKLIST.md)** - 部署检查清单

确保：
- 不遗漏任何步骤
- 配置正确完整
- 功能验证通过

---

## 🚀 快速开始（3 步）

### 1. 创建 Supabase 项目

访问 https://supabase.com → 创建项目 → 运行 SQL 迁移

### 2. 配置环境

```bash
cp .env.local.example .env.local
# 填写 Supabase 和 AI Provider 信息
```

### 3. 部署

```bash
npm install
npm run dev        # 本地测试
vercel --prod      # 生产部署
```

---

## 📁 项目结构速览

```
smart-favorites-web/
├── app/            # 页面和 API
├── components/     # UI 组件
├── lib/            # 核心逻辑
├── supabase/       # 数据库配置
└── types/          # 类型定义
```

---

## 🆘 需要帮助？

1. 查看 **QUICK_START.md** 快速开始
2. 查看 **DEPLOYMENT.md** 故障排除章节
3. 检查 Vercel 和 Supabase 日志
4. 查看浏览器控制台错误

---

**准备好了吗？打开 QUICK_START.md 开始部署！** 🎉
