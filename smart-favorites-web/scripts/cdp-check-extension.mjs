import http from "http";
import playwright from "playwright-core";

function fetchTargets() {
  return new Promise((resolve, reject) => {
    http
      .get("http://127.0.0.1:9222/json/list", (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

async function main() {
  const browser = await playwright.chromium.connectOverCDP("http://127.0.0.1:9222");
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((item) => item.url().includes("/dashboard/bookmarks"));

  if (!page) {
    console.log("No bookmarks page");
    await browser.close();
    return;
  }

  const basic = await page.evaluate(() => ({
    hasChrome: typeof chrome !== "undefined" && !!chrome.runtime,
    origin: location.origin,
  }));
  console.log("Page:", JSON.stringify(basic));

  const bridgeReady = await page.evaluate(() => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ error: "no bridge-ready in 2s" }), 2000);
      function handler(event) {
        if (event.data?.type === "smart-favorites-extension-bridge-ready") {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          resolve(event.data);
        }
      }
      window.addEventListener("message", handler);
    });
  });
  console.log("Bridge ready event:", JSON.stringify(bridgeReady));

  const pingResult = await page.evaluate(async () => {
    const extId = "bmmjjmpmhadcoebhenfhielebpollmnn";
    if (!chrome?.runtime?.sendMessage) {
      return { error: "no chrome.runtime.sendMessage" };
    }
    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ error: "timeout" }), 5000);
      chrome.runtime.sendMessage(extId, { action: "ping" }, (response) => {
        clearTimeout(timer);
        resolve({
          response,
          lastError: chrome.runtime.lastError?.message || null,
        });
      });
    });
  });
  console.log("External ping:", JSON.stringify(pingResult));

  const bridgePing = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      const requestId = `debug-${Date.now()}`;
      const timer = setTimeout(() => {
        window.removeEventListener("message", handler);
        resolve({ error: "bridge timeout" });
      }, 5000);
      function handler(event) {
        const data = event.data;
        if (
          data?.source === "smart-favorites-extension" &&
          data.requestId === requestId
        ) {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          resolve(data.response);
        }
      }
      window.addEventListener("message", handler);
      window.postMessage(
        {
          source: "smart-favorites-web",
          type: "smart-favorites-extension-bridge-request",
          requestId,
          action: "ping",
        },
        location.origin
      );
    });
  });
  console.log("Bridge ping:", JSON.stringify(bridgePing));

  await browser.close();
}

main().catch(console.error);
