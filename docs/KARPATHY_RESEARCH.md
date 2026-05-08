# Karpathy LLM-wiki 设计思想研究

**研究日期**: 2026-05-08  
**研究来源**: Andrej Karpathy 的 LLM-wiki 概念  
**文档用途**: 为 Smart Favorites 知识库设计提供参考

---

## 📖 LLM-wiki 核心概念

### 什么是 LLM-wiki

LLM-wiki 是由 Andrej Karpathy 提出的一个概念，指的是**以大语言模型为核心的个人知识库系统**，它不同于传统 wiki 的主要特点：

1. **AI驱动的组织** - 文件和知识自动分类、标签化
2. **语义理解** - 系统理解内容含义，而非仅关键词匹配
3. **多模态** - 支持文本、图像、代码、数据等多种格式
4. **个人化** - 为个人学习和研究优化

### 设计原则

```
LLM-wiki 设计三角
    ↙️        ↘️
可发现性   可检索性
    ↘️        ↙️
   可共享性
```

**三个核心支柱**：

1. **可发现性 (Discoverability)**
   - 问题：用户如何找到相关信息？
   - 解决：
     - 自动分类和标签
     - 语义相似性推荐
     - 关联知识提示
     - 知识图谱可视化
   
2. **可检索性 (Retrievability)**
   - 问题：如何快速准确地查找所需内容？
   - 解决：
     - 全文搜索 + 语义搜索
     - 多维度过滤（时间、类型、作者等）
     - 搜索结果排序优化
     - 搜索历史和收藏

3. **可共享性 (Shareability)**
   - 问题：如何与他人协作和分享知识？
   - 解决：
     - 公开/私密权限控制
     - 评论和注释系统
     - 协作编辑功能
     - 版本控制和历史
     - 引用和出处追踪

---

## 🏗️ 系统架构层次

### 数据层 (Data Layer)

```
原始资料来源
├── 本地文件 (PDF, Markdown, Office)
├── 网页内容 (HTML snapshots)
├── GitHub 项目 (Stars, Repos)
├── 笔记应用 (Notion, Obsidian)
└── API 数据源

        ↓ (导入 & 处理)

知识数据库
├── 结构化数据 (元数据、标签)
├── 非结构化数据 (全文)
├── 向量表示 (embeddings)
└── 关联关系 (knowledge graph)
```

### 处理层 (Processing Layer)

```
输入 → 解析 → 分块 → 向量化 → 索引 → 输出
      ↓       ↓       ↓       ↓       ↓
   提取    分段    语义      搜索   检索
   元数据  组织    理解      排序   排名
```

### 检索层 (Retrieval Layer)

```
用户查询
   ↓
1. 查询理解 (消歧、扩展)
   ↓
2. 多路检索 (向量 + 关键词 + 过滤)
   ↓
3. 结果融合 (RRF)
   ↓
4. 排序重排 (相关性、新鲜度)
   ↓
5. 结果呈现 (聚类、分组)
```

### 生成层 (Generation Layer)

```
LLM
├── 上下文构建 (Context Building)
│   ├── 选择相关源文档
│   ├── 生成摘要
│   └── 构建引用
│
├── 响应生成 (Response Generation)
│   ├── 回答用户问题
│   ├── 标注来源
│   └── 提供证据链
│
└── 知识增强 (Knowledge Enrichment)
    ├── 自动生成标签
    ├── 提取关键概念
    └── 建立关联
```

---

## 💡 Smart Favorites 可借鉴的设计

### 1. 文件组织 (File Organization)

**LLM-wiki 的做法**:
```
用户上传文件 → AI 分析 → 自动分类
                    ↓
                提示用户确认
                    ↓
                存入对应知识库
                    ↓
                生成索引和摘要
```

**Smart Favorites 应用**:
```
Phase 1 文件系统中：
- 上传时自动提取标题和摘要
- AI 建议分类和标签
- 支持用户手动调整
- 自动关联相似文档
```

**实现**:
```typescript
interface DocumentAutoEnrichment {
  extractedTitle: string;          // 自动提取的标题
  suggestedTags: string[];         // 建议标签
  suggestedCategory: string;       // 建议分类
  autoSummary: string;             // AI 生成的摘要
  relatedDocuments: string[];      // 关联文档 ID
  keywordsList: string[];          // 关键词列表
}

// 用户可以接受/拒绝建议，系统学习用户偏好
```

### 2. 知识图谱 (Knowledge Graph)

**LLM-wiki 的做法**:
```
文档内容 → 提取实体和关系 → 建立知识图谱
              ↓                    ↓
        什么是谁？谁认识谁？   可视化展示
                                  ↓
                            用户浏览关联知识
```

**Smart Favorites 应用**:

Phase 2 RAG 增强中添加：
```typescript
interface KnowledgeEntity {
  id: string;
  type: 'person' | 'concept' | 'project' | 'technology';
  name: string;
  description: string;
  mentions: number;          // 被提及次数
  linkedEntities: string[];  // 关联实体 ID
}

interface KnowledgeRelation {
  fromEntity: string;
  toEntity: string;
  type: 'related' | 'cites' | 'implements' | 'extends';
  strength: number;  // 关系强度 (0-1)
}
```

### 3. 版本控制与协作 (Version Control & Collaboration)

**LLM-wiki 的做法**:
```
文档版本 → Git-like 版本控制 → 变更追踪
                          ↓
                      多人编辑
                          ↓
                      冲突解决
```

**Smart Favorites 应用**:

Phase 3 可扩展功能：
```sql
-- 文档版本表
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  version_number INTEGER,
  content TEXT,
  changed_by UUID,
  changed_at TIMESTAMP,
  change_summary TEXT,
  
  UNIQUE(document_id, version_number)
);

-- 变更记录
CREATE TABLE document_changes (
  id UUID PRIMARY KEY,
  from_version INTEGER,
  to_version INTEGER,
  diff TEXT,          -- Markdown 格式的变更
  change_type: 'add' | 'modify' | 'delete',
  timestamp TIMESTAMP
);
```

### 4. 搜索体验 (Search Experience)

**LLM-wiki 的做法**:
```
查询 → 拆分意图 → 多路检索 → 结果聚类 → 展示
      ↓         ↓          ↓         ↓
   理解背景   精确+模糊+语义  按主题    相关性排序
```

**Smart Favorites 应用**:

Phase 2 中实现高级搜索：
```typescript
interface AdvancedSearchQuery {
  // 基本查询
  query: string;
  
  // 过滤器
  filters: {
    type?: 'bookmark' | 'document' | 'star';
    tags?: string[];              // AND 关系
    dateRange?: [Date, Date];
    sources?: string[];           // 限定来源
  };
  
  // 搜索策略
  strategy: {
    semantic: boolean;            // 语义搜索
    keyword: boolean;             // 关键词搜索
    fuzziness: 0 | 1 | 2;        // 模糊程度
  };
  
  // 结果聚类
  clustering?: {
    enabled: boolean;
    field: 'type' | 'tag' | 'date' | 'source';
  };
}

interface SearchResult {
  items: SearchItem[];
  clusters?: ResultCluster[];
  suggestedQueries?: string[];   // 相关搜索建议
  nextPages?: number;            // 分页信息
}
```

---

## 🔍 关键 AI 技术应用

### 1. 自动标签生成 (Auto-tagging)

```
文档内容
   ↓
LLM 分析
   ↓
提取关键概念 → 生成标签 → 评分排序
                     ↓
                提示用户确认
                     ↓
                保存标签到数据库
```

**实现**:
```typescript
async function autoTagDocument(content: string): Promise<{
  tags: Array<{ text: string; confidence: number }>;
  category: string;
  keywords: string[];
}> {
  const prompt = `分析以下文档内容，提取：
1. 3-5 个最相关的标签 (confidence 0-1)
2. 1 个主分类
3. 5 个关键词

文档内容：
${content.slice(0, 2000)}...

返回 JSON 格式`;

  const response = await llm.generate(prompt);
  return JSON.parse(response);
}
```

### 2. 自动摘要生成 (Auto-summarization)

```
长文档
   ↓
LLM 生成多级摘要
   ├─ 一句话摘要 (Headline)
   ├─ 短摘要 (Summary - 50-100词)
   ├─ 长摘要 (Abstract - 200-300词)
   └─ 章节摘要 (Section summaries)
   
   ↓
存储到数据库，用于快速预览
```

**实现**:
```typescript
interface DocumentSummaries {
  headline: string;         // 一句话
  shortSummary: string;     // 50-100 词
  abstractSummary: string;  // 200-300 词
  keyPoints: string[];      // 3-5 个关键点
  sectionSummaries: Record<string, string>;  // 章节摘要
}

async function generateSummaries(
  content: string,
  sections?: string[]
): Promise<DocumentSummaries> {
  // 调用 LLM 生成不同级别的摘要
  // 优先使用快速的小模型
}
```

### 3. 关联推荐 (Related Content Recommendation)

```
查看文档 A
   ↓
提取向量表示
   ↓
余弦相似度搜索
   ↓
返回相似文档 B, C, D
   ↓
显示在侧边栏 "Related Content"
```

**实现**:
```typescript
async function getRelatedDocuments(
  documentId: string,
  topK: number = 5
): Promise<Array<{
  id: string;
  title: string;
  similarity: number;
  reason: string;  // 为什么相关
}>> {
  // 1. 获取文档向量
  // 2. 搜索相似向量
  // 3. 生成"为什么相关"的解释
}
```

---

## 📊 数据流设计参考

### 文档生命周期

```
1. 导入 (Import)
   用户上传 → 病毒扫描 → 格式检查 → 存储

2. 处理 (Processing)
   提取 → 清洗 → 分块 → 向量化 → 索引

3. 丰富 (Enrichment)
   自动标签 → 生成摘要 → 提取实体 → 建立关联

4. 访问 (Access)
   搜索 → 检索 → 排序 → 展示

5. 协作 (Collaboration)
   注释 → 讨论 → 分享 → 版本控制

6. 归档 (Archive)
   标记已读 → 分类整理 → 定期备份
```

### 搜索流程详解

```
用户输入 "什么是向量数据库？"
   ↓
1️⃣ 查询预处理
   - 拼写检查
   - 同义词扩展 (vector DB ≈ vector database)
   - 去除停用词

   ↓
2️⃣ 多路并行检索
   - 向量搜索 (embedding 相似度)
   - 关键词搜索 (全文索引)
   - 实体搜索 (命名实体识别)
   
   ↓
3️⃣ 结果融合 (RRF)
   - 各路排名融合
   - 去重处理
   - 相关性重排序

   ↓
4️⃣ 结果增强
   - 提取摘要片段
   - 高亮关键词
   - 添加来源信息
   
   ↓
5️⃣ 结果呈现
   - 分组聚类
   - 多样性排序
   - 下一页链接

用户得到结果 + 相关搜索建议 + 过滤器
```

---

## 🎯 Smart Favorites 的融合点

### 设计对标

| 方面 | LLM-wiki | Smart Favorites 目标 |
|------|---------|-------------------|
| 文件组织 | 自动分类 | ✅ Phase 1 自动标签 + 分类建议 |
| 知识图谱 | 实体关联 | ✅ Phase 2 关联推荐 |
| 搜索体验 | 多维检索 | ✅ Phase 2 混合搜索 + RRF |
| 协作工具 | 版本控制 | ⏳ Phase 3+ 扩展功能 |
| AI 增强 | 摘要/提取 | ✅ Phase 2 AI 摘要 + 提取 |
| 插件系统 | 第三方扩展 | ✅ Phase 3 NPM 插件 |

### 优先级排序

```
高优先级 (必做)
├─ 多格式文件支持 (PDF, Markdown, etc)
├─ 自动标签和分类
└─ 统一搜索层 + 混合检索

中优先级 (应做)
├─ 知识关联推荐
├─ 自动摘要生成
└─ 版本控制

低优先级 (可做)
├─ 知识图谱可视化
├─ 多人协作编辑
└─ 高级权限管理
```

---

## 📚 应用到代码的具体建议

### 1. 数据库设计中的知识图

```sql
-- 实体表
CREATE TABLE knowledge_entities (
  id UUID PRIMARY KEY,
  document_id UUID,
  entity_type VARCHAR(50),      -- person, concept, tool, etc
  entity_text VARCHAR(255),
  embedding vector(384),
  created_at TIMESTAMP
);

-- 关系表
CREATE TABLE knowledge_relations (
  id UUID PRIMARY KEY,
  source_entity_id UUID,
  target_entity_id UUID,
  relation_type VARCHAR(50),    -- related_to, cites, implements
  strength FLOAT,
  created_at TIMESTAMP
);

-- 快速查找相关内容
CREATE INDEX idx_entities_embedding 
  ON knowledge_entities 
  USING ivfflat (embedding vector_cosine_ops);
```

### 2. RAG 提示词优化

```typescript
// 包含关联文档和来源
const enhancedRAGPrompt = `
用户问题：${question}

相关资料：
${relatedDocuments.map(doc => `
【来自 ${doc.source}】
标题: ${doc.title}
内容: ${doc.excerpt}
相关度: ${doc.similarity}%
`).join('\n')}

请基于上述资料回答问题，并标注来源。
如果资料不足，请说明。
`;
```

### 3. 搜索结果聚类

```typescript
interface SearchResultsWithClusters {
  clusters: Array<{
    name: string;           // 聚类名称 (如 "学术论文", "教程")
    items: SearchResult[];  // 该聚类中的结果
    count: number;
  }>;
  
  suggestedFilters: Array<{
    name: string;
    type: 'tag' | 'type' | 'source';
    count: number;
  }>;
}
```

---

## 🔑 核心洞察总结

1. **自动化优于手动** - 标签、分类、摘要应尽量自动生成
2. **多维检索很关键** - 关键词 + 语义 + 过滤的融合很重要
3. **文档关联很有价值** - 推荐相关文档提升用户体验
4. **摘要很节省成本** - 摘要可加速搜索和浏览
5. **版本控制很必要** - 追踪变更便于协作

---

## 📝 下一步行动

- ✅ 文件解析库调研
- ✅ 数据库 Schema 设计
- ✅ AI 工具集成方案
- ✅ 创建 MVP 实现方案

**更新时间**: 2026-05-08
