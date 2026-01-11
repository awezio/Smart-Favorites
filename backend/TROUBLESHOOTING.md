# 故障排除指南

## 网络连接错误："远程主机强迫关闭了一个现有的连接"

### 问题描述

在初始化 `sentence-transformers` 模型时，可能会遇到以下错误：

```
ConnectionResetError(10054, '远程主机强迫关闭了一个现有的连接。', None, 10054, None)
```

### 问题原因

1. **网络连接问题**：访问 Hugging Face 服务器时网络不稳定
2. **防火墙/代理限制**：防火墙或代理服务器阻止了连接
3. **服务器限流**：Hugging Face 服务器对请求频率有限制
4. **地理位置限制**：在中国大陆访问 Hugging Face 可能较慢或不稳定

### 解决方案

#### 方案 1：使用 Hugging Face 镜像源（推荐，适用于中国大陆）

1. **设置环境变量**（临时）：
   ```powershell
   $env:HF_ENDPOINT="https://hf-mirror.com"
   ```

2. **在 .env 文件中设置**（永久）：
   在 `backend/.env` 文件中添加：
   ```
   HF_ENDPOINT=https://hf-mirror.com
   ```

3. **重启后端服务**

#### 方案 2：手动预下载模型

在启动服务前，先手动下载模型：

```powershell
cd "D:\Smart Favorites\backend"
.\venv\Scripts\Activate.ps1
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

#### 方案 3：使用 OpenAI Embedding（如果已配置 OpenAI API Key）

在 `backend/.env` 文件中设置：

```
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=your-openai-api-key
```

#### 方案 4：检查网络和代理设置

1. 检查防火墙设置，确保允许 Python 访问网络
2. 如果使用代理，配置代理环境变量：
   ```
   HTTP_PROXY=http://your-proxy:port
   HTTPS_PROXY=http://your-proxy:port
   ```

### 验证修复

重启后端服务后，查看日志应该显示：

```
INFO: Embedding function initialized successfully with model: sentence-transformers/all-MiniLM-L6-v2
```

而不是连接错误。

### 其他常见问题

#### 问题：模型下载很慢

**解决方案**：使用镜像源（方案 1）

#### 问题：磁盘空间不足

**解决方案**：模型会下载到 `~/.cache/huggingface/` 目录，确保有足够空间（约 100-500MB）

#### 问题：权限错误

**解决方案**：确保对缓存目录有写入权限
