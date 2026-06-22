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

function getConfiguredExtensionIds(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_SMART_FAVORITES_EXTENSION_IDS ||
    process.env.NEXT_PUBLIC_SMART_FAVORITES_EXTENSION_ID ||
    "bmmjjmpmhadcoebhenfhielebpollmnn";

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
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
    try {
      runtime.sendMessage(extensionId, message, (response) => {
        if (runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response as T);
      });
    } catch {
      resolve(null);
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
