# Smart Favorites Browser Extension

Edge/Chrome 浏览器插件

## 安装方法

### 开发模式安装

1. 打开浏览器扩展管理页面
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`

2. 开启「开发人员模式」

3. 点击「加载解压缩的扩展」

4. 选择 `extension` 目录

### 使用说明

1. 确保后端服务已启动 (http://localhost:8000)
2. 点击插件图标打开弹出窗口
3. 在「同步」标签页点击「同步收藏夹」导入书签
4. 使用「搜索」进行语义搜索
5. 使用「问答」与 AI 对话

## 目录结构

```
extension/
├── manifest.json      # 插件配置 (Manifest V3)
├── popup/            # 弹出窗口
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/       # Service Worker
│   └── background.js
├── options/          # 设置页面
│   └── options.html
└── icons/            # 插件图标
```

## 功能

- 🔍 语义搜索收藏夹
- 💬 AI 智能问答
- 🔄 一键同步书签
- 📤 导出书签
- 📥 导入书签 HTML
- ⚙️ 配置 AI 模型

## 权限说明

- `bookmarks`: 读取浏览器收藏夹
- `storage`: 保存设置
- `activeTab`: 当前标签页操作
