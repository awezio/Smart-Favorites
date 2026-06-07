/**
 * Extension auth callback - receives an extension-scoped token from Web and stores it.
 */
(function () {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const extensionToken = params.get('extensionToken');
  const accessToken = params.get('access_token');

  if (extensionToken || accessToken) {
    chrome.storage.local.set({
      authToken: extensionToken || accessToken,
      extensionToken: extensionToken || accessToken,
    }, () => {
      console.log('Extension auth: extensionToken stored');
      chrome.runtime.sendMessage({ action: 'extensionAuthChanged' }).catch(() => {});
      setTimeout(() => window.close(), 800);
    });
  } else {
    document.querySelector('.box').innerHTML = '<p style="color:#ef4444">连接失败，未获取到 token</p>';
  }
})();
