import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { maskSensitiveSnapshotText } from "@/lib/snapshots/redaction";

export const BOOKMARK_SNAPSHOT_BUCKET = "bookmark_snapshots";

// Keep in sync with the @sparticuz/chromium version in package.json.
const SPARTICUZ_CHROMIUM_VERSION = "149.0.0";
const DEFAULT_SERVERLESS_CHROMIUM_PACK_URL = `https://github.com/Sparticuz/chromium/releases/download/v${SPARTICUZ_CHROMIUM_VERSION}/chromium-v${SPARTICUZ_CHROMIUM_VERSION}-pack.x64.tar`;

export type BookmarkSnapshotResult = {
  snapshot_url: string | null;
  snapshot_storage_path: string | null;
  snapshot_taken_at: string | null;
  snapshot_status: "ready" | "failed" | "unavailable";
  snapshot_error: string | null;
  snapshot_metadata: Record<string, unknown>;
};

type CaptureInput = {
  bookmarkId: string;
  userId: string;
  url: string;
  title?: string;
};

type PlaywrightLaunchConfig = {
  chromium: typeof import("playwright-core").chromium;
  launchOptions: Parameters<
    typeof import("playwright-core").chromium.launch
  >[0];
};

export async function captureBookmarkSnapshot({
  bookmarkId,
  userId,
  url,
  title,
}: CaptureInput): Promise<BookmarkSnapshotResult> {
  const normalized = normalizePublicHttpUrl(url);
  if (!normalized.ok) {
    return snapshotFailure("failed", normalized.error, {
      original_url: url,
      title,
    });
  }

  let browser: Awaited<
    ReturnType<typeof import("playwright-core").chromium.launch>
  > | null = null;
  try {
    const runtime = await loadPlaywrightRuntime();
    browser = await launchChromium(runtime);

    const page = await browser.newPage({
      viewport: { width: 1365, height: 768 },
      deviceScaleFactor: 1,
    });
    await page.goto(normalized.url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page.waitForTimeout(1200);

    const redaction = await maskSensitiveSnapshotText(page);
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
    });

    const storagePath = `${userId}/${bookmarkId}.png`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(BOOKMARK_SNAPSHOT_BUCKET)
      .upload(storagePath, Buffer.from(screenshot), {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      return snapshotFailure("failed", error.message, {
        original_url: url,
        fetched_url: page.url(),
        redaction,
      });
    }

    const takenAt = new Date().toISOString();
    return {
      snapshot_url: `/api/bookmarks/snapshot-page?id=${encodeURIComponent(bookmarkId)}`,
      snapshot_storage_path: storagePath,
      snapshot_taken_at: takenAt,
      snapshot_status: "ready",
      snapshot_error: null,
      snapshot_metadata: {
        original_url: url,
        fetched_url: page.url(),
        title,
        viewport: { width: 1365, height: 768 },
        redaction,
        generated_at: takenAt,
        runtime: runtime.runtimeLabel,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Snapshot capture failed.";
    const missingRuntime =
      /Snapshot runtime is unavailable|Cannot find package|Cannot find module|ERR_MODULE_NOT_FOUND|playwright|ENOENT|executable/i.test(
        message
      );
    return snapshotFailure(missingRuntime ? "unavailable" : "failed", message, {
      original_url: url,
      title,
      requires_runtime: "playwright-core",
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

function isServerlessSnapshotEnvironment() {
  if (process.env.SNAPSHOT_USE_SERVERLESS_CHROMIUM === "1") {
    return true;
  }
  if (process.env.SNAPSHOT_USE_SERVERLESS_CHROMIUM === "0") {
    return false;
  }
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV
  );
}

async function loadPlaywrightRuntime(): Promise<
  PlaywrightLaunchConfig & { runtimeLabel: string }
> {
  if (isServerlessSnapshotEnvironment()) {
    return loadServerlessPlaywrightRuntime();
  }
  return loadLocalPlaywrightRuntime();
}

async function loadServerlessPlaywrightRuntime(): Promise<
  PlaywrightLaunchConfig & { runtimeLabel: string }
> {
  try {
    const [{ chromium }, serverlessChromium] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium"),
    ]);

    if (!chromium) {
      throw new Error("playwright-core chromium runtime is unavailable.");
    }

    const chromiumPkg = serverlessChromium.default;
    chromiumPkg.setGraphicsMode = false;

    const chromiumInput =
      process.env.CHROMIUM_PATH ||
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      process.env.CHROMIUM_REMOTE_EXEC_PATH ||
      DEFAULT_SERVERLESS_CHROMIUM_PACK_URL;
    const executablePath = await chromiumPkg.executablePath(chromiumInput);

    return {
      chromium,
      runtimeLabel: "serverless-chromium",
      launchOptions: {
        headless: true,
        args: chromiumPkg.args,
        executablePath,
      },
    };
  } catch (error: unknown) {
    throw new Error(
      `Snapshot runtime is unavailable. ${runtimeErrorMessage(error)}`
    );
  }
}

async function loadLocalPlaywrightRuntime(): Promise<
  PlaywrightLaunchConfig & { runtimeLabel: string }
> {
  try {
    const { chromium } = await import("playwright-core");
    if (!chromium) {
      throw new Error("playwright-core chromium runtime is unavailable.");
    }

    const explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    if (explicitPath) {
      return {
        chromium,
        runtimeLabel: "local-executable-path",
        launchOptions: {
          headless: true,
          executablePath: explicitPath,
        },
      };
    }

    const channel =
      process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?.trim() || "chrome";

    return {
      chromium,
      runtimeLabel: `local-channel:${channel}`,
      launchOptions: {
        headless: true,
        channel,
      },
    };
  } catch (error: unknown) {
    throw new Error(
      `Snapshot runtime is unavailable. ${runtimeErrorMessage(error)}`
    );
  }
}

async function launchChromium(runtime: PlaywrightLaunchConfig) {
  try {
    return await runtime.chromium.launch(runtime.launchOptions);
  } catch (firstError) {
    const channel = runtime.launchOptions?.channel;
    if (channel === "chrome") {
      return runtime.chromium.launch({ headless: true, channel: "msedge" });
    }
    if (channel === "msedge") {
      throw enrichLocalBrowserError(firstError);
    }
    throw firstError;
  }
}

function enrichLocalBrowserError(error: unknown) {
  const base =
    error instanceof Error ? error.message : "Chromium could not be launched.";
  return new Error(
    `${base} Install Google Chrome or Microsoft Edge locally, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to a Chromium-based browser executable.`
  );
}

function runtimeErrorMessage(error: unknown) {
  const message = String(error instanceof Error ? error.message : error || "");
  if (/Cannot find package|Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message)) {
    return "The deployed function is missing the traced Chromium runtime dependency.";
  }
  return message.slice(0, 300) || "Chromium could not be initialized.";
}

function snapshotFailure(
  status: "failed" | "unavailable",
  error: string,
  metadata: Record<string, unknown>
): BookmarkSnapshotResult {
  return {
    snapshot_url: null,
    snapshot_storage_path: null,
    snapshot_taken_at: new Date().toISOString(),
    snapshot_status: status,
    snapshot_error: error,
    snapshot_metadata: {
      ...metadata,
      generated_at: new Date().toISOString(),
    },
  };
}

function normalizePublicHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false as const, error: "Only http and https URLs can be captured." };
    }
    if (isBlockedHost(parsed.hostname)) {
      return { ok: false as const, error: "Local or private network URLs are not captured." };
    }
    return { ok: true as const, url: parsed.toString() };
  } catch {
    return { ok: false as const, error: "Invalid URL." };
  }
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}
