/**
 * Extension auth callback - receives tokens from Web OAuth redirect and stores them.
 */
(function () {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresAt = params.get('expires_at');

  if (accessToken && refreshToken) {
    chrome.storage.local.set({
      authToken: accessToken,
      supabaseRefreshToken: refreshToken,
      supabaseExpiresAt: expiresAt || '0',
    }, () => {
      console.log('Extension auth: session stored');
      setTimeout(() => window.close(), 800);
    });
  } else {
    document.querySelector('.box').innerHTML = '<p style="color:#ef4444">连接失败，未获取到 token</p>';
  }
})();
