/**
 * Smart Favorites v1.1 Background Service Worker
 * Handles side panel, auto-sync, scheduled sync, and bookmark change monitoring
 */

const API_BASE_URL = 'http://localhost:8000';

// ==================== Side Panel Setup (runs on every service worker start) ====================

// Set side panel behavior immediately when service worker starts
// This ensures clicking the extension icon opens the side panel
(async () => {
  try {
    // Enable side panel to open on action click
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('Side panel behavior set: openPanelOnActionClick = true');
  } catch (error) {
    console.error('Failed to set side panel behavior:', error);
  }
})();

// ==================== Initialization ====================

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Smart Favorites v1.1 installed');
    
    // Set default settings
    await chrome.storage.local.set({
      syncMode: 'manual',
      syncInterval: 60,
      lastSync: null,
      bookmarkCount: 0,
      themeMode: 'dark'
    });
    
    // Enable side panel on all tabs
    await chrome.sidePanel.setOptions({
      enabled: true
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('Smart Favorites updated to v1.1');
  }
});

// ==================== Message Handling ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'checkConnection':
      checkConnection().then(sendResponse);
      return true;
      
    case 'getBookmarks':
      chrome.bookmarks.getTree().then(sendResponse);
      return true;
      
    case 'search':
      searchBookmarks(request.query).then(sendResponse);
      return true;
      
    case 'chat':
      sendChatMessage(request.message).then(sendResponse);
      return true;
      
    case 'updateSyncMode':
      updateSyncMode(request.mode, request.interval);
      sendResponse({ success: true });
      return true;
      
    case 'updateSyncInterval':
      updateSyncInterval(request.interval);
      sendResponse({ success: true });
      return true;
      
    case 'triggerSync':
      syncBookmarks().then(sendResponse);
      return true;
      
    case 'closeSidePanel':
      // Close the side panel by disabling and re-enabling it
      chrome.sidePanel.setOptions({ enabled: false }).then(() => {
        chrome.sidePanel.setOptions({ enabled: true });
      });
      sendResponse({ success: true });
      return true;
  }
});

// ==================== Sync Functions ====================

async function syncBookmarks() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const htmlContent = convertBookmarkTreeToHtml(bookmarkTree);
    
    const response = await fetch(`${API_BASE_URL}/api/bookmarks/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html_content: htmlContent, replace_existing: true })
    });
    
    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    
    await chrome.storage.local.set({
      lastSync: Date.now(),
      bookmarkCount: data.total_imported
    });
    
    console.log(`Sync completed: ${data.total_imported} bookmarks`);
    return { success: true, count: data.total_imported };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
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
      const title = node.title || 'Untitled';
      result += `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(title)}</A>\n`;
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

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== Sync Mode Management ====================

async function updateSyncMode(mode, interval) {
  await chrome.storage.local.set({ syncMode: mode });
  
  // Clear existing alarm
  await chrome.alarms.clear('scheduledSync');
  
  if (mode === 'scheduled' && interval) {
    // Create new scheduled alarm
    chrome.alarms.create('scheduledSync', { periodInMinutes: interval });
    console.log(`Scheduled sync set for every ${interval} minutes`);
  }
  
  console.log(`Sync mode updated to: ${mode}`);
}

async function updateSyncInterval(interval) {
  await chrome.storage.local.set({ syncInterval: interval });
  
  const settings = await chrome.storage.local.get(['syncMode']);
  if (settings.syncMode === 'scheduled') {
    await chrome.alarms.clear('scheduledSync');
    chrome.alarms.create('scheduledSync', { periodInMinutes: interval });
    console.log(`Sync interval updated to ${interval} minutes`);
  }
}

// ==================== Alarm Handler ====================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'scheduledSync') {
    console.log('Scheduled sync triggered');
    await syncBookmarks();
  }
});

// ==================== Bookmark Change Listeners ====================

async function handleBookmarkChange(changeType, details) {
  const settings = await chrome.storage.local.get(['syncMode']);
  
  if (settings.syncMode === 'auto') {
    console.log(`Bookmark ${changeType}, auto-syncing...`);
    // Debounce: wait a bit before syncing to batch multiple changes
    await chrome.alarms.clear('autoSyncDebounce');
    chrome.alarms.create('autoSyncDebounce', { delayInMinutes: 0.1 }); // 6 seconds
  }
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  handleBookmarkChange('created', { id, bookmark });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  handleBookmarkChange('removed', { id, removeInfo });
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  handleBookmarkChange('changed', { id, changeInfo });
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  handleBookmarkChange('moved', { id, moveInfo });
});

// Handle debounced auto-sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoSyncDebounce') {
    console.log('Debounced auto-sync triggered');
    await syncBookmarks();
  }
});

// ==================== API Functions ====================

async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      return { connected: true, model: data.model || 'Unknown' };
    }
  } catch (error) {
    console.error('Connection check failed:', error);
  }
  return { connected: false };
}

async function searchBookmarks(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 10 })
    });
    
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return { error: error.message };
  }
}

async function sendChatMessage(message) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, include_sources: true })
    });
    
    if (!response.ok) throw new Error('Chat failed');
    return await response.json();
  } catch (error) {
    console.error('Chat error:', error);
    return { error: error.message };
  }
}

// ==================== Startup ====================

// Initialize sync mode on startup
chrome.storage.local.get(['syncMode', 'syncInterval']).then(settings => {
  if (settings.syncMode === 'scheduled' && settings.syncInterval) {
    chrome.alarms.create('scheduledSync', { periodInMinutes: settings.syncInterval });
    console.log(`Scheduled sync initialized for every ${settings.syncInterval} minutes`);
  }
});

console.log('Smart Favorites background service started');
