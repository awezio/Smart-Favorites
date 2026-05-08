# 文件解析库调研与技术选型

**调研日期**: 2026-05-08  
**调研范围**: PDF、Office、文本、HTML 等常见文件格式  
**用途**: 为 Phase 1 文件系统基础选择合适的解析库

---

## 📋 调研总结表

| 格式 | 推荐库 | 优势 | 劣势 | 复杂度 | 成熟度 | 选择 |
|------|--------|------|------|--------|---------|------|
| **PDF** | pdfjs-dist | 浏览器支持、无依赖 | 文本提取不完美 | 中 | ⭐⭐⭐⭐⭐ | ✅ |
| **DOCX** | mammoth | 保留格式、易用 | 功能有限 | 低 | ⭐⭐⭐⭐ | ✅ |
| **XLSX** | xlsx | 轻量、功能全 | 复杂格式支持一般 | 低 | ⭐⭐⭐⭐⭐ | ✅ |
| **TXT** | 原生 | 无需库 | - | 低 | - | ✅ |
| **MD** | 原生/remark | 简单/功能全 | - | 低 | ⭐⭐⭐⭐⭐ | ✅ |
| **HTML** | cheerio | 快速、轻量 | 渲染不支持 | 低 | ⭐⭐⭐⭐⭐ | ✅ |
| **PPTX** | pptx-parser | 可行 | 成熟度低 | 中 | ⭐⭐⭐ | ⏳ |

**总体建议**: Phase 1 优先支持 PDF/DOCX/XLSX/TXT/HTML (✅)，PPTX 延期到 Phase 2

---

## 🔍 详细库对比

### 1. PDF 解析

#### 选项 A: pdfjs-dist （推荐）

**特点**:
- Mozilla 官方 PDF 库
- 支持浏览器和 Node.js
- 无系统依赖
- 支持高级功能（文本提取、注释等）

**使用场景**:
- 浏览器端快速解析（Web Worker）
- Vercel Edge Functions
- Node.js 后端

**示例代码**:
```javascript
import * as pdfjsLib from 'pdfjs-dist';

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  
  return text;
}
```

**优点**:
- ✅ 浏览器原生支持
- ✅ 无外部依赖
- ✅ 性能好
- ✅ 活跃维护
- ✅ 支持流式处理

**缺点**:
- ❌ 文本提取可能不完美（某些 PDF 格式）
- ❌ 无法识别图表和表格内容
- ❌ 库文件较大 (~9MB)

**包大小**: ~9MB  
**npm 包**: `pdfjs-dist`  
**维护状态**: ✅ 活跃  
**推荐指数**: ⭐⭐⭐⭐⭐

---

#### 选项 B: pdfparse

**特点**:
- Node.js 专用
- 基于 PDFKit 的文本提取
- 轻量级

**示例代码**:
```javascript
import pdf from 'pdf-parse';

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}
```

**优点**:
- ✅ 轻量级
- ✅ 快速

**缺点**:
- ❌ 不支持浏览器
- ❌ 维护不活跃
- ❌ 文本提取能力有限

**推荐指数**: ⭐⭐⭐

---

**决策**: 使用 **pdfjs-dist** (Node.js + Browser)

---

### 2. DOCX 解析

#### 选项 A: mammoth （推荐）

**特点**:
- 专为 DOCX 设计
- 保留基本格式（粗体、斜体、标题等）
- 转换为 HTML 或纯文本

**使用场景**:
- 提取 DOCX 文本内容
- 保留文档结构信息

**示例代码**:
```javascript
import mammoth from 'mammoth';

async function extractDocxText(file: File): Promise<{
  text: string;
  html: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  // 提取纯文本
  const textResult = await mammoth.extractRawText({ 
    arrayBuffer 
  });
  
  // 提取 HTML 格式
  const htmlResult = await mammoth.convertToHtml({ 
    arrayBuffer 
  });
  
  return {
    text: textResult.value,
    html: htmlResult.value
  };
}
```

**优点**:
- ✅ 专为 DOCX 设计
- ✅ 易用 API
- ✅ 保留格式信息
- ✅ 轻量级
- ✅ 浏览器 + Node.js 支持

**缺点**:
- ❌ 功能限制（表格、图片支持有限）
- ❌ 复杂文档可能丢失信息

**包大小**: ~50KB  
**npm 包**: `mammoth`  
**推荐指数**: ⭐⭐⭐⭐⭐

---

#### 选项 B: python-docx (后端)

**特点**:
- Python 专用
- 更完整的 DOCX 支持

**推荐指数**: ⭐⭐⭐⭐ (如需自托管后端)

---

**决策**: 使用 **mammoth** (Browser + Node.js)

---

### 3. Excel 解析

#### 选项 A: xlsx （推荐）

**特点**:
- 轻量级、功能完整
- 支持所有 Excel 格式 (.xls, .xlsx, .xlsm)
- 浏览器 + Node.js

**使用场景**:
- 逐行解析 Excel 内容
- 支持多 Sheet 处理

**示例代码**:
```javascript
import XLSX from 'xlsx';

async function extractExcelContent(file: File): Promise<Array<{
  sheet: string;
  rows: Record<string, any>[];
}>> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const results = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    results.push({ sheet: sheetName, rows });
  }
  
  return results;
}
```

**优点**:
- ✅ 轻量级 (~200KB)
- ✅ 功能完整
- ✅ 浏览器 + Node.js
- ✅ 活跃维护
- ✅ 高性能

**缺点**:
- ❌ 公式计算需要额外处理
- ❌ 复杂格式支持有限

**包大小**: ~200KB  
**npm 包**: `xlsx`  
**推荐指数**: ⭐⭐⭐⭐⭐

---

**决策**: 使用 **xlsx**

---

### 4. HTML 解析

#### 选项 A: cheerio （推荐）

**特点**:
- jQuery 风格 API
- 快速、轻量
- 非浏览器渲染（不执行 JS）

**使用场景**:
- 解析网页快照 (.html)
- 提取文本和结构

**示例代码**:
```javascript
import cheerio from 'cheerio';

async function extractHtmlText(html: string): Promise<{
  text: string;
  title: string;
  headings: string[];
}> {
  const $ = cheerio.load(html);
  
  // 移除脚本和样式
  $('script, style, noscript').remove();
  
  // 提取文本
  const text = $('body').text().trim();
  
  // 提取标题
  const title = $('h1').first().text();
  
  // 提取所有标题
  const headings = $('h1, h2, h3')
    .map((_, el) => $(el).text())
    .get();
  
  return { text, title, headings };
}
```

**优点**:
- ✅ 轻量级 (~50KB)
- ✅ 快速
- ✅ 熟悉的 jQuery 风格 API
- ✅ 浏览器 + Node.js

**缺点**:
- ❌ 不执行 JavaScript（SPA 不支持）
- ❌ 复杂 CSS 不支持

**包大小**: ~50KB  
**npm 包**: `cheerio`  
**推荐指数**: ⭐⭐⭐⭐⭐

---

**决策**: 使用 **cheerio**

---

### 5. 文本和 Markdown

#### 纯文本 (.txt)

```javascript
async function extractTextFile(file: File): Promise<string> {
  return await file.text();
}
```

#### Markdown (.md)

**方案 A**: 直接作为文本（推荐 Phase 1）

```javascript
async function extractMarkdown(file: File): Promise<{
  text: string;
  headings: string[];
}> {
  const content = await file.text();
  
  // 提取标题
  const headings = content
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => line.replace(/^#+\s*/, ''));
  
  return { text: content, headings };
}
```

**方案 B**: 使用 remark + rehype (Phase 2 扩展)

```javascript
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkStringify);

// 解析和处理 Markdown AST
const ast = processor.parse(markdown);
```

**决策**: Phase 1 使用原生方案，Phase 2 考虑 remark

---

### 6. PPTX 解析 (延期)

#### 选项: pptx-parser

**特点**:
- PowerPoint 文件解析
- 提取文本和基本结构

**状态**: ⏳ 延期到 Phase 2 (成熟度低，复杂度高)

---

## 🏗️ 文件解析架构设计

### 总体设计

```
用户上传文件
        ↓
文件类型检测 (magic number)
        ↓
选择对应解析器
        ↓
执行解析
        ↓
错误处理和验证
        ↓
返回结构化内容
```

### 解析器接口规范

```typescript
// lib/file-parsers/types.ts

export interface ParsedDocument {
  title: string;                    // 文档标题
  content: string;                  // 完整文本内容
  html?: string;                    // HTML 格式 (可选)
  structure: DocumentStructure;     // 文档结构
  metadata: DocumentMetadata;       // 元数据
  chunks: DocumentChunk[];          // 预分块结果
}

export interface DocumentStructure {
  headings: string[];               // 所有标题
  sections: Section[];              // 章节信息
  hasTable: boolean;
  hasImage: boolean;
  hasCode: boolean;
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount: number;
  charCount: number;
  language?: string;
  encoding?: string;
  author?: string;
  created?: Date;
  modified?: Date;
}

export interface Section {
  level: number;                    // 标题级别 (1-6 for h1-h6)
  title: string;
  content: string;
  startPage?: number;
  endPage?: number;
}

export interface DocumentChunk {
  content: string;
  pageNumber?: number;
  sectionTitle?: string;
  index: number;
}

// 统一的解析接口
export interface FileParser {
  canParse(fileType: string): boolean;
  parse(file: File): Promise<ParsedDocument>;
}
```

### 错误处理策略

```typescript
export class FileParsingError extends Error {
  constructor(
    public code: 'UNSUPPORTED_FORMAT' | 'CORRUPTED_FILE' | 'TOO_LARGE' | 'PARSE_ERROR',
    public details: string
  ) {
    super(`File parsing failed: ${code}`);
  }
}

// 调用方处理
try {
  const parsed = await parseDocument(file, fileType);
  // 成功
} catch (error) {
  if (error instanceof FileParsingError) {
    if (error.code === 'UNSUPPORTED_FORMAT') {
      // 不支持的格式
    } else if (error.code === 'CORRUPTED_FILE') {
      // 文件损坏
    }
  }
}
```

---

## 📦 包大小和性能对比

| 库 | 包大小 | 压缩后 | 处理速度 | 内存占用 |
|----|--------|--------|---------|---------|
| pdfjs-dist | 9 MB | 3 MB | 中等 | 高 |
| mammoth | 50 KB | 20 KB | 快速 | 低 |
| xlsx | 200 KB | 70 KB | 快速 | 低 |
| cheerio | 50 KB | 20 KB | 快速 | 低 |

**建议**: 在 Vercel 中分离加载这些库（使用 dynamic import），避免首屏加载完整 9MB

```typescript
// 只在需要时加载
const { default: pdfjsLib } = await import('pdfjs-dist');
```

---

## 🔄 文本分块策略

### 分块算法

```typescript
export function splitIntoChunks(
  text: string,
  options: {
    chunkSize?: number;            // 目标 token 数 (default: 800)
    overlapSize?: number;          // 重叠 token 数 (default: 200)
    separator?: string;            // 分割符 (default: '\n\n')
  } = {}
): string[] {
  const {
    chunkSize = 800,
    overlapSize = 200,
    separator = '\n\n'
  } = options;
  
  // 1. 按段落分割 (separator)
  const paragraphs = text.split(separator);
  
  // 2. 递归合并到 chunkSize
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const para of paragraphs) {
    const tokens = estimateTokens(currentChunk + para);
    
    if (tokens > chunkSize) {
      // 当前 chunk 已满，保存并创建新 chunk
      chunks.push(currentChunk);
      
      // 新 chunk 包含重叠部分
      const overlapTokens = estimateTokens(currentChunk) - overlapSize;
      currentChunk = currentChunk.slice(overlapTokens) + para;
    } else {
      currentChunk += (currentChunk ? separator : '') + para;
    }
  }
  
  // 保存最后一个 chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Token 估算 (粗略: 汉字 1 token, 英文单词 1 token)
function estimateTokens(text: string): number {
  const words = text.match(/[\w\u4e00-\u9fa5]+/g) || [];
  return words.length;
}
```

### 分块参数推荐

| 场景 | chunkSize | overlap | 说明 |
|------|-----------|---------|------|
| **精细检索** | 500 | 150 | 更多小片段，重复率高 |
| **标准** | 800 | 200 | 平衡检索质量和成本 |
| **粗粒度** | 1500 | 300 | 更少片段，但可能遗漏内容 |

**推荐**: 使用 800/200 作为默认

---

## 🧪 测试用例

### 测试文件库

```
test-files/
├── sample.pdf              # 多页 PDF
├── sample-with-image.pdf   # 包含图片的 PDF
├── sample.docx             # 标准 DOCX
├── sample-complex.docx     # 包含表格的 DOCX
├── sample.xlsx             # Excel 文件
├── sample.txt              # 纯文本
├── sample.md               # Markdown
├── sample.html             # HTML 快照
├── corrupted.pdf           # 损坏的文件
└── huge.pdf                # 大文件 (100MB+)
```

### 单元测试框架

```typescript
describe('File Parsers', () => {
  describe('PDF Parser', () => {
    it('should extract text from simple PDF', async () => {
      const file = new File(
        [await fs.readFile('test-files/sample.pdf')],
        'sample.pdf',
        { type: 'application/pdf' }
      );
      
      const result = await parsePdf(file);
      expect(result.content).toBeTruthy();
      expect(result.metadata.pageCount).toBeGreaterThan(0);
    });
    
    it('should handle corrupted PDF gracefully', async () => {
      const file = new File(
        [await fs.readFile('test-files/corrupted.pdf')],
        'corrupted.pdf',
        { type: 'application/pdf' }
      );
      
      await expect(parsePdf(file)).rejects.toThrow(FileParsingError);
    });
  });
});
```

---

## 💡 性能优化建议

### 1. Web Worker 处理

```javascript
// 在 Web Worker 中处理大文件，避免阻塞 UI
// worker.ts
self.onmessage = async (event) => {
  const { file, fileType } = event.data;
  const result = await parseDocument(file, fileType);
  self.postMessage(result);
};
```

### 2. 流式处理

```javascript
// 对于大文件，流式处理并分块发送
async function* parseLargeFile(file: File) {
  const buffer = await file.arrayBuffer();
  const chunkSize = 1024 * 1024; // 1MB chunks
  
  for (let i = 0; i < buffer.byteLength; i += chunkSize) {
    yield buffer.slice(i, i + chunkSize);
  }
}
```

### 3. 缓存优化

```typescript
// 缓存解析结果，避免重复解析
const parseCache = new Map<string, ParsedDocument>();

async function parseWithCache(
  file: File,
  fileType: string
): Promise<ParsedDocument> {
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  
  if (parseCache.has(key)) {
    return parseCache.get(key)!;
  }
  
  const result = await parseDocument(file, fileType);
  parseCache.set(key, result);
  return result;
}
```

---

## 📝 实现计划

### Week 1-2: 基础库集成

- [ ] 集成 pdfjs-dist
- [ ] 集成 mammoth
- [ ] 集成 xlsx
- [ ] 集成 cheerio
- [ ] 实现统一接口

### Week 2-3: 高级功能

- [ ] 文本分块算法
- [ ] 元数据提取
- [ ] 错误处理
- [ ] 单元测试

### Week 3: 优化

- [ ] Web Worker 支持
- [ ] 缓存机制
- [ ] 性能测试
- [ ] 文档完善

---

## ✅ 最终决策总结

| 格式 | 选中库 | 原因 | 状态 |
|------|--------|------|------|
| PDF | pdfjs-dist | 浏览器支持、活跃维护 | ✅ Phase 1 |
| DOCX | mammoth | 轻量、易用 | ✅ Phase 1 |
| XLSX | xlsx | 轻量、功能完整 | ✅ Phase 1 |
| TXT | 原生 | 无需库 | ✅ Phase 1 |
| MD | 原生 | 无需库 | ✅ Phase 1 |
| HTML | cheerio | 轻量、快速 | ✅ Phase 1 |
| PPTX | pptx-parser | 功能有限 | ⏳ Phase 2+ |

**总体包体积**: ~10 MB (pdfjs) + 270 KB (其他) = ~10.3 MB 未压缩

**建议**: 使用 dynamic import 分离加载，首屏只加载需要的库

---

**最后更新**: 2026-05-08
