/**
 * Extension auth callback - receives an extension-scoped token from Web and stores it.
 */
(function () {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const extensionToken = params.get('extensionToken');
  const accessToken = params.get('access_token');
  const backendUrl = params.get('backendUrl');

  if (extensionToken || accessToken) {
    const updates = {
      authToken: extensionToken || accessToken,
      extensionToken: extensionToken || accessToken,
    };

    if (backendUrl) {
      updates.backendUrl = backendUrl.replace(/\/$/, '');
      updates.autoConnectAttemptedAt = 0;
    }

    chrome.storage.local.set(updates, () => {
      console.log('Extension auth: extensionToken stored');
      chrome.runtime.sendMessage({ action: 'extensionAuthChanged' }).catch(() => {});
      setTimeout(() => window.close(), 800);
    });
  } else {
    document.querySelector('.box').innerHTML = '<p style="color:#ef4444">连接失败，未获取到 token</p>';
  }
})();
