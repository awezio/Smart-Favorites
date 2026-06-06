/**
 * Smart Favorites v1.1 - Side Panel Script
 * Enhanced with theme system, toolbar actions, chat history, and direct bookmark access
 */

// Configuration - will be loaded from storage
let API_BASE_URL = 'https://smart-favorites.vercel.app';

// Helper: fetch with auth token
async function fetchWithAuth(url, options = {}) {
  const { authToken } = await chrome.storage.local.get(['authToken']);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    await chrome.storage.local.remove(['authToken', 'extensionToken', 'supabaseRefreshToken', 'supabaseExpiresAt']);
    checkExtensionAuthStatus();
  }
  return response;
}

// State
let isConnected = false;
let currentModel = '--';
let currentProvider = 'deepseek';
let syncMode = 'manual';
let currentSuggestions = [];
let currentTheme = 'dark';
let currentSessionId = null;
let chatSessions = [];
let webSearchEnabled = false;
let attachments = []; // Store uploaded attachments
let lastUserMessage = ''; // For regenerate feature

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

// New Chat Input Area Elements
const chatModelSelector = document.getElementById('chat-model-selector');
const chatStatusDot = document.getElementById('chat-status-dot');
const chatStatusText = document.getElementById('chat-status-text');
const attachmentsPreview = document.getElementById('attachments-preview');
const attachFileBtn = document.getElementById('attach-file-btn');
const attachImageBtn = document.getElementById('attach-image-btn');
const webSearchToggle = document.getElementById('web-search-toggle');
const fileInput = document.getElementById('file-input');
const imageInput = document.getElementById('image-input');
const syncBtn = document.getElementById('sync-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
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
const userArea = document.getElementById('user-area');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');

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
    const response = await fetchWithAuth(`${API_BASE_URL}/api/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const payload = await response.json();
      const data = payload.session || payload;
      const modelName = data.model || '--';
      
      // Update current provider from backend
      if (data.model) {
        currentProvider = data.model;
        if (chatModelSelector) {
          chatModelSelector.value = data.model;
        }
      }
      
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
  
  // Update chat status indicator (new location in chat input area)
  if (chatStatusDot) {
    chatStatusDot.className = `status-dot-mini ${connected ? 'connected' : 'disconnected'}`;
  }
  if (chatStatusText) {
    chatStatusText.textContent = connected ? `已连接 ${model}` : '未连接';
  }
}

// ==================== Auth & Profile ====================

/**
 * Check auth status and update user area. Fetches profile from API when logged in.
 */
async function checkExtensionAuthStatus() {
  if (!userArea || !userAvatar || !userName) return;
  
  const { authToken, backendUrl } = await chrome.storage.local.get(['authToken', 'backendUrl']);
  const apiBase = backendUrl || API_BASE_URL;
  
  if (!authToken) {
    userName.textContent = '未登录';
    userAvatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
    userArea.title = '点击登录（打开 Web 端登录页）';
    return;
  }
  
  try {
    const res = await fetchWithAuth(`${apiBase}/api/profile`);
    if (res.ok) {
      const profile = await res.json();
      const displayName = profile.display_name || profile.email || '用户';
      userName.textContent = displayName.length > 8 ? displayName.slice(0, 7) + '…' : displayName;
      
      if (profile.avatar_url) {
        userAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else if (profile.avatar_seed) {
        const [style, seed] = (profile.avatar_seed + ':default').split(':').slice(0, 2);
        const url = `https://api.dicebear.com/9.x/${encodeURIComponent(style || 'adventurer')}/svg?seed=${encodeURIComponent(seed || profile.id)}&size=32`;
        userAvatar.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
      userArea.title = displayName + ' - 点击打开 Web 端个人资料';
    } else {
      userName.textContent = '登录已过期';
      userAvatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
      userArea.title = '点击重新登录';
    }
  } catch (e) {
    userName.textContent = '未登录';
    userAvatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
    userArea.title = '点击登录';
  }
}

/**
 * Open Web login/connect page for extension auth
 */
function openExtensionLogin() {
  chrome.storage.local.get(['backendUrl'], (stored) => {
    const base = stored.backendUrl || API_BASE_URL;
    const url = base.replace(/\/$/, '') + '/auth/extension?ext_id=' + chrome.runtime.id;
    chrome.tabs.create({ url });
  });
}

/**
 * Open Web dashboard (profile or home)
 */
function openWebDashboard() {
  chrome.storage.local.get(['backendUrl'], (stored) => {
    const base = stored.backendUrl || API_BASE_URL;
    chrome.tabs.create({ url: base.replace(/\/$/, '') + '/dashboard/profile' });
  });
}

// User area click: login or open profile
if (userArea) {
  userArea.addEventListener('click', async () => {
    const { authToken } = await chrome.storage.local.get(['authToken']);
    if (authToken) {
      openWebDashboard();
    } else {
      openExtensionLogin();
    }
  });
}

// Listen for auth token changes (e.g. after OAuth callback)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.authToken || changes.backendUrl)) {
    if (changes.backendUrl) API_BASE_URL = changes.backendUrl.newValue || API_BASE_URL;
    checkExtensionAuthStatus();
  }
});

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
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/bookmarks/sync`, {
      method: 'POST',
      body: JSON.stringify({ htmlContent })
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    const count = data.total_imported || data.totalImported || 0;
    
    bookmarkCount.innerHTML = `📚 书签数量: <strong>${count}</strong>`;
    const now = new Date();
    lastSync.innerHTML = `⏱️ 上次同步: <strong>${now.toLocaleString()}</strong>`;
    
    await chrome.storage.local.set({
      lastSync: now.getTime(),
      bookmarkCount: count,
      bookmarkData: allBookmarks
    });
    
    if (showAlert) {
      alert(`同步成功！共同步 ${count} 个书签`);
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

async function searchLocalBookmarks(query, topK = 10) {
  const tree = await getBookmarksFromBrowser();
  const flat = tree.flatMap((root) => (root.children ? flattenBookmarks(root.children, root.title || '') : []));
  const q = query.trim().toLowerCase();
  const matched = flat
    .filter((b) => (b.title || '').toLowerCase().includes(q) || (b.url || '').toLowerCase().includes(q))
    .slice(0, topK);
  return matched.map((b) => ({
    type: 'bookmark',
    bookmark: { title: b.title || 'Untitled', url: b.url },
    similarity: 1,
    score: 1,
  }));
}

async function searchBookmarks(query) {
  if (!query.trim()) return;

  searchResults.innerHTML = '<div class="loading"></div> 搜索中...';

  const { authToken } = await chrome.storage.local.get(['authToken']);
  const hasAuth = !!authToken;

  if (hasAuth) {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        body: JSON.stringify({ query, topK: 10, type: 'all' }),
      });

      if (response.ok) {
        const data = await response.json();
        const list = data.results || [];
        displaySearchResults(list);
        return;
      }
      if (response.status === 401) {
        showToast('未登录，使用本地书签搜索', 'info');
      }
    } catch (error) {
      console.error('Search error:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        showToast('无法连接后端，切换到本地搜索', 'info');
      }
    }
  }

  try {
    const localResults = await searchLocalBookmarks(query, 20);
    displaySearchResults(localResults);
    if (localResults.length > 0 && !hasAuth) {
      showToast('当前为本地书签搜索，登录后可使用 AI 语义搜索', 'info');
    }
  } catch (err) {
    console.error('Local search error:', err);
    searchResults.innerHTML = '<p class="placeholder-text">本地搜索失败</p>';
  }
}

function displaySearchResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<p class="placeholder-text">未找到相关结果</p>';
    return;
  }

  const score = (r) => ((r.similarity ?? r.score ?? 1) * 100).toFixed(1);
  const getItem = (r) => {
    const b = r.bookmark || r.star;
    const url = b?.url || '';
    const title = b?.title || (r.star ? `${r.star.owner}/${r.star.repo}` : 'Untitled');
    const icon = r.bookmark?.icon;
    return `<div class="result-item" data-url="${escapeHtml(url)}">
      <div class="result-title">
        ${icon ? `<img src="${escapeHtml(icon)}" alt="">` : '🔖'}
        ${escapeHtml(title)}
      </div>
      <div class="result-url">${escapeHtml(url)}</div>
      <div class="result-score">相关度: ${score(r)}%</div>
    </div>`;
  };

  searchResults.innerHTML = results.map(getItem).join('');
  
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
    // First, try to restore last used session from storage
    const stored = await chrome.storage.local.get(['lastSessionId']);
    const lastSessionId = stored.lastSessionId;
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions`);
    if (response.ok) {
      const payload = await response.json();
      chatSessions = payload.sessions || payload;
      console.log('Loaded sessions:', chatSessions.length, 'Last session:', lastSessionId);
      renderChatSessions();
      
      // Try to restore last session, or select first, or create new
      if (lastSessionId && chatSessions.find(s => s.id === lastSessionId)) {
        await selectSession(lastSessionId);
      } else if (chatSessions.length > 0) {
        await selectSession(chatSessions[0].id);
      } else {
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
    await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: 'PATCH',
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
    const response = await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions`, {
      method: 'POST',
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
  
  // Save to storage for persistence across reloads
  await chrome.storage.local.set({ lastSessionId: sessionId });
  
  renderChatSessions();
  
  // Load session messages
  try {
    console.log('Loading session:', sessionId);
    const response = await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions/${sessionId}`);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Session data:', data);
      console.log('Messages count:', data.messages ? data.messages.length : 0);
      
      clearChatMessages();
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          console.log('Rendering message:', msg.role, msg.content.substring(0, 50));
          appendMessage(msg.content, msg.role, true);
        });
      } else {
        console.log('No messages, showing welcome');
        showWelcomeMessage();
      }
    } else {
      console.error('Failed to load session, status:', response.status);
      clearChatMessages();
      showWelcomeMessage();
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
    await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
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
  if (!message.trim() && attachments.length === 0) return;
  
  if (!isConnected) {
    const connected = await checkConnection();
    if (!connected) {
      appendMessage('无法连接到后端服务。请确认后端服务正在运行 (http://localhost:8000)', 'assistant');
      return;
    }
  }
  
  // Store for regenerate feature
  lastUserMessage = message;
  
  // Ensure we have a valid backend session before sending message
  if (!currentSessionId || currentSessionId.startsWith('local-')) {
    try {
      const sessionResponse = await fetchWithAuth(`${API_BASE_URL}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新会话' })
      });
      if (sessionResponse.ok) {
        const payload = await sessionResponse.json();
        const session = payload.session || payload;
        chatSessions.unshift(session);
        currentSessionId = session.id;
        renderChatSessions();
        console.log('Created new session for chat:', currentSessionId);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }
  
  // Display user message with attachments info
  let userMessageDisplay = message;
  if (attachments.length > 0) {
    const attachmentNames = attachments.map(a => a.name).join(', ');
    userMessageDisplay = message + (message ? '\n' : '') + `[附件: ${attachmentNames}]`;
  }
  
  appendMessage(userMessageDisplay, 'user');
  chatInput.value = '';
  autoResizeTextarea(chatInput);
  
  const loadingId = appendMessage('<div class="loading"></div>', 'assistant', true);
  
  try {
    // Prepare request body
    const requestBody = { 
      query: message,
      sessionId: currentSessionId,
      chatHistory: [],
      webSearch: webSearchEnabled,
      provider: currentProvider
    };
    
    // Add attachments if any
    if (attachments.length > 0) {
      requestBody.attachments = attachments.map(a => ({
        type: a.type,
        content: a.content,
        filename: a.name,
        mimeType: a.mimeType
      }));
    }
    
    console.log('Sending chat with sessionId:', currentSessionId);
    const response = await fetchWithAuth(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    
    // Clear attachments after sending
    clearAttachments();
    
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
    
    if (!data.answer && !data.response) {
      throw new Error('后端返回的数据格式不正确');
    }
    
    // Render response with Markdown
    let responseContent = data.answer || data.response;
    
    // Add sources section if available
    let sourcesHtml = '';
    if (data.sources && data.sources.length > 0) {
      sourcesHtml = `
        <div class="message-sources">
          <div class="message-sources-title">相关书签</div>
          <div class="message-sources-list">
            ${data.sources.map(source => `
              <a href="${escapeHtml(source.url)}" target="_blank" class="source-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                ${escapeHtml(source.title || source.url)}
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Create message with Markdown content and sources
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const msgDiv = document.createElement('div');
    msgDiv.id = msgId;
    msgDiv.className = 'message assistant';
    msgDiv.dataset.rawContent = responseContent;
    
    const renderedMarkdown = renderMarkdown(responseContent);
    msgDiv.innerHTML = `
      <div class="markdown-content">${renderedMarkdown}</div>
      ${sourcesHtml}
      ${createMessageActions(msgId, true)}
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Apply syntax highlighting
    if (typeof hljs !== 'undefined') {
      msgDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
    
    // Update session title if it's still "新会话"
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session && session.title === '新会话') {
      const newTitle = message.slice(0, 20) + (message.length > 20 ? '...' : '');
      session.title = newTitle;
      renderChatSessions();
      fetchWithAuth(`${API_BASE_URL}/api/chat/sessions/${currentSessionId}`, {
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
      errorMsg = '无法连接到后端服务。请确认：\n1. 后端服务正在运行 (http://localhost:8000)\n2. 没有防火墙阻止连接';
    } else if (error.message.includes('HTTP')) {
      errorMsg = `后端服务返回错误: ${error.message}`;
    } else {
      errorMsg = `错误: ${error.message}`;
    }
    
    appendMessage(errorMsg, 'assistant');
  }
}

function appendMessage(content, type, isHtml = false, rawContent = null) {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const div = document.createElement('div');
  div.id = id;
  div.className = `message ${type}`;
  
  // Store raw content for copy/download
  if (rawContent) {
    div.dataset.rawContent = rawContent;
  } else if (!isHtml) {
    div.dataset.rawContent = content;
  }
  
  if (type === 'assistant' && !isHtml) {
    // Use Markdown rendering for assistant messages
    const renderedContent = renderMarkdown(content);
    div.innerHTML = `<div class="markdown-content">${renderedContent}</div>`;
    div.innerHTML += createMessageActions(id, true);
  } else if (type === 'user') {
    div.innerHTML = `<p>${escapeHtml(content)}</p>`;
    div.innerHTML += createMessageActions(id, false);
  } else if (isHtml) {
    div.innerHTML = content;
    // Add actions if it's an assistant message with HTML
    if (type === 'assistant' && !content.includes('loading')) {
      div.innerHTML += createMessageActions(id, true);
    }
  } else {
    div.innerHTML = `<p>${escapeHtml(content)}</p>`;
  }
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Apply syntax highlighting to code blocks
  if (typeof hljs !== 'undefined') {
    div.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }
  
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

// ==================== Markdown Rendering ====================

/**
 * Configure marked.js for rendering
 */
function initMarkdownRenderer() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      highlight: function(code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {}
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
  }
}

/**
 * Render markdown content with code block enhancements
 */
function renderMarkdown(text) {
  if (typeof marked === 'undefined') {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  
  try {
    let html = marked.parse(text);
    
    // Wrap code blocks with copy button
    html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
      return `<div class="code-block-wrapper">
        <button class="code-copy-btn" onclick="copyCodeBlock(this)">复制</button>
        <pre><code${attrs}>${code}</code></pre>
      </div>`;
    });
    
    return html;
  } catch (e) {
    console.error('Markdown render error:', e);
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

/**
 * Copy code block content
 */
window.copyCodeBlock = function(btn) {
  const codeBlock = btn.parentElement.querySelector('code');
  if (codeBlock) {
    navigator.clipboard.writeText(codeBlock.textContent).then(() => {
      const originalText = btn.textContent;
      btn.textContent = '已复制!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
  }
};

// ==================== Attachment Handling ====================

/**
 * Handle file selection
 */
function handleFileSelect(files, type) {
  for (const file of files) {
    if (type === 'image') {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) {
        showToast('图片大小不能超过10MB', 'warning');
        continue;
      }
    } else {
      if (file.size > 20 * 1024 * 1024) {
        showToast('文件大小不能超过20MB', 'warning');
        continue;
      }
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const attachment = {
        id: `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        name: file.name,
        mimeType: file.type,
        content: e.target.result, // base64 data URL
        size: file.size
      };
      attachments.push(attachment);
      renderAttachments();
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Render attachments preview
 */
function renderAttachments() {
  if (!attachmentsPreview) return;
  
  if (attachments.length === 0) {
    attachmentsPreview.style.display = 'none';
    attachmentsPreview.innerHTML = '';
    return;
  }
  
  attachmentsPreview.style.display = 'flex';
  attachmentsPreview.innerHTML = attachments.map(att => {
    if (att.type === 'image') {
      return `
        <div class="attachment-item image-attachment" data-id="${att.id}">
          <img src="${att.content}" alt="${escapeHtml(att.name)}">
          <button class="attachment-remove" onclick="removeAttachment('${att.id}')">&times;</button>
        </div>
      `;
    } else {
      const icon = getFileIcon(att.mimeType);
      return `
        <div class="attachment-item" data-id="${att.id}">
          <span class="attachment-icon">${icon}</span>
          <span class="attachment-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</span>
          <button class="attachment-remove" onclick="removeAttachment('${att.id}')">&times;</button>
        </div>
      `;
    }
  }).join('');
}

/**
 * Get file icon based on mime type
 */
function getFileIcon(mimeType) {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('text')) return '📃';
  return '📎';
}

/**
 * Remove an attachment
 */
window.removeAttachment = function(id) {
  attachments = attachments.filter(a => a.id !== id);
  renderAttachments();
};

/**
 * Clear all attachments
 */
function clearAttachments() {
  attachments = [];
  renderAttachments();
}

// ==================== Web Search Toggle ====================

/**
 * Toggle web search mode
 */
function toggleWebSearch() {
  webSearchEnabled = !webSearchEnabled;
  if (webSearchToggle) {
    webSearchToggle.classList.toggle('active', webSearchEnabled);
  }
  showToast(webSearchEnabled ? '联网搜索已开启' : '联网搜索已关闭', 'info', 2000);
}

// ==================== Model Selection ====================

/**
 * Change current AI model/provider
 */
async function changeProvider(provider) {
  if (provider === currentProvider) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    
    if (response.ok) {
      currentProvider = provider;
      showToast(`已切换到 ${provider.toUpperCase()}`, 'success');
      await checkConnection();
    } else {
      showToast('切换模型失败', 'error');
      // Reset selector to current provider
      if (chatModelSelector) chatModelSelector.value = currentProvider;
    }
  } catch (error) {
    console.error('Change provider error:', error);
    showToast('切换模型失败', 'error');
    if (chatModelSelector) chatModelSelector.value = currentProvider;
  }
}

// ==================== Textarea Auto-resize ====================

/**
 * Auto-resize textarea based on content
 */
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// ==================== Message Action Functions ====================

/**
 * Quote a message into the input
 */
window.quoteMessage = function(messageId) {
  const messageEl = document.getElementById(messageId);
  if (!messageEl) return;
  
  const content = messageEl.querySelector('.markdown-content')?.textContent || 
                  messageEl.querySelector('p')?.textContent || '';
  
  if (chatInput) {
    const quotedText = content.split('\n').map(line => `> ${line}`).join('\n');
    chatInput.value = quotedText + '\n\n';
    chatInput.focus();
    autoResizeTextarea(chatInput);
  }
};

/**
 * Continue the conversation
 */
window.continueMessage = function() {
  if (chatInput) {
    chatInput.value = '请继续';
    sendChatMessage('请继续');
  }
};

/**
 * Copy message content
 */
window.copyMessage = function(messageId) {
  const messageEl = document.getElementById(messageId);
  if (!messageEl) return;
  
  // Get raw content from data attribute or text content
  const rawContent = messageEl.dataset.rawContent || 
                     messageEl.querySelector('.markdown-content')?.textContent ||
                     messageEl.querySelector('p')?.textContent || '';
  
  navigator.clipboard.writeText(rawContent).then(() => {
    showToast('已复制到剪贴板', 'success', 2000);
  });
};

/**
 * Delete a message from session
 */
window.deleteMessage = async function(messageId) {
  if (!confirm('确定要删除这条消息吗？')) return;
  
  const messageEl = document.getElementById(messageId);
  if (messageEl) {
    messageEl.remove();
    showToast('消息已删除', 'info', 2000);
    
    // TODO: Also delete from backend session
  }
};

/**
 * Regenerate the last assistant response
 */
window.regenerateMessage = function(messageId) {
  if (!lastUserMessage) {
    showToast('无法重新生成', 'warning');
    return;
  }
  
  // Remove the message to regenerate
  const messageEl = document.getElementById(messageId);
  if (messageEl) {
    messageEl.remove();
  }
  
  // Resend the last user message
  sendChatMessage(lastUserMessage);
};

/**
 * Download message as markdown file
 */
window.downloadMessage = function(messageId) {
  const messageEl = document.getElementById(messageId);
  if (!messageEl) return;
  
  const rawContent = messageEl.dataset.rawContent || 
                     messageEl.querySelector('.markdown-content')?.textContent ||
                     messageEl.querySelector('p')?.textContent || '';
  
  const blob = new Blob([rawContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `message_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('已下载', 'success', 2000);
};

/**
 * Create message action buttons HTML (icon-only for sidebar responsiveness)
 */
function createMessageActions(messageId, isAssistant = true) {
  if (isAssistant) {
    return `
      <div class="message-actions">
        <button class="message-action-btn" onclick="quoteMessage('${messageId}')" title="引用">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/>
          </svg>
        </button>
        <button class="message-action-btn" onclick="continueMessage()" title="继续">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button class="message-action-btn" onclick="copyMessage('${messageId}')" title="复制">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="message-action-btn danger" onclick="deleteMessage('${messageId}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <button class="message-action-btn" onclick="regenerateMessage('${messageId}')" title="重新生成">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 16h5v5"/>
          </svg>
        </button>
        <button class="message-action-btn" onclick="downloadMessage('${messageId}')" title="下载">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    `;
  } else {
    return `
      <div class="message-actions">
        <button class="message-action-btn" onclick="copyMessage('${messageId}')" title="复制">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="message-action-btn danger" onclick="deleteMessage('${messageId}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }
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
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage(chatInput.value);
  }
});

// Textarea auto-resize
chatInput.addEventListener('input', () => {
  autoResizeTextarea(chatInput);
});

// Model selector
if (chatModelSelector) {
  chatModelSelector.addEventListener('change', (e) => {
    changeProvider(e.target.value);
  });
}

// File upload buttons
if (attachFileBtn) {
  attachFileBtn.addEventListener('click', () => {
    fileInput.click();
  });
}

if (attachImageBtn) {
  attachImageBtn.addEventListener('click', () => {
    imageInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files, 'file');
      e.target.value = ''; // Reset for re-selecting same file
    }
  });
}

if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files, 'image');
      e.target.value = ''; // Reset for re-selecting same file
    }
  });
}

// Web search toggle
if (webSearchToggle) {
  webSearchToggle.addEventListener('click', toggleWebSearch);
}

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
  // Initialize Markdown renderer
  initMarkdownRenderer();
  
  // Initialize theme first
  await initTheme();
  
  // Load backend URL and auth token from storage
  const urlStored = await chrome.storage.local.get(['backendUrl', 'authToken']);
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
  
  // Check auth status and show login indicator
  await checkExtensionAuthStatus();
  
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
