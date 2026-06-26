const REQUEST_TYPE = 'smart-favorites-extension-bridge-request';
const RESPONSE_TYPE = 'smart-favorites-extension-bridge-response';
const WEB_SOURCE = 'smart-favorites-web';
const EXTENSION_SOURCE = 'smart-favorites-extension';

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { success: true });
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

window.addEventListener('message', async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  const message = event.data;
  if (
    !message ||
    message.source !== WEB_SOURCE ||
    message.type !== REQUEST_TYPE ||
    !message.requestId
  ) {
    return;
  }

  let response;
  if (message.action === 'ping') {
    response = {
      success: true,
      installed: true,
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
    };
  } else if (message.action === 'openSidePanel') {
    response = await sendRuntimeMessage({ action: 'openSidePanelFromContent' });
  } else if (message.action === 'triggerSync') {
    response = await sendRuntimeMessage({ action: 'triggerSync' });
  } else if (message.action === 'smartFavoritesExtensionAuth' && message.token) {
    response = await sendRuntimeMessage({
      action: 'smartFavoritesExtensionAuth',
      token: message.token,
      backendUrl: message.backendUrl || window.location.origin,
    });
  } else {
    response = { success: false, error: 'Unsupported bridge action' };
  }

  window.postMessage({
    source: EXTENSION_SOURCE,
    type: RESPONSE_TYPE,
    requestId: message.requestId,
    response,
  }, window.location.origin);
});
