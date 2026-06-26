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
  const targets = await fetchTargets();
  const hasBookmarks = targets.some((item) =>
    item.url?.includes("/dashboard/bookmarks")
  );

  const browser = await playwright.chromium.connectOverCDP("http://127.0.0.1:9222");
  let page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((item) => item.url().includes("/dashboard/bookmarks"));

  if (!page) {
    page = await browser.contexts()[0].newPage();
    await page.goto("https://www.smart-favorites.cc.cd/dashboard/bookmarks", {
      waitUntil: "domcontentloaded",
    });
  } else {
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  }

  const chunkUrl = await page.evaluate(() => {
    const script = [...document.querySelectorAll("script[src]")].find((node) =>
      node.src.includes("/dashboard/bookmarks/page-")
    );
    return script?.src || null;
  });
  console.log("Bookmarks chunk:", chunkUrl);

  const chunkText = chunkUrl ? await (await fetch(chunkUrl)).text() : "";
  console.log("Has ensureInstalledExtension:", chunkText.includes("ensureInstalledExtension"));
  console.log("Has handleInstallOrOpenExtension:", chunkText.includes("handleInstallOrOpenExtension"));

  await page.waitForTimeout(2000);

  const buttons = await page
    .locator("button")
    .filter({ hasText: /扩展|extension|同步|Sync/i })
    .allTextContents();
  console.log("Extension-related buttons:", buttons);

  const detectResult = await page.evaluate(async () => {
    const extensionIds = [
      "iikmkjmpaadaobahmlepeloendndfphd",
      "bmmjjmpmhadcoebhenfhielebpollmnn",
    ];

    function sendExternal(extensionId, message, timeoutMs) {
      return new Promise((resolve) => {
        const timer = window.setTimeout(() => resolve(null), timeoutMs);
        chrome.runtime.sendMessage(extensionId, message, (response) => {
          window.clearTimeout(timer);
          resolve({
            response: chrome.runtime.lastError ? null : response,
            lastError: chrome.runtime.lastError?.message || null,
          });
        });
      });
    }

    const externalFirst = await sendExternal(extensionIds[0], { action: "ping" }, 1500);
    return { externalFirst };
  });
  console.log("Extension ping:", JSON.stringify(detectResult, null, 2));

  const installButton = page
    .locator("button")
    .filter({ hasText: /安装\/打开扩展|Open extension|打开扩展/i })
    .first();

  const buttonVisible = await installButton.isVisible().catch(() => false);
  console.log("Install/open button visible:", buttonVisible);
  if (buttonVisible) {
    console.log("Install/open button text:", await installButton.textContent());
    const disabled = await installButton.isDisabled();
    console.log("Install/open button disabled:", disabled);
  }

  const openButton = page
    .locator("button")
    .filter({ hasText: /打开扩展|Open extension v/i })
    .first();
  const openVisible = await openButton.isVisible().catch(() => false);
  console.log("Open-extension button visible:", openVisible);
  if (openVisible) {
    console.log("Open-extension button text:", await openButton.textContent());
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
