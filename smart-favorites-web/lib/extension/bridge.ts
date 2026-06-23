type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: Record<string, unknown>,
    callback: (response: unknown) => void
  ) => void;
  lastError?: { message?: string };
};

export type ExtensionPingResult = {
  extensionId: string;
  version?: string;
};

export type ExtensionSyncResult = {
  success: boolean;
  count?: number;
  error?: string;
};

const EXTENSION_MESSAGE_TIMEOUT_MS = 2500;
const DEFAULT_EXTENSION_IDS = [
  "iikmkjmpaadaobahmlepeloendndfphd",
  "bmmjjmpmhadcoebhenfhielebpollmnn",
];

function getConfiguredExtensionIds(): string[] {
  const configured =
    process.env.NEXT_PUBLIC_SMART_FAVORITES_EXTENSION_IDS ||
    process.env.NEXT_PUBLIC_SMART_FAVORITES_EXTENSION_ID ||
    "";

  return Array.from(
    new Set(
      [...configured.split(","), ...DEFAULT_EXTENSION_IDS]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function getChromeRuntime(): ChromeRuntime | null {
  if (typeof window === "undefined") {
    return null;
  }

  const chromeRef = (window as Window & { chrome?: { runtime?: ChromeRuntime } }).chrome;
  return chromeRef?.runtime ?? null;
}

function sendExtensionMessage<T>(
  extensionId: string,
  message: Record<string, unknown>
): Promise<T | null> {
  const runtime = getChromeRuntime();
  if (!runtime?.sendMessage) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: number | undefined;
    const finish = (value: T | null) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      resolve(value);
    };

    timeoutId = window.setTimeout(() => {
      finish(null);
    }, EXTENSION_MESSAGE_TIMEOUT_MS);

    try {
      runtime.sendMessage(extensionId, message, (response) => {
        if (runtime.lastError) {
          finish(null);
          return;
        }
        finish(response as T);
      });
    } catch {
      finish(null);
    }
  });
}

export async function pingInstalledExtension(): Promise<ExtensionPingResult | null> {
  for (const extensionId of getConfiguredExtensionIds()) {
    const response = await sendExtensionMessage<{
      installed?: boolean;
      version?: string;
    }>(extensionId, { action: "ping" });

    if (response?.installed) {
      return { extensionId, version: response.version };
    }
  }

  return null;
}

export async function openExtensionSidePanel(
  extensionId: string
): Promise<boolean> {
  const response = await sendExtensionMessage<{ success?: boolean }>(
    extensionId,
    { action: "openSidePanel" }
  );
  return Boolean(response?.success);
}

export async function triggerExtensionBookmarkSync(
  extensionId: string
): Promise<ExtensionSyncResult> {
  const response = await sendExtensionMessage<ExtensionSyncResult>(
    extensionId,
    { action: "triggerSync" }
  );

  if (!response) {
    return {
      success: false,
      error: "无法连接浏览器扩展，请确认扩展已安装并刷新页面。",
    };
  }

  return response;
}

export function getExtensionInstallUrl(): string {
  return "https://github.com/awezio/Smart-Favorites/releases/latest";
}
