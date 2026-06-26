import "server-only";

import {
  maskSensitiveSnapshotText,
  type SnapshotPage,
} from "@/lib/snapshots/redaction";

type NavigableSnapshotPage = SnapshotPage & {
  goto(
    url: string,
    options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeout?: number }
  ): Promise<unknown>;
  waitForLoadState?(
    state: "load" | "domcontentloaded" | "networkidle",
    options?: { timeout?: number }
  ): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  url(): string;
};

const BOT_CHALLENGE_PATTERN =
  /verifying your browser|just a moment|checking your browser|cf-browser-verification|attention required|cloudflare/i;

export type PagePrepareResult = {
  fetchedUrl: string;
  redaction: { maskedInputs: number; maskedTextNodes: number };
};

export async function preparePageForSnapshot(
  page: NavigableSnapshotPage,
  url: string
): Promise<PagePrepareResult> {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  if (page.waitForLoadState) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch {
      // Heavy sites may never reach networkidle; domcontentloaded is enough.
    }
  } else {
    await page.waitForTimeout(1200);
  }

  await page.waitForTimeout(800);

  if (await detectBotChallengePage(page)) {
    throw new Error(
      "Bot verification page detected. Snapshot was not saved to avoid capturing a challenge screen."
    );
  }

  const redaction = await maskSensitiveSnapshotText(page);

  return {
    fetchedUrl: page.url(),
    redaction,
  };
}

export async function detectBotChallengePage(page: SnapshotPage): Promise<boolean> {
  const sample = await page.evaluate(() => {
    const title = document.title || "";
    const body = document.body?.innerText?.slice(0, 2500) || "";
    return `${title}\n${body}`;
  });
  return BOT_CHALLENGE_PATTERN.test(sample);
}
