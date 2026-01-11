/**
 * Smart Favorites v1.1 - Side Panel Script
 * Enhanced with theme system, toolbar actions, chat history, and direct bookmark access
 */

// Configuration - will be loaded from storage
let API_BASE_URL = 'http://localhost:8000';

// State
let isConnected = false;
let currentModel = '--';
let syncMode = 'manual';
let currentSuggestions = [];
let currentTheme = 'dark';
let currentSessionId = null;
let chatSessions = [];

// ==================== DOM Elements ====================

// Toolbar
const refreshBtn = document.getElementById('refresh-btn');
const popoutBtn = document.getElementById('popout-btn');
const themeBtn = document.getElementById('theme-btn');
const themeMenu = document.getElementById('theme-menu');
const settingsBtn = document.getElementById('settings-btn');

// Theme Icons
const themeIconDark = document.getElementById('theme-icon-dark');
const themeIconLight = document.getElementById('theme-icon-light');
const themeIconAuto = document.getElementById('theme-icon-auto');

// Main UI Elements
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
const syncModeSelect = document.getElementById('sync-mode-select');
const syncIntervalSelect = document.getElementById('sync-interval');
const scheduleOptions = document.getElementById('schedule-options');
const categorizeBtn = document.getElementById('categorize-btn');
const duplicateBtn = document.getElementById('duplicate-btn');
const aiResults = document.getElementById('ai-results');
const resultsTitle = document.getElementById('results-title');
const resultsContent = document.getElementById('results-content');
const closeResults = document.getElementById('close-results');
const applySuggestions = document.getElementById('apply-suggestions');
const cancelSuggestions = document.getElementById('cancel-suggestions');

// ==================== Toast Notifications ====================

const toastContainer = document.getElementById('toast-container');

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icon based on type
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, duration);
}

// ==================== Theme System ====================

/**
 * Initialize theme from storage or system preference
 */
async function initTheme() {
  const stored = await chrome.storage.local.get(['themeMode']);
  const mode = stored.themeMode || 'dark';
  applyTheme(mode);
  updateThemeUI(mode);
}

/**
 * Apply theme to document
 */
function applyTheme(mode) {
  currentTheme = mode;
  
  if (mode === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.body.setAttribute('data-theme', mode);
  }
}

/**
 * Update theme button icon and menu active state
 */
function updateThemeUI(mode) {
  // Update icon visibility
  themeIconDark.style.display = mode === 'dark' ? 'block' : 'none';
  themeIconLight.style.display = mode === 'light' ? 'block' : 'none';
  themeIconAuto.style.display = mode === 'auto' ? 'block' : 'none';
  
  // Update menu active state
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.theme === mode);
  });
}

/**
 * Set theme and save to storage
 */
async function setTheme(mode) {
  await chrome.storage.local.set({ themeMode: mode });
  applyTheme(mode);
  updateThemeUI(mode);
  hideThemeMenu();
}

/**
 * Toggle theme dropdown menu
 */
function toggleThemeMenu() {
  themeMenu.classList.toggle('show');
}

/**
 * Hide theme dropdown menu
 */
function hideThemeMenu() {
  themeMenu.classList.remove('show');
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (currentTheme === 'auto') {
    document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});

// ==================== Toolbar Actions ====================

/**
 * Refresh connection status
 */
async function refreshConnection() {
  refreshBtn.classList.add('refreshing');
  await checkConnection();
  setTimeout(() => {
    refreshBtn.classList.remove('refreshing');
  }, 500);
}

/**
 * Open in standalone window
 */
async function openInWindow() {
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL('sidepanel/sidepanel.html'),
      type: 'popup',
      width: 420,
      height: 650
    });
  } catch (error) {
    console.error('Failed to open window:', error);
  }
}

// ==================== Tab Switching ====================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');
  });
});

// ==================== API Functions ====================

async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const modelName = data.model || 'Unknown';
      setConnected(true, modelName);
      
      if (data.bookmarks_count !== undefined) {
        const stored = await chrome.storage.local.get(['bookmarkCount']);
        if (!stored.bookmarkCount || stored.bookmarkCount !== data.bookmarks_count) {
          bookmarkCount.innerHTML = `📚 书签数量: <strong>${data.bookmarks_count}</strong>`;
        }
      }
      
      return true;
    } else {
      console.error('Health check failed:', response.status, response.statusText);
      setConnected(false);
      return false;
    }
  } catch (error) {
    console.error('Connection check failed:', error);
    setConnected(false);
    return false;
  }
}

function setConnected(connected, model = '--') {
  isConnected = connected;
  currentModel = model;
  statusIndicator.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = connected ? '已连接' : '未连接';
  modelInfo.textContent = model;
}

// ==================== Direct Bookmark Access ====================

async function getBookmarksFromBrowser() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      resolve(tree);
    });
  });
}

function convertBookmarkTreeToHtml(bookmarkTree) {
  let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
  html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
  html += '<TITLE>Bookmarks</TITLE>\n';
  html += '<H1>Bookmarks</H1>\n';
  html += '<DL><p>\n';
  
  function processNode(node, indent = '    ') {
    let result = '';
    
    if (node.url) {
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : '';
      result += `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(node.title || 'Untitled')}</A>\n`;
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

function flattenBookmarks(nodes, path = '') {
  const bookmarks = [];
  
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
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

// ==================== Sync Functions ====================

async function syncBookmarks(showAlert = true) {
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<div class="loading"></div> 同步中...';
  
  try {
    const bookmarkTree = await getBookmarksFromBrowser();
    const htmlContent = convertBookmarkTreeToHtml(bookmarkTree);
    const allBookmarks = flattenBookmarks(bookmarkTree);
    
    const response = await fetch(`${API_BASE_URL}/api/bookmarks/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html_content: htmlContent, replace_existing: true })
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    
    bookmarkCount.innerHTML = `📚 书签数量: <strong>${data.total_imported}</strong>`;
    const now = new Date();
    lastSync.innerHTML = `⏱️ 上次同步: <strong>${now.toLocaleString()}</strong>`;
    
    await chrome.storage.local.set({
      lastSync: now.getTime(),
      bookmarkCount: data.total_imported,
      bookmarkData: allBookmarks
    });
    
    if (showAlert) {
      alert(`同步成功！共同步 ${data.total_imported} 个书签`);
    }
  } catch (error) {
    console.error('Sync error:', error);
    if (showAlert) {
      alert('同步失败，请检查后端服务是否运行');
    }
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<span>🔄 立即同步收藏夹</span>';
  }
}

async function setupAutoSync() {
  chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    const settings = await chrome.storage.local.get(['syncMode']);
    if (settings.syncMode === 'auto') {
      console.log('Bookmark created, auto-syncing...');
      await syncBookmarks(false);
    }
  });
  
  chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
    const settings = await chrome.storage.local.get(['syncMode']);
    if (settings.syncMode === 'auto') {
      console.log('Bookmark removed, auto-syncing...');
      await syncBookmarks(false);
    }
  });
  
  chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
    const settings = await chrome.storage.local.get(['syncMode']);
    if (settings.syncMode === 'auto') {
      console.log('Bookmark changed, auto-syncing...');
      await syncBookmarks(false);
    }
  });
  
  chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
    const settings = await chrome.storage.local.get(['syncMode']);
    if (settings.syncMode === 'auto') {
      console.log('Bookmark moved, auto-syncing...');
      await syncBookmarks(false);
    }
  });
}

async function updateSyncMode(mode) {
  syncMode = mode;
  await chrome.storage.local.set({ syncMode: mode });
  
  document.getElementById('sync-mode').innerHTML = `🔄 同步模式: <strong>${
    mode === 'manual' ? '手动' : mode === 'auto' ? '自动' : '定时'
  }</strong>`;
  
  scheduleOptions.style.display = mode === 'scheduled' ? 'block' : 'none';
  
  chrome.runtime.sendMessage({ 
    action: 'updateSyncMode', 
    mode: mode,
    interval: mode === 'scheduled' ? parseInt(syncIntervalSelect.value) : null
  });
}

// ==================== Search Functions ====================

async function searchBookmarks(query) {
  if (!query.trim()) return;
  
  if (!isConnected) {
    const connected = await checkConnection();
    if (!connected) {
      searchResults.innerHTML = '<p class="placeholder-text">无法连接到后端服务。请确认后端服务正在运行 (http://localhost:8000)</p>';
      return;
    }
  }
  
  searchResults.innerHTML = '<div class="loading"></div> 搜索中...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 10 })
    });
    
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {}
      throw new Error(errorDetail);
    }
    
    const data = await response.json();
    displaySearchResults(data.results);
  } catch (error) {
    console.error('Search error:', error);
    let errorMsg = '搜索失败';
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMsg = '无法连接到后端服务。请确认后端服务正在运行 (http://localhost:8000)';
    } else {
      errorMsg = `搜索失败: ${error.message}`;
    }
    searchResults.innerHTML = `<p class="placeholder-text">${errorMsg}</p>`;
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
  
  searchResults.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      chrome.tabs.create({ url: item.dataset.url });
    });
  });
}

// ==================== Chat Session Management ====================

const newChatBtn = document.getElementById('new-chat-btn');
const chatSessionsList = document.getElementById('chat-sessions-list');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
const chatSidebar = document.getElementById('chat-sidebar');

/**
 * Load all chat sessions from backend
 */
async function loadChatSessions() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/sessions`);
    if (response.ok) {
      chatSessions = await response.json();
      renderChatSessions();
      
      // If no current session, create one or select first
      if (!currentSessionId && chatSessions.length > 0) {
        selectSession(chatSessions[0].id);
      } else if (!currentSessionId) {
        await createNewSession();
      }
    }
  } catch (error) {
    console.error('Failed to load chat sessions:', error);
    // Create a local session if backend unavailable
    if (!currentSessionId) {
      currentSessionId = `local-${Date.now()}`;
    }
  }
}

/**
 * Render chat sessions list
 */
function renderChatSessions() {
  chatSessionsList.innerHTML = chatSessions.map(session => `
    <div class="session-item ${session.id === currentSessionId ? 'active' : ''}" data-id="${session.id}">
      <span class="session-title" title="双击重命名: ${escapeHtml(session.title || '新会话')}">${escapeHtml(session.title || '新会话')}</span>
      <input type="text" class="session-title-input" value="${escapeHtml(session.title || '新会话')}" style="display: none;">
      <div class="session-actions">
        <button class="session-rename" data-id="${session.id}" title="重命名">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
        <button class="session-delete" data-id="${session.id}" title="删除会话">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add click handlers for session selection
  chatSessionsList.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.session-actions') && !e.target.closest('.session-title-input')) {
        selectSession(item.dataset.id);
      }
    });
    
    // Double-click to rename
    item.querySelector('.session-title').addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startRenameSession(item.dataset.id);
    });
  });
  
  // Add rename handlers
  chatSessionsList.querySelectorAll('.session-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startRenameSession(btn.dataset.id);
    });
  });
  
  // Add delete handlers
  chatSessionsList.querySelectorAll('.session-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(btn.dataset.id);
    });
  });
  
  // Add input handlers for rename
  chatSessionsList.querySelectorAll('.session-title-input').forEach(input => {
    input.addEventListener('blur', (e) => {
      finishRenameSession(e.target);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRenameSession(e.target);
      } else if (e.key === 'Escape') {
        cancelRenameSession(e.target);
      }
    });
  });
}

/**
 * Start renaming a session
 */
function startRenameSession(sessionId) {
  const item = chatSessionsList.querySelector(`.session-item[data-id="${sessionId}"]`);
  if (!item) return;
  
  const titleSpan = item.querySelector('.session-title');
  const titleInput = item.querySelector('.session-title-input');
  
  titleSpan.style.display = 'none';
  titleInput.style.display = 'block';
  titleInput.value = titleSpan.textContent;
  titleInput.focus();
  titleInput.select();
}

/**
 * Finish renaming a session
 */
async function finishRenameSession(input) {
  const item = input.closest('.session-item');
  if (!item) return;
  
  const sessionId = item.dataset.id;
  const titleSpan = item.querySelector('.session-title');
  const newTitle = input.value.trim() || '新会话';
  
  // Update UI
  titleSpan.textContent = newTitle;
  titleSpan.title = newTitle;
  titleSpan.style.display = 'block';
  input.style.display = 'none';
  
  // Update local state
  const session = chatSessions.find(s => s.id === sessionId);
  if (session) {
    session.title = newTitle;
  }
  
  // Update on backend
  try {
    await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    showToast('会话已重命名', 'success');
  } catch (error) {
    console.error('Failed to rename session:', error);
    showToast('重命名失败', 'error');
  }
}

/**
 * Cancel renaming a session
 */
function cancelRenameSession(input) {
  const item = input.closest('.session-item');
  if (!item) return;
  
  const titleSpan = item.querySelector('.session-title');
  
  titleSpan.style.display = 'block';
  input.style.display = 'none';
  input.value = titleSpan.textContent;
}

/**
 * Create a new chat session
 */
async function createNewSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新会话' })
    });
    
    if (response.ok) {
      const session = await response.json();
      chatSessions.unshift(session);
      currentSessionId = session.id;
      renderChatSessions();
      clearChatMessages();
      showWelcomeMessage();
    }
  } catch (error) {
    console.error('Failed to create session:', error);
    // Create local session
    currentSessionId = `local-${Date.now()}`;
    clearChatMessages();
    showWelcomeMessage();
  }
}

/**
 * Select a chat session
 */
async function selectSession(sessionId) {
  currentSessionId = sessionId;
  renderChatSessions();
  
  // Load session messages
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      clearChatMessages();
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(msg.content, msg.role, true);
        });
      } else {
        showWelcomeMessage();
      }
    }
  } catch (error) {
    console.error('Failed to load session messages:', error);
    clearChatMessages();
    showWelcomeMessage();
  }
}

/**
 * Delete a chat session
 */
async function deleteSession(sessionId) {
  if (!confirm('确定要删除这个会话吗？')) return;
  
  try {
    await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    
    chatSessions = chatSessions.filter(s => s.id !== sessionId);
    
    if (currentSessionId === sessionId) {
      if (chatSessions.length > 0) {
        selectSession(chatSessions[0].id);
      } else {
        await createNewSession();
      }
    } else {
      renderChatSessions();
    }
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
}

/**
 * Clear chat messages display
 */
function clearChatMessages() {
  chatMessages.innerHTML = '';
}

/**
 * Show welcome message
 */
function showWelcomeMessage() {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'message assistant';
  welcomeDiv.innerHTML = `
    <p>👋 你好！我是您的智能收藏夹助手。您可以问我关于收藏夹内容的任何问题：</p>
    <ul>
      <li>「我收藏过哪些关于机器学习的网站？」</li>
      <li>「帮我找一下编程相关的教程」</li>
      <li>「整理一下我的技术类书签」</li>
    </ul>
  `;
  chatMessages.appendChild(welcomeDiv);
}

/**
 * Toggle chat sidebar visibility
 */
function toggleChatSidebar() {
  chatSidebar.classList.toggle('collapsed');
  const isCollapsed = chatSidebar.classList.contains('collapsed');
  const icon = toggleSidebarBtn.querySelector('svg');
  
  if (isCollapsed) {
    icon.innerHTML = '<path d="M9 18l6-6-6-6"/>';
    toggleSidebarBtn.title = '展开会话列表';
    expandSidebarBtn.style.display = 'flex';
  } else {
    icon.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
    toggleSidebarBtn.title = '收起会话列表';
    expandSidebarBtn.style.display = 'none';
  }
}

/**
 * Expand chat sidebar (show it)
 */
function expandChatSidebar() {
  chatSidebar.classList.remove('collapsed');
  const icon = toggleSidebarBtn.querySelector('svg');
  icon.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
  toggleSidebarBtn.title = '收起会话列表';
  expandSidebarBtn.style.display = 'none';
}

// ==================== Chat Functions ====================

async function sendChatMessage(message) {
  if (!message.trim()) return;
  
  if (!isConnected) {
    const connected = await checkConnection();
    if (!connected) {
      appendMessage('无法连接到后端服务。请确认后端服务正在运行 (http://localhost:8000)', 'assistant');
      return;
    }
  }
  
  appendMessage(message, 'user');
  chatInput.value = '';
  
  const loadingId = appendMessage('<div class="loading"></div>', 'assistant', true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        include_sources: true,
        session_id: currentSessionId
      })
    });
    
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch (e) {}
      throw new Error(errorDetail);
    }
    
    const data = await response.json();
    document.getElementById(loadingId)?.remove();
    
    if (!data.response) {
      throw new Error('后端返回的数据格式不正确');
    }
    
    let responseHtml = escapeHtml(data.response).replace(/\n/g, '<br>');
    if (data.sources && data.sources.length > 0) {
      responseHtml += '<br><br><strong>相关书签:</strong><ul>';
      data.sources.forEach(source => {
        responseHtml += `<li><a href="${escapeHtml(source.url)}" target="_blank">${escapeHtml(source.title)}</a></li>`;
      });
      responseHtml += '</ul>';
    }
    
    appendMessage(responseHtml, 'assistant', true);
    
    // Update session title if it's still "新会话"
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session && session.title === '新会话') {
      // Use first few characters of the message as title
      const newTitle = message.slice(0, 20) + (message.length > 20 ? '...' : '');
      session.title = newTitle;
      renderChatSessions();
      // Update on backend
      fetch(`${API_BASE_URL}/api/chat/sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      }).catch(console.error);
    }
  } catch (error) {
    console.error('Chat error:', error);
    document.getElementById(loadingId)?.remove();
    
    let errorMsg = '抱歉，发生了错误。';
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMsg = '无法连接到后端服务。请确认：<br>1. 后端服务正在运行 (http://localhost:8000)<br>2. 没有防火墙阻止连接';
    } else if (error.message.includes('HTTP')) {
      errorMsg = `后端服务返回错误: ${error.message}`;
    } else {
      errorMsg = `错误: ${error.message}`;
    }
    
    appendMessage(errorMsg, 'assistant', true);
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

// ==================== AI Tools Functions ====================

async function analyzeCategories() {
  categorizeBtn.disabled = true;
  categorizeBtn.innerHTML = '<div class="loading"></div> 分析中...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Categorize failed');
    
    const data = await response.json();
    displayCategorySuggestions(data.suggestions);
  } catch (error) {
    console.error('Categorize error:', error);
    alert('分类分析失败，请检查后端服务');
  } finally {
    categorizeBtn.disabled = false;
    categorizeBtn.innerHTML = '<span>开始分析</span>';
  }
}

async function detectDuplicates() {
  duplicateBtn.disabled = true;
  duplicateBtn.innerHTML = '<div class="loading"></div> 检测中...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Duplicate detection failed');
    
    const data = await response.json();
    displayDuplicateSuggestions(data.duplicates);
  } catch (error) {
    console.error('Duplicate detection error:', error);
    alert('重复检测失败，请检查后端服务');
  } finally {
    duplicateBtn.disabled = false;
    duplicateBtn.innerHTML = '<span>检测重复</span>';
  }
}

function displayCategorySuggestions(suggestions) {
  currentSuggestions = suggestions;
  resultsTitle.textContent = '📂 分类建议';
  
  if (!suggestions || suggestions.length === 0) {
    resultsContent.innerHTML = '<p class="placeholder-text">未发现需要重新分类的书签</p>';
    aiResults.style.display = 'block';
    return;
  }
  
  resultsContent.innerHTML = suggestions.map((s, i) => `
    <div class="suggestion-item category">
      <div class="suggestion-action">
        <input type="checkbox" class="suggestion-checkbox" data-index="${i}" checked>
      </div>
      <div class="suggestion-title">${escapeHtml(s.bookmark_title)}</div>
      <div class="suggestion-detail">
        当前分类: ${escapeHtml(s.current_folder || '根目录')}<br>
        建议分类: <strong>${escapeHtml(s.suggested_folder)}</strong><br>
        原因: ${escapeHtml(s.reason)}
      </div>
    </div>
  `).join('');
  
  aiResults.style.display = 'block';
}

function displayDuplicateSuggestions(duplicates) {
  currentSuggestions = duplicates;
  resultsTitle.textContent = '🔍 重复书签';
  
  if (!duplicates || duplicates.length === 0) {
    resultsContent.innerHTML = '<p class="placeholder-text">未发现重复书签 ✨</p>';
    aiResults.style.display = 'block';
    return;
  }
  
  resultsContent.innerHTML = duplicates.map((d, i) => `
    <div class="suggestion-item duplicate">
      <div class="suggestion-action">
        <input type="checkbox" class="suggestion-checkbox" data-index="${i}" checked>
      </div>
      <div class="suggestion-title">${escapeHtml(d.title)}</div>
      <div class="suggestion-detail">
        重复数量: ${d.count} 个<br>
        位置: ${d.locations.map(l => escapeHtml(l)).join(', ')}<br>
        建议: <strong>${escapeHtml(d.suggestion)}</strong>
      </div>
    </div>
  `).join('');
  
  aiResults.style.display = 'block';
}

async function applySelectedSuggestions() {
  const checkboxes = resultsContent.querySelectorAll('.suggestion-checkbox:checked');
  const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
  
  if (selectedIndices.length === 0) {
    alert('请选择要应用的建议');
    return;
  }
  
  const selectedSuggestions = selectedIndices.map(i => currentSuggestions[i]);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/apply-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions: selectedSuggestions })
    });
    
    if (!response.ok) throw new Error('Apply failed');
    
    alert('建议已应用！请手动在浏览器中确认更改。');
    aiResults.style.display = 'none';
    
    await syncBookmarks(false);
  } catch (error) {
    console.error('Apply suggestions error:', error);
    alert('应用建议失败');
  }
}

// ==================== Export/Import Functions ====================

async function exportBookmarks() {
  try {
    const bookmarkTree = await getBookmarksFromBrowser();
    const htmlContent = convertBookmarkTreeToHtml(bookmarkTree);
    
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
      
      bookmarkCount.innerHTML = `📚 书签数量: <strong>${data.total_imported}</strong>`;
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败，请检查文件格式');
    }
  };
  
  reader.readAsText(file);
}

// ==================== Utility Functions ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Settings Modal ====================

const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalBtn = document.getElementById('close-settings-modal');
const settingsBackendUrl = document.getElementById('settings-backend-url');
const testConnectionBtn = document.getElementById('test-connection-btn');
const connectionStatus = document.getElementById('connection-status');
const settingsDefaultProvider = document.getElementById('settings-default-provider');
const apiKeysGrid = document.getElementById('api-keys-grid');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const settingsErrorAlert = document.getElementById('settings-error-alert');

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'kimi', name: 'Kimi', placeholder: 'sk-...' },
  { id: 'qwen', name: 'Qwen', placeholder: 'sk-...' },
  { id: 'claude', name: 'Claude', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Gemini', placeholder: 'AI...' },
  { id: 'glm', name: 'GLM', placeholder: 'API Key' },
  { id: 'ollama', name: 'Ollama', placeholder: 'http://localhost:11434' }
];

/**
 * Open settings modal
 */
async function openSettingsModal() {
  // Load current backend URL from storage
  const stored = await chrome.storage.local.get(['backendUrl']);
  settingsBackendUrl.value = stored.backendUrl || API_BASE_URL;
  
  // Load settings from backend
  await loadSettingsFromBackend();
  
  settingsModal.style.display = 'flex';
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

/**
 * Load settings from backend
 */
async function loadSettingsFromBackend() {
  // Hide error alert initially
  settingsErrorAlert.style.display = 'none';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`);
    if (response.ok) {
      const data = await response.json();
      
      // Set default provider
      settingsDefaultProvider.value = data.default_provider || 'deepseek';
      
      // Render API keys grid
      renderApiKeysGrid(data.providers || []);
      
      // Hide error alert on success
      settingsErrorAlert.style.display = 'none';
    } else {
      // Backend responded but with error
      settingsErrorAlert.querySelector('.settings-error-message').textContent = 
        '后端服务响应异常 (状态码: ' + response.status + ')，设置可能无法正确加载或保存。';
      settingsErrorAlert.style.display = 'block';
      
      // Render empty grid
      renderApiKeysGrid(PROVIDERS.map(p => ({
        id: p.id,
        name: p.name,
        configured: false,
        masked_key: ''
      })));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    
    // Show error alert
    settingsErrorAlert.querySelector('.settings-error-message').textContent = 
      '无法连接到后端服务，请确认后端是否运行在 ' + API_BASE_URL + '。';
    settingsErrorAlert.style.display = 'block';
    
    // Render empty grid
    renderApiKeysGrid(PROVIDERS.map(p => ({
      id: p.id,
      name: p.name,
      configured: false,
      masked_key: ''
    })));
  }
}

/**
 * Render API keys grid
 */
function renderApiKeysGrid(providers) {
  apiKeysGrid.innerHTML = providers.map(p => {
    const providerInfo = PROVIDERS.find(pr => pr.id === p.id) || { placeholder: 'API Key' };
    return `
      <div class="api-key-item" data-provider="${p.id}">
        <div class="provider-info">
          <span class="status-dot ${p.configured ? 'configured' : ''}"></span>
          <span class="provider-name">${p.name}</span>
        </div>
        <input type="password" class="key-input" placeholder="${p.configured ? p.masked_key || '已配置' : providerInfo.placeholder}" data-provider="${p.id}">
        <button class="save-key-btn" data-provider="${p.id}">保存</button>
      </div>
    `;
  }).join('');
  
  // Add save button handlers
  apiKeysGrid.querySelectorAll('.save-key-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      const input = apiKeysGrid.querySelector(`.key-input[data-provider="${provider}"]`);
      const apiKey = input.value.trim();
      
      if (!apiKey) {
        return;
      }
      
      btn.textContent = '...';
      btn.disabled = true;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings/apikey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, api_key: apiKey })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update status dot
          const statusDot = btn.closest('.api-key-item').querySelector('.status-dot');
          statusDot.classList.add('configured');
          // Clear input and show masked key
          input.value = '';
          input.placeholder = data.masked_key || '已配置';
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = '保存'; }, 1500);
        } else {
          btn.textContent = '失败';
          setTimeout(() => { btn.textContent = '保存'; }, 1500);
        }
      } catch (error) {
        console.error('Failed to save API key:', error);
        btn.textContent = '错误';
        setTimeout(() => { btn.textContent = '保存'; }, 1500);
      }
      
      btn.disabled = false;
    });
  });
}

/**
 * Test backend connection
 */
async function testBackendConnection() {
  const url = settingsBackendUrl.value.trim();
  connectionStatus.textContent = '测试中...';
  connectionStatus.className = 'settings-hint';
  
  try {
    const response = await fetch(`${url}/api/health`);
    if (response.ok) {
      const data = await response.json();
      connectionStatus.textContent = `✓ 连接成功 (${data.model || 'Unknown'})`;
      connectionStatus.className = 'settings-hint success';
    } else {
      connectionStatus.textContent = '✗ 连接失败: 服务响应异常';
      connectionStatus.className = 'settings-hint error';
    }
  } catch (error) {
    connectionStatus.textContent = '✗ 无法连接到后端服务';
    connectionStatus.className = 'settings-hint error';
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  const backendUrl = settingsBackendUrl.value.trim();
  const defaultProvider = settingsDefaultProvider.value;
  
  // Disable save button during save
  saveSettingsBtn.disabled = true;
  saveSettingsBtn.querySelector('span').textContent = '保存中...';
  
  let hasError = false;
  let errorMessage = '';
  
  try {
    // Save backend URL to local storage
    await chrome.storage.local.set({ backendUrl });
    
    // Update global API URL
    API_BASE_URL = backendUrl;
    
    // Save default provider to backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: defaultProvider })
      });
      
      if (!response.ok) {
        throw new Error('后端响应异常');
      }
    } catch (error) {
      console.error('Failed to save provider:', error);
      hasError = true;
      errorMessage = '无法保存到后端，部分设置可能未生效';
    }
    
    // Refresh connection status
    await checkConnection();
    
    // Show appropriate toast
    if (hasError) {
      showToast(errorMessage, 'warning', 4000);
    } else {
      showToast('设置已保存', 'success');
    }
    
    closeSettingsModal();
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('保存设置失败: ' + error.message, 'error', 4000);
  } finally {
    // Re-enable save button
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.querySelector('span').textContent = '保存设置';
  }
}

// Settings modal event listeners
closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);
saveSettingsBtn.addEventListener('click', saveSettings);
testConnectionBtn.addEventListener('click', testBackendConnection);

// Close modal on backdrop click
settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettingsModal);

// ==================== Event Listeners ====================

// Toolbar
refreshBtn.addEventListener('click', refreshConnection);
popoutBtn.addEventListener('click', openInWindow);
themeBtn.addEventListener('click', toggleThemeMenu);
settingsBtn.addEventListener('click', openSettingsModal);

// Theme menu items
document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    setTheme(item.dataset.theme);
  });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
    hideThemeMenu();
  }
});

// Search
searchBtn.addEventListener('click', () => searchBookmarks(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBookmarks(searchInput.value);
});

// Chat
chatBtn.addEventListener('click', () => sendChatMessage(chatInput.value));
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage(chatInput.value);
});

// Sync
syncBtn.addEventListener('click', () => syncBookmarks(true));
exportBtn.addEventListener('click', exportBookmarks);
importBtn.addEventListener('click', handleImport);
importFile.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    processImport(e.target.files[0]);
  }
});

// Sync mode
syncModeSelect.addEventListener('change', (e) => {
  updateSyncMode(e.target.value);
});

syncIntervalSelect.addEventListener('change', async (e) => {
  const interval = parseInt(e.target.value);
  await chrome.storage.local.set({ syncInterval: interval });
  chrome.runtime.sendMessage({ action: 'updateSyncInterval', interval });
});

// AI Tools
categorizeBtn.addEventListener('click', analyzeCategories);
duplicateBtn.addEventListener('click', detectDuplicates);
closeResults.addEventListener('click', () => {
  aiResults.style.display = 'none';
});
applySuggestions.addEventListener('click', applySelectedSuggestions);
cancelSuggestions.addEventListener('click', () => {
  aiResults.style.display = 'none';
});

// Chat Session Management
newChatBtn.addEventListener('click', createNewSession);
toggleSidebarBtn.addEventListener('click', toggleChatSidebar);
expandSidebarBtn.addEventListener('click', expandChatSidebar);

// ==================== Initialize ====================

async function init() {
  // Initialize theme first
  await initTheme();
  
  // Load backend URL from storage
  const urlStored = await chrome.storage.local.get(['backendUrl']);
  if (urlStored.backendUrl) {
    API_BASE_URL = urlStored.backendUrl;
  }
  
  // Load stored data
  const stored = await chrome.storage.local.get([
    'lastSync', 
    'bookmarkCount', 
    'syncMode', 
    'syncInterval'
  ]);
  
  if (stored.lastSync) {
    lastSync.innerHTML = `⏱️ 上次同步: <strong>${new Date(stored.lastSync).toLocaleString()}</strong>`;
  }
  
  if (stored.bookmarkCount) {
    bookmarkCount.innerHTML = `📚 书签数量: <strong>${stored.bookmarkCount}</strong>`;
  }
  
  if (stored.syncMode) {
    syncMode = stored.syncMode;
    syncModeSelect.value = stored.syncMode;
    scheduleOptions.style.display = stored.syncMode === 'scheduled' ? 'block' : 'none';
    document.getElementById('sync-mode').innerHTML = `🔄 同步模式: <strong>${
      stored.syncMode === 'manual' ? '手动' : stored.syncMode === 'auto' ? '自动' : '定时'
    }</strong>`;
  }
  
  if (stored.syncInterval) {
    syncIntervalSelect.value = stored.syncInterval;
  }
  
  // Check connection
  await checkConnection();
  
  // Load chat sessions
  await loadChatSessions();
  
  // Setup auto sync listeners
  setupAutoSync();
  
  // Periodic connection check (every 30 seconds)
  setInterval(async () => {
    await checkConnection();
  }, 30000);
}

init();
