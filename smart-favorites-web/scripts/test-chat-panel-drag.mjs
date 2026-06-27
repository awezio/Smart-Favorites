import http from "node:http";
import playwright from "playwright-core";

const CDP_URL = "http://127.0.0.1:9222";
const TARGET_URL =
  process.env.CHAT_TEST_URL ?? "https://www.smart-favorites.cc.cd/dashboard/chat";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function panelWidths(page) {
  return page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll("[data-panel]"));
    return panels.map((panel) => ({
      id: panel.getAttribute("data-panel"),
      width: panel.getBoundingClientRect().width,
    }));
  });
}

async function dragHandle(page, handleIndex, deltaX) {
  const handle = page.locator('[data-separator="active"]').nth(handleIndex);
  if ((await handle.count()) === 0) {
    const fallback = page.locator("[data-separator]").nth(handleIndex);
    const box = await fallback.boundingBox();
    if (!box) {
      throw new Error(`Separator ${handleIndex} not found`);
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    return;
  }

  const box = await handle.boundingBox();
  if (!box) {
    throw new Error(`Separator ${handleIndex} has no bounding box`);
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

const targets = await fetchJson(`${CDP_URL}/json/list`);
if (!Array.isArray(targets) || targets.length === 0) {
  throw new Error("No CDP targets on port 9222");
}

const browser = await playwright.chromium.connectOverCDP(CDP_URL);
const context = browser.contexts()[0] ?? (await browser.newContext());
let page = context
  .pages()
  .find((item) => item.url().includes("/dashboard/chat"));

if (!page) {
  page = await context.newPage();
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  localStorage.removeItem("react-resizable-panels:chat-panels");
  localStorage.removeItem("react-resizable-panels:chat-panels-v2");
  localStorage.removeItem("react-resizable-panels:chat-panels-v3");
});

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-panel='chat-session']", { timeout: 60_000 });
await page.waitForTimeout(1000);

const before = await panelWidths(page);
console.log("before", before);

const sessionBefore = before.find((item) => item.id === "chat-session")?.width ?? 0;
const chatBefore = before.find((item) => item.id === "chat-main")?.width ?? 0;
const sourcesBefore = before.find((item) => item.id === "chat-sources")?.width ?? 0;

await dragHandle(page, 0, 120);
await page.waitForTimeout(400);
const afterLeftDrag = await panelWidths(page);
console.log("after-left-handle-right", afterLeftDrag);

await dragHandle(page, 1, -120);
await page.waitForTimeout(400);
const afterRightDrag = await panelWidths(page);
console.log("after-right-handle-left", afterRightDrag);

const sessionAfterLeft = afterLeftDrag.find((item) => item.id === "chat-session")?.width ?? 0;
const chatAfterLeft = afterLeftDrag.find((item) => item.id === "chat-main")?.width ?? 0;
const sourcesAfterRight = afterRightDrag.find((item) => item.id === "chat-sources")?.width ?? 0;

const leftHandleTowardCenter =
  sessionAfterLeft > sessionBefore + 20 && chatAfterLeft < chatBefore - 20;
const rightHandleTowardCenter =
  sourcesAfterRight > sourcesBefore + 20 &&
  (afterRightDrag.find((item) => item.id === "chat-main")?.width ?? 0) < chatBefore - 20;

const result = {
  target: TARGET_URL,
  leftHandleTowardCenter,
  rightHandleTowardCenter,
  pass: leftHandleTowardCenter && rightHandleTowardCenter,
  before,
  afterLeftDrag,
  afterRightDrag,
};

console.log(JSON.stringify(result, null, 2));

await browser.close();
process.exit(result.pass ? 0 : 1);
