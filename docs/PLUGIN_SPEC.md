# Smart Favorites 插件规范 v1.0

**版本**: 1.0.0  
**发布日期**: 2026-05-08  
**状态**: 草案 (Phase 1 完成后定稿)  
**应用**: Phase 3 插件生态系统

---

## 📖 概述

Smart Favorites 插件系统允许开发者通过 NPM 包扩展平台功能。插件通过标准的 API 与核心系统交互，在沙箱环境中执行，保证安全性和稳定性。

---

## 🎯 设计目标

1. **易于使用** - 开发者可快速上手
2. **安全隔离** - 插件不能直接访问敏感数据
3. **可组合性** - 多个插件可协作
4. **可扩展性** - 核心 API 设计可向后兼容
5. **社区驱动** - 促进插件生态发展

---

## 📦 插件结构

### NPM 包格式

```
@smart-favorites/example-plugin/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts                   # 主入口
├── dist/
│   └── index.js                   # 编译输出
├── README.md
├── LICENSE
└── plugin.manifest.json           # 插件配置
```

### package.json 必需字段

```json
{
  "name": "@smart-favorites/example-plugin",
  "version": "1.0.0",
  "description": "Example plugin for Smart Favorites",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["smart-favorites", "plugin"],
  "author": "Your Name",
  "license": "MIT",
  
  "smart-favorites": {
    "plugin": true,
    "apiVersion": "^1.0.0",
    "displayName": "Example Plugin",
    "description": "A short description shown in plugin market"
  }
}
```

### plugin.manifest.json (可选但推荐)

```json
{
  "name": "@smart-favorites/example-plugin",
  "version": "1.0.0",
  "minApiVersion": "1.0.0",
  
  "permissions": [
    "knowledge:read",
    "notifications:write"
  ],
  
  "tools": [
    {
      "name": "example_tool",
      "description": "An example tool"
    }
  ],
  
  "hooks": [
    "search:after",
    "chat:before"
  ]
}
```

---

## 🔌 插件接口定义

### SmartFavoritesPlugin 主接口

```typescript
// @smart-favorites/types/index.ts

export interface SmartFavoritesPlugin {
  // 必需字段
  name: string;                             // 包名
  version: string;                          // 语义化版本
  apiVersion: string;                       // 兼容的核心 API 版本
  
  // 可选元数据
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  documentation?: string;
  homepage?: string;
  
  // 权限声明
  permissions?: PluginPermission[];
  
  // 工具定义
  tools?: PluginTool[];
  
  // 生命周期钩子
  onLoad?(api: PluginAPI): Promise<void>;
  onUnload?(api: PluginAPI): Promise<void>;
  onError?(error: Error, api: PluginAPI): Promise<void>;
  
  // 事件钩子
  hooks?: {
    'search:before'?: SearchHook;
    'search:after'?: SearchHook;
    'chat:before'?: ChatHook;
    'chat:after'?: ChatHook;
    'document:uploaded'?: DocumentHook;
    'document:processing'?: DocumentHook;
    'document:completed'?: DocumentHook;
    'document:failed'?: DocumentHook;
  };
}

export type PluginPermission =
  | 'knowledge:read'          // 读取知识库
  | 'knowledge:write'         // 写入知识库（生成摘要等）
  | 'documents:read'          // 读取文档
  | 'documents:write'         // 创建/修改文档
  | 'bookmarks:read'          // 读取书签
  | 'bookmarks:write'         // 创建/修改书签
  | 'settings:read'           // 读取用户设置
  | 'settings:write'          // 修改用户设置
  | 'notifications:write'     // 发送通知
  | 'storage:read'            // 读取插件存储
  | 'storage:write';          // 写入插件存储
```

### PluginAPI 核心接口

```typescript
export interface PluginAPI {
  // ==================== 知识库访问 ====================
  
  /**
   * 搜索知识库（向量 + 关键词混合搜索）
   */
  searchKnowledge(options: {
    query: string;
    topK?: number;
    types?: ('bookmark' | 'document' | 'star')[];
    threshold?: number;
  }): Promise<SearchResult[]>;
  
  /**
   * 获取知识库统计信息
   */
  getKnowledgeStats(): Promise<{
    totalDocuments: number;
    totalBookmarks: number;
    totalChunks: number;
  }>;
  
  // ==================== 文档操作 ====================
  
  /**
   * 获取用户所有文档
   */
  getDocuments(options?: {
    limit?: number;
    offset?: number;
    filter?: { tags?: string[] };
  }): Promise<Document[]>;
  
  /**
   * 获取单个文档详情
   */
  getDocument(documentId: string): Promise<Document | null>;
  
  /**
   * 获取文档的所有 chunks
   */
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  
  /**
   * 上传文档
   */
  uploadDocument(file: File, metadata?: {
    title?: string;
    tags?: string[];
    description?: string;
  }): Promise<{ documentId: string; status: string }>;
  
  /**
   * 更新文档元数据
   */
  updateDocument(documentId: string, updates: {
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<void>;
  
  /**
   * 删除文档
   */
  deleteDocument(documentId: string): Promise<void>;
  
  /**
   * 为文档生成摘要 (需要 knowledge:write 权限)
   */
  generateSummary(documentId: string): Promise<{
    headline: string;
    summary: string;
    keyPoints: string[];
  }>;
  
  // ==================== 书签操作 ====================
  
  /**
   * 获取所有书签
   */
  getBookmarks(options?: { limit?: number }): Promise<Bookmark[]>;
  
  /**
   * 创建书签
   */
  createBookmark(data: {
    url: string;
    title: string;
    description?: string;
    tags?: string[];
    folderPath?: string;
  }): Promise<Bookmark>;
  
  /**
   * 搜索书签
   */
  searchBookmarks(query: string): Promise<Bookmark[]>;
  
  // ==================== 设置管理 ====================
  
  /**
   * 读取用户设置
   */
  getSetting(key: string): Promise<any>;
  
  /**
   * 写入用户设置
   */
  setSetting(key: string, value: any): Promise<void>;
  
  /**
   * 获取所有设置
   */
  getAllSettings(): Promise<Record<string, any>>;
  
  // ==================== 工具注册 ====================
  
  /**
   * 注册工具（供 LLM 调用）
   */
  registerTool(tool: PluginTool): void;
  
  /**
   * 获取已注册的工具列表
   */
  getRegisteredTools(): PluginTool[];
  
  // ==================== 通知系统 ====================
  
  /**
   * 发送通知给用户
   */
  notify(message: string, options?: {
    type?: 'info' | 'success' | 'error' | 'warning';
    duration?: number;
    action?: { label: string; onClick: () => void };
  }): void;
  
  // ==================== 存储系统 ====================
  
  /**
   * 读取插件存储（持久化，每个插件独立）
   */
  getStorage(key: string): Promise<any>;
  
  /**
   * 写入插件存储
   */
  setStorage(key: string, value: any): Promise<void>;
  
  /**
   * 删除存储项
   */
  deleteStorage(key: string): Promise<void>;
  
  /**
   * 列出所有存储键
   */
  listStorageKeys(): Promise<string[]>;
  
  // ==================== 日志系统 ====================
  
  /**
   * 记录日志
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void;
  
  // ==================== 工作流 ====================
  
  /**
   * 延迟执行（用于后台任务）
   */
  scheduleTask(task: () => Promise<void>, delayMs: number): Promise<string>;
  
  /**
   * 取消任务
   */
  cancelTask(taskId: string): Promise<void>;
}
```

### 工具定义接口

```typescript
export interface PluginTool {
  name: string;                               // 工具名称 (蛇形命名)
  description: string;                        // 工具描述
  category?: 'knowledge' | 'document' | 'bookmark' | 'util';
  
  inputSchema: JSONSchema;                    // 输入参数 JSON Schema
  outputSchema?: JSONSchema;                  // 输出结果 JSON Schema
  
  execute(input: Record<string, any>): Promise<any>;
}

// JSONSchema 简化定义
export interface JSONSchema {
  type: string;                               // object, string, number, etc.
  properties: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  items?: JSONSchema;                         // for arrays
  enum?: any[];                               // for enums
}
```

### 钩子接口

```typescript
export type SearchHook = (context: {
  query: string;
  results: SearchResult[];
  api: PluginAPI;
}) => Promise<SearchResult[] | void>;  // 返回修改后的结果，或 void 表示不修改

export type ChatHook = (context: {
  message: string;
  history: ChatMessage[];
  api: PluginAPI;
}) => Promise<{ message?: string; context?: any } | void>;

export type DocumentHook = (context: {
  documentId: string;
  document: Document;
  api: PluginAPI;
}) => Promise<void>;
```

---

## 📝 插件示例

### 示例 1：简单的问候工具

```typescript
// src/index.ts
import { SmartFavoritesPlugin, PluginAPI, PluginTool } from '@smart-favorites/types';

export default {
  name: '@smart-favorites/hello-plugin',
  version: '1.0.0',
  apiVersion: '1.0.0',
  
  permissions: ['notifications:write'],
  
  tools: [
    {
      name: 'greet_user',
      description: '发送个性化问候',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '用户名' }
        },
        required: ['name']
      },
      outputSchema: {
        type: 'object',
        properties: {
          greeting: { type: 'string' }
        }
      },
      async execute(input) {
        return {
          greeting: `Hello, ${input.name}! Welcome to Smart Favorites.`
        };
      }
    }
  ],
  
  async onLoad(api: PluginAPI) {
    console.log('Hello plugin loaded!');
    api.notify('Hello Plugin 已加载', { type: 'success' });
  },
  
  async onUnload(api: PluginAPI) {
    console.log('Hello plugin unloaded');
  }
} as SmartFavoritesPlugin;
```

### 示例 2：论文摘要生成

```typescript
import { SmartFavoritesPlugin, PluginAPI } from '@smart-favorites/types';
import { callLLM } from '@smart-favorites/llm-utils';

export default {
  name: '@smart-favorites/paper-summarizer',
  version: '1.0.0',
  apiVersion: '1.0.0',
  
  permissions: [
    'documents:read',
    'knowledge:write',
    'notifications:write'
  ],
  
  tools: [
    {
      name: 'summarize_paper',
      description: '生成学术论文摘要',
      inputSchema: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: '论文文档 ID'
          },
          style: {
            type: 'string',
            enum: ['concise', 'detailed'],
            description: '摘要风格'
          }
        },
        required: ['documentId']
      },
      async execute(input) {
        // 工具实现
      }
    }
  ],
  
  hooks: {
    'document:uploaded': async (context) => {
      if (context.document.file_type === 'pdf') {
        context.api.notify('正在生成论文摘要...', { type: 'info' });
        
        const summary = await context.api.generateSummary(context.documentId);
        context.api.notify(
          `摘要已生成: ${summary.headline}`,
          { type: 'success' }
        );
      }
    }
  },
  
  async onLoad(api: PluginAPI) {
    api.log('info', 'Paper Summarizer plugin loaded');
  }
} as SmartFavoritesPlugin;
```

### 示例 3：知识库检索增强

```typescript
import { SmartFavoritesPlugin, PluginAPI } from '@smart-favorites/types';

export default {
  name: '@smart-favorites/advanced-search',
  version: '1.0.0',
  apiVersion: '1.0.0',
  
  permissions: ['knowledge:read'],
  
  hooks: {
    'search:after': async (context) => {
      // 在搜索结果返回后，进行后处理
      const results = context.results;
      
      // 按文档类型分组
      const grouped = {
        documents: results.filter(r => r.type === 'document'),
        bookmarks: results.filter(r => r.type === 'bookmark'),
        stars: results.filter(r => r.type === 'star')
      };
      
      // 按相关性重新排序
      return [
        ...grouped.documents,
        ...grouped.bookmarks,
        ...grouped.stars
      ].sort((a, b) => b.similarity - a.similarity);
    }
  },
  
  async onLoad(api: PluginAPI) {
    api.log('info', 'Advanced Search plugin activated');
  }
} as SmartFavoritesPlugin;
```

---

## 🔒 权限和安全

### 权限系统

每个插件必须声明所需权限，用户安装插件时会看到权限列表。未声明的权限会被拒绝。

```typescript
// 权限检查示例
if (!api.hasPermission('documents:write')) {
  throw new Error('This plugin requires documents:write permission');
}
```

### 沙箱隔离

- ✅ 插件在独立的 Web Worker 中执行
- ✅ 无法直接访问 DOM（除了特定 UI 区域）
- ✅ 无法访问用户的其他数据
- ✅ 网络请求受限（只能访问特定的 API 端点）

### 代码审查

社区发布的插件需要经过安全审查：
- [ ] 无恶意代码
- [ ] 权限声明正确
- [ ] 异常处理完善

---

## 🚀 插件发布流程

### 1. 开发阶段

```bash
# 克隆模板
npx create-smart-favorites-plugin my-plugin

# 本地开发
cd my-plugin
npm install
npm run dev

# 本地测试
npm run test
```

### 2. 提交到插件市场

```bash
# 构建
npm run build

# 发布到 NPM
npm publish

# 向 Smart Favorites 插件市场提交
# https://plugins.smart-favorites.dev/submit
```

### 3. 发布检查清单

- [ ] README 完整
- [ ] LICENSE 文件
- [ ] package.json 中有 `smart-favorites` 字段
- [ ] 所有依赖都在 package.json 中
- [ ] 代码已通过 lint 和测试
- [ ] 版本号符合 semver
- [ ] NPM 包已发布

---

## 📊 插件市场 Schema

```sql
CREATE TABLE plugins_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npm_package TEXT UNIQUE NOT NULL,        -- @scope/name
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  
  author TEXT,
  author_url TEXT,
  repository TEXT,
  documentation_url TEXT,
  license TEXT,
  
  tags TEXT[],                             -- 标签，便于搜索
  keywords TEXT[],
  
  downloads BIGINT DEFAULT 0,
  ratings FLOAT DEFAULT 0,
  reviews_count INT DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending',    -- pending | approved | rejected
  review_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plugin_versions (
  id UUID PRIMARY KEY,
  plugin_id UUID NOT NULL REFERENCES plugins_registry(id),
  version TEXT NOT NULL,
  published_at TIMESTAMP,
  tarball_url TEXT,
  UNIQUE(plugin_id, version)
);

CREATE TABLE plugin_reviews (
  id UUID PRIMARY KEY,
  plugin_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INT CHECK(rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plugin_id, user_id)
);
```

---

## 🔄 版本兼容性

### API 版本策略

```
Smart Favorites Core: 1.0.0
Plugin API Version:   1.0.0

Plugin 声明:
  apiVersion: "^1.0.0"   ✅ 兼容 1.0.0 - 1.x.x
  apiVersion: "1.0.0"    ✅ 仅兼容 1.0.0
  apiVersion: "^2.0.0"   ❌ 与 1.0.0 不兼容
```

### 向后兼容性

- 核心 API 增加新方法时，现有插件继续工作
- 核心 API 移除方法时，版本号会升级到 2.0.0
- 插件应该在 `apiVersion` 中明确声明兼容性范围

---

## 📚 开发资源

### 官方模板

- `@smart-favorites/plugin-template` - 基础模板
- `@smart-favorites/plugin-typescript-template` - TypeScript 模板
- `@smart-favorites/plugin-react-template` - React UI 模板

### 开发工具

```bash
# 类型定义
npm install @smart-favorites/types

# LLM 工具函数
npm install @smart-favorites/llm-utils

# 开发 CLI
npm install -g @smart-favorites/plugin-cli

# 创建新插件
sf-plugin create my-plugin
```

### 文档和示例

- [插件开发指南](../PLUGIN_DEVELOPMENT.md)
- [API 参考](../API_REFERENCE.md)
- [示例插件集合](../PLUGIN_EXAMPLES.md)

---

## ✅ 检查清单

### 开发者检查清单

- [ ] 插件声明了所有权限
- [ ] 实现了错误处理
- [ ] 添加了日志便于调试
- [ ] 单元测试覆盖率 > 80%
- [ ] README 文档完整
- [ ] 代码已 lint 通过

### 审核者检查清单

- [ ] 权限声明合理
- [ ] 无恶意代码
- [ ] 异常处理完善
- [ ] 性能可接受
- [ ] 文档清晰

---

## 🔗 相关文档

- `BUILD.md` - Phase 3 插件系统实现计划
- `PLUGIN_DEVELOPMENT.md` - 详细开发教程
- `API_REFERENCE.md` - 完整 API 文档

---

**版本**: 1.0.0 (草案)  
**最后更新**: 2026-05-08  
**下次评审**: Phase 1 完成后
