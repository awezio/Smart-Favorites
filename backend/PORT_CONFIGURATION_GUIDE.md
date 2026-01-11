# Smart Favorites 端口配置指南 / Port Configuration Guide

## 中文版本

### 概述

本文档详细介绍如何在本地或服务器环境中为 Smart Favorites 前端提供后端 API 接口。包括端口配置、进程管理、以及常见问题的解决方案。

### 本地开发环境配置

#### 1. 基本配置

**默认配置：**
- 主机地址：`127.0.0.1` (localhost)
- 端口：`8000`
- 调试模式：`True` (开发环境)

**配置文件位置：**
- 环境变量文件：`backend/.env`
- 配置类：`backend/app/config/settings.py`

#### 2. 修改端口配置

**方法一：通过环境变量（推荐）**

在 `backend/.env` 文件中添加或修改：

```env
HOST=127.0.0.1
PORT=8000
DEBUG=True
```

**方法二：直接修改代码**

编辑 `backend/app/config/settings.py`：

```python
class Settings(BaseSettings):
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)  # 修改为你想要的端口
    debug: bool = Field(default=True)
```

#### 3. 启动后端服务

```bash
cd backend
python run.py
```

**新特性：**
- ✅ 自动检测端口占用
- ✅ 自动清理占用端口的进程
- ✅ 单进程模式（避免子进程问题）
- ✅ 优雅关闭处理

#### 4. 端口管理功能

**自动端口检测和清理：**

启动时会自动检查端口是否被占用。如果被占用，会尝试清理相关进程：

```
INFO: Checking port availability: 127.0.0.1:8000
INFO: Port 127.0.0.1:8000 is in use
INFO: Attempting to clean up port 8000...
INFO: Found 2 process(es) using port 8000
INFO: Successfully killed process 13648
INFO: Port 127.0.0.1:8000 is now available after cleanup
```

**手动端口清理：**

如果自动清理失败，可以手动清理：

**Windows:**
```powershell
# 查找占用端口的进程
netstat -ano | findstr :8000

# 终止进程（替换 PID 为实际进程ID）
taskkill /F /PID <PID> /T
```

**Linux/Mac:**
```bash
# 查找占用端口的进程
lsof -i :8000

# 终止进程
kill -9 <PID>
```

### 服务器部署配置

#### 1. 生产环境配置

**推荐配置：**
- 主机地址：`0.0.0.0` (监听所有网络接口)
- 端口：`8000` 或自定义端口
- 调试模式：`False` (生产环境)

**环境变量配置：**

```env
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

#### 2. 使用反向代理（推荐）

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Apache 配置示例：**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

#### 3. 使用进程管理器

**使用 systemd (Linux):**

创建服务文件 `/etc/systemd/system/smart-favorites.service`:

```ini
[Unit]
Description=Smart Favorites Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/smart-favorites/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable smart-favorites
sudo systemctl start smart-favorites
```

**使用 PM2 (Node.js 进程管理器):**

```bash
# 安装 PM2
npm install -g pm2

# 创建启动脚本 start.sh
#!/bin/bash
cd /path/to/smart-favorites/backend
source venv/bin/activate
python run.py

# 启动服务
pm2 start start.sh --name smart-favorites
pm2 save
pm2 startup
```

#### 4. 防火墙配置

**开放端口（以 8000 为例）：**

**Linux (iptables):**
```bash
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables-save
```

**Linux (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

**Windows 防火墙：**
1. 打开"Windows Defender 防火墙"
2. 点击"高级设置"
3. 选择"入站规则" → "新建规则"
4. 选择"端口" → TCP → 特定本地端口：8000
5. 允许连接 → 完成

### 前端连接配置

#### 1. 浏览器扩展配置

扩展会自动连接到 `http://localhost:8000`。如果需要连接到远程服务器，需要修改：

**修改 `extension/sidepanel/sidepanel.js`:**

```javascript
const API_BASE_URL = 'http://your-server-ip:8000';
```

**修改 `extension/background/background.js`:**

```javascript
const API_BASE_URL = 'http://your-server-ip:8000';
```

#### 2. CORS 配置

后端已配置 CORS 中间件，允许浏览器扩展访问。如果需要添加特定域名，修改 `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
        "chrome-extension://*",
        "edge-extension://*",
        "https://your-domain.com",  # 添加你的域名
        "*"  # 开发环境允许所有
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 常见问题

#### Q1: 端口被占用怎么办？

**解决方案：**
1. 使用自动清理功能（启动时会自动尝试）
2. 手动查找并终止进程（见"端口管理功能"章节）
3. 修改配置文件使用其他端口

#### Q2: 为什么关闭终端后进程还在运行？

**原因：**
- Windows 上关闭终端不会自动终止子进程
- 之前的版本可能存在 multiprocessing 子进程问题

**解决方案：**
- 新版本已修复：使用单进程模式，避免子进程问题
- 使用 `Ctrl+C` 优雅关闭
- 如果仍有问题，使用端口清理功能

#### Q3: 如何检查服务是否正常运行？

**方法一：健康检查 API**

```bash
curl http://localhost:8000/api/health
```

**方法二：访问 API 文档**

浏览器打开：`http://localhost:8000/docs`

#### Q4: 如何切换 AI 提供商？

修改 `backend/.env` 文件：

```env
DEFAULT_LLM_PROVIDER=deepseek  # 或 openai, kimi, qwen, claude, gemini, glm, ollama
```

切换时会自动清理之前的连接。

### 安全建议

1. **生产环境：**
   - 设置 `DEBUG=False`
   - 使用 HTTPS（通过反向代理）
   - 配置防火墙规则
   - 使用环境变量管理敏感信息

2. **API 密钥：**
   - 不要将 `.env` 文件提交到版本控制
   - 使用强密码和 API 密钥
   - 定期轮换密钥

3. **访问控制：**
   - 考虑添加身份验证
   - 限制 API 访问频率
   - 监控异常访问

---

## English Version

### Overview

This document provides detailed instructions on how to configure the Smart Favorites backend API for frontend access in both local and server environments, including port configuration, process management, and troubleshooting.

### Local Development Configuration

#### 1. Basic Configuration

**Default Settings:**
- Host: `127.0.0.1` (localhost)
- Port: `8000`
- Debug Mode: `True` (development)

**Configuration Files:**
- Environment file: `backend/.env`
- Settings class: `backend/app/config/settings.py`

#### 2. Changing Port Configuration

**Method 1: Environment Variables (Recommended)**

Add or modify in `backend/.env`:

```env
HOST=127.0.0.1
PORT=8000
DEBUG=True
```

**Method 2: Direct Code Modification**

Edit `backend/app/config/settings.py`:

```python
class Settings(BaseSettings):
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)  # Change to your desired port
    debug: bool = Field(default=True)
```

#### 3. Starting the Backend Service

```bash
cd backend
python run.py
```

**New Features:**
- ✅ Automatic port detection
- ✅ Automatic cleanup of processes using the port
- ✅ Single-process mode (avoids subprocess issues)
- ✅ Graceful shutdown handling

#### 4. Port Management Features

**Automatic Port Detection and Cleanup:**

On startup, the service automatically checks if the port is in use and attempts to clean up related processes:

```
INFO: Checking port availability: 127.0.0.1:8000
INFO: Port 127.0.0.1:8000 is in use
INFO: Attempting to clean up port 8000...
INFO: Found 2 process(es) using port 8000
INFO: Successfully killed process 13648
INFO: Port 127.0.0.1:8000 is now available after cleanup
```

**Manual Port Cleanup:**

If automatic cleanup fails, you can manually clean up:

**Windows:**
```powershell
# Find processes using the port
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /F /PID <PID> /T
```

**Linux/Mac:**
```bash
# Find processes using the port
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Server Deployment Configuration

#### 1. Production Environment Configuration

**Recommended Settings:**
- Host: `0.0.0.0` (listen on all network interfaces)
- Port: `8000` or custom port
- Debug Mode: `False` (production)

**Environment Variables:**

```env
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

#### 2. Using Reverse Proxy (Recommended)

**Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Apache Configuration Example:**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

#### 3. Using Process Managers

**Using systemd (Linux):**

Create service file `/etc/systemd/system/smart-favorites.service`:

```ini
[Unit]
Description=Smart Favorites Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/smart-favorites/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl enable smart-favorites
sudo systemctl start smart-favorites
```

**Using PM2 (Node.js Process Manager):**

```bash
# Install PM2
npm install -g pm2

# Create startup script start.sh
#!/bin/bash
cd /path/to/smart-favorites/backend
source venv/bin/activate
python run.py

# Start service
pm2 start start.sh --name smart-favorites
pm2 save
pm2 startup
```

#### 4. Firewall Configuration

**Open Port (example: 8000):**

**Linux (iptables):**
```bash
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables-save
```

**Linux (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

**Windows Firewall:**
1. Open "Windows Defender Firewall"
2. Click "Advanced Settings"
3. Select "Inbound Rules" → "New Rule"
4. Select "Port" → TCP → Specific local ports: 8000
5. Allow connection → Finish

### Frontend Connection Configuration

#### 1. Browser Extension Configuration

The extension automatically connects to `http://localhost:8000`. To connect to a remote server, modify:

**Edit `extension/sidepanel/sidepanel.js`:**

```javascript
const API_BASE_URL = 'http://your-server-ip:8000';
```

**Edit `extension/background/background.js`:**

```javascript
const API_BASE_URL = 'http://your-server-ip:8000';
```

#### 2. CORS Configuration

The backend is configured with CORS middleware to allow browser extension access. To add specific domains, modify `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
        "chrome-extension://*",
        "edge-extension://*",
        "https://your-domain.com",  # Add your domain
        "*"  # Allow all in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frequently Asked Questions

#### Q1: What if the port is already in use?

**Solution:**
1. Use automatic cleanup (attempts automatically on startup)
2. Manually find and kill processes (see "Port Management Features" section)
3. Modify configuration to use a different port

#### Q2: Why does the process keep running after closing the terminal?

**Reason:**
- On Windows, closing the terminal doesn't automatically terminate child processes
- Previous versions may have had multiprocessing subprocess issues

**Solution:**
- New version fixed: Uses single-process mode to avoid subprocess issues
- Use `Ctrl+C` for graceful shutdown
- If issues persist, use port cleanup feature

#### Q3: How to check if the service is running properly?

**Method 1: Health Check API**

```bash
curl http://localhost:8000/api/health
```

**Method 2: Access API Documentation**

Open in browser: `http://localhost:8000/docs`

#### Q4: How to switch AI providers?

Modify `backend/.env` file:

```env
DEFAULT_LLM_PROVIDER=deepseek  # or openai, kimi, qwen, claude, gemini, glm, ollama
```

Previous connections are automatically cleaned up when switching.

### Security Recommendations

1. **Production Environment:**
   - Set `DEBUG=False`
   - Use HTTPS (via reverse proxy)
   - Configure firewall rules
   - Use environment variables for sensitive information

2. **API Keys:**
   - Do not commit `.env` file to version control
   - Use strong passwords and API keys
   - Rotate keys regularly

3. **Access Control:**
   - Consider adding authentication
   - Limit API access rate
   - Monitor for unusual access

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
