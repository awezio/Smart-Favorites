/**
 * Smart Favorites Background Service Worker
 */

const API_BASE_URL = 'http://localhost:8000';

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Smart Favorites installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkConnection') {
    checkConnection().then(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getBookmarks') {
    chrome.bookmarks.getTree().then(sendResponse);
    return true;
  }
  
  if (request.action === 'search') {
    searchBookmarks(request.query).then(sendResponse);
    return true;
  }
  
  if (request.action === 'chat') {
    sendChatMessage(request.message).then(sendResponse);
    return true;
  }
});

// Check backend connection
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

// Search bookmarks via API
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

// Send chat message via API
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

// Periodic sync (optional)
chrome.alarms.create('periodicSync', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    // Auto-sync can be implemented here
    console.log('Periodic sync triggered');
  }
});
