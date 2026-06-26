import playwright from "playwright-core";

const browser = await playwright.chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((item) => item.url().includes("/dashboard/bookmarks"));

const timings = [];
for (let attempt = 0; attempt < 3; attempt += 1) {
  await page.reload({ waitUntil: "commit" });
  const start = Date.now();
  const result = await page.evaluate(async () => {
    const extensionIds = [
      "iikmkjmpaadaobahmlepeloendndfphd",
      "bmmjjmpmhadcoebhenfhielebpollmnn",
    ];

    function sendBridge(message) {
      return new Promise((resolve) => {
        const requestId = `x-${Date.now()}`;
        const timer = window.setTimeout(() => resolve(null), 2500);
        function handler(event) {
          if (event.data?.requestId === requestId) {
            window.clearTimeout(timer);
            window.removeEventListener("message", handler);
            resolve(event.data.response);
          }
        }
        window.addEventListener("message", handler);
        window.postMessage(
          {
            source: "smart-favorites-web",
            type: "smart-favorites-extension-bridge-request",
            requestId,
            ...message,
          },
          location.origin
        );
      });
    }

    function sendExternal(extensionId, message) {
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => resolve(null), 2500);
        chrome.runtime.sendMessage(extensionId, message, (response) => {
          window.clearTimeout(timer);
          resolve(chrome.runtime.lastError ? null : response);
        });
      });
    }

    const bridge = await sendBridge({ action: "ping" });
    if (bridge?.installed && bridge.extensionId) {
      return { via: "bridge", extensionId: bridge.extensionId };
    }

    for (const extensionId of extensionIds) {
      const response = await sendExternal(extensionId, { action: "ping" });
      if (response?.installed) {
        return { via: "external", extensionId };
      }
    }

    return null;
  });
  timings.push({ ms: Date.now() - start, result });
}

console.log(JSON.stringify(timings, null, 2));
await browser.close();
