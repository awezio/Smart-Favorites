import playwright from "playwright-core";

const browser = await playwright.chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts()[0].pages().find((item) => item.url().includes("/dashboard/chat"));

if (!page) {
  throw new Error("Open /dashboard/chat in Edge first.");
}

await page.bringToFront();
await page.evaluate(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.includes("chat-panels")) {
      localStorage.removeItem(key);
    }
  }
});

await page.goto(`https://www.smart-favorites.cc.cd/dashboard/chat?inspect=${Date.now()}`, {
  waitUntil: "networkidle",
  timeout: 120_000,
});
await page.keyboard.press("Control+Shift+R");
await page.waitForTimeout(5000);

const info = await page.evaluate(() => ({
  groupId: document.querySelector("[data-group]")?.id,
  panels: ["chat-session", "chat-main", "chat-sources"].map((id) => ({
    id,
    width: document.getElementById(id)?.getBoundingClientRect().width ?? 0,
    flexGrow: document.getElementById(id)
      ? getComputedStyle(document.getElementById(id)).flexGrow
      : null,
  })),
  storage: Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.includes("chat-panels"))
      .map((key) => [key, localStorage.getItem(key)])
  ),
}));

console.log(JSON.stringify(info, null, 2));
await browser.close();
