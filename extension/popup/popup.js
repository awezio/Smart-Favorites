/**
 * Smart Favorites Popup Script
 */

// Configuration
const API_BASE_URL = 'http://localhost:8000';

// State
let isConnected = false;
let currentModel = '--';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const chatInput = document.getElementById('chat-input');
const chatBtn = document.getElementById('chat-btn');
const chatMessages = document.getElementById('chat-messages');
const syncBtn = document.getElementById('sync-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const modelInfo = document.getElementById('model-info');
const bookmarkCount = document.getElementById('bookmark-count');
const lastSync = document.getElementById('last-sync');
const settingsBtn = document.getElementById('settings-btn');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');
  });
});

// API functions
async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      setConnected(true, data.model || 'Unknown');
      return true;
    }
  } catch (error) {
    console.error('Connection check failed:', error);
  }
  setConnected(false);
  return false;
}

function setConnected(connected, model = '--') {
  isConnected = connected;
  currentModel = model;
  
  statusIndicator.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = connected ? '已连接' : '未连接';
  modelInfo.textContent = model;
}

async function searchBookmarks(query) {
  if (!query.trim()) return;
  
  searchResults.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 10 })
    });
    
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    displaySearchResults(data.results);
  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = '<p class="placeholder-text">搜索失败，请检查后端服务是否运行</p>';
  }
}

function displaySearchResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<p class="placeholder-text">未找到相关结果</p>';
    return;
  }
  
  searchResults.innerHTML = results.map(result => `
    <div class="result-item" data-url="${result.bookmark.url}">
      <div class="result-title">
        ${result.bookmark.icon ? `<img src="${result.bookmark.icon}" alt="">` : '🔖'}
        ${escapeHtml(result.bookmark.title)}
      </div>
      <div class="result-url">${escapeHtml(result.bookmark.url)}</div>
      <div class="result-score">相关度: ${(result.score * 100).toFixed(1)}%</div>
    </div>
  `).join('');
  
  // Add click handlers
  searchResults.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      chrome.tabs.create({ url: item.dataset.url });
    });
  });
}

async function sendChatMessage(message) {
  if (!message.trim()) return;
  
  // Add user message
  appendMessage(message, 'user');
  chatInput.value = '';
  
  // Show loading
  const loadingId = appendMessage('<div class="loading"></div>', 'assistant', true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, include_sources: true })
    });
    
    if (!response.ok) throw new Error('Chat failed');
    
    const data = await response.json();
    
    // Remove loading and add response
    document.getElementById(loadingId)?.remove();
    
    let responseHtml = escapeHtml(data.response);
    if (data.sources && data.sources.length > 0) {
      responseHtml += '<br><br><strong>相关书签:</strong><ul>';
      data.sources.forEach(source => {
        responseHtml += `<li><a href="${source.url}" target="_blank">${escapeHtml(source.title)}</a></li>`;
      });
      responseHtml += '</ul>';
    }
    
    appendMessage(responseHtml, 'assistant', true);
  } catch (error) {
    console.error('Chat error:', error);
    document.getElementById(loadingId)?.remove();
    appendMessage('抱歉，发生了错误。请检查后端服务是否运行。', 'assistant');
  }
}

function appendMessage(content, type, isHtml = false) {
  const id = `msg-${Date.now()}`;
  const div = document.createElement('div');
  div.id = id;
  div.className = `message ${type}`;
  
  if (isHtml) {
    div.innerHTML = content;
  } else {
    div.innerHTML = `<p>${escapeHtml(content)}</p>`;
  }
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return id;
}

async function syncBookmarks() {
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<div class="loading"></div> 同步中...';
  
  try {
    // Get bookmarks from browser
    const bookmarkTree = await chrome.bookmarks.getTree();
    const bookmarks = flattenBookmarks(bookmarkTree);
    
    // Convert to HTML format
    const htmlContent = convertToHtml(bookmarkTree);
    
    const response = await fetch(`${API_BASE_URL}/api/bookmarks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html_content: htmlContent, replace_existing: true })
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    
    bookmarkCount.textContent = `书签数量: ${data.total_imported}`;
    lastSync.textContent = `上次同步: ${new Date().toLocaleString()}`;
    
    // Save to storage
    chrome.storage.local.set({
      lastSync: Date.now(),
      bookmarkCount: data.total_imported
    });
    
    alert('同步成功！');
  } catch (error) {
    console.error('Sync error:', error);
    alert('同步失败，请检查后端服务是否运行');
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '🔄 同步收藏夹';
  }
}

function flattenBookmarks(nodes, path = '') {
  const bookmarks = [];
  
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        title: node.title,
        url: node.url,
        dateAdded: node.dateAdded,
        path: path
      });
    }
    
    if (node.children) {
      const newPath = path ? `${path}/${node.title}` : node.title;
      bookmarks.push(...flattenBookmarks(node.children, newPath));
    }
  }
  
  return bookmarks;
}

function convertToHtml(bookmarkTree) {
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
  html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
  html += '<TITLE>Bookmarks</TITLE>\n';
  html += '<H1>Bookmarks</H1>\n';
  html += '<DL><p>\n';
  
  function processNode(node, indent = '    ') {
    let result = '';
    
    if (node.url) {
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : '';
      result += `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(node.title)}</A>\n`;
    } else if (node.title) {
      result += `${indent}<DT><H3>${escapeHtml(node.title)}</H3>\n`;
      result += `${indent}<DL><p>\n`;
    }
    
    if (node.children) {
      for (const child of node.children) {
        result += processNode(child, indent + '    ');
      }
    }
    
    if (!node.url && node.title) {
      result += `${indent}</DL><p>\n`;
    }
    
    return result;
  }
  
  for (const root of bookmarkTree) {
    if (root.children) {
      for (const child of root.children) {
        html += processNode(child);
      }
    }
  }
  
  html += '</DL><p>\n';
  return html;
}

async function exportBookmarks() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const htmlContent = convertToHtml(bookmarkTree);
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    alert('导出失败');
  }
}

function handleImport() {
  importFile.click();
}

async function processImport(file) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    const htmlContent = e.target.result;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookmarks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: htmlContent, replace_existing: false })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const data = await response.json();
      alert(`导入成功！共导入 ${data.total_imported} 个书签`);
      
      bookmarkCount.textContent = `书签数量: ${data.total_imported}`;
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败，请检查文件格式');
    }
  };
  
  reader.readAsText(file);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
searchBtn.addEventListener('click', () => searchBookmarks(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBookmarks(searchInput.value);
});

chatBtn.addEventListener('click', () => sendChatMessage(chatInput.value));
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage(chatInput.value);
});

syncBtn.addEventListener('click', syncBookmarks);
exportBtn.addEventListener('click', exportBookmarks);
importBtn.addEventListener('click', handleImport);
importFile.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    processImport(e.target.files[0]);
  }
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize
async function init() {
  // Load stored data
  const stored = await chrome.storage.local.get(['lastSync', 'bookmarkCount']);
  
  if (stored.lastSync) {
    lastSync.textContent = `上次同步: ${new Date(stored.lastSync).toLocaleString()}`;
  }
  
  if (stored.bookmarkCount) {
    bookmarkCount.textContent = `书签数量: ${stored.bookmarkCount}`;
  }
  
  // Check connection
  await checkConnection();
}

init();
