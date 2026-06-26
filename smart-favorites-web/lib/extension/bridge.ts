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

type ExtensionAuthSessionResponse = {
  token?: string;
  error?: string;
};

const EXTENSION_MESSAGE_TIMEOUT_MS = 2500;
const CONTENT_BRIDGE_REQUEST_TYPE = "smart-favorites-extension-bridge-request";
const CONTENT_BRIDGE_RESPONSE_TYPE = "smart-favorites-extension-bridge-response";
const CONTENT_BRIDGE_SOURCE = "smart-favorites-extension";
const WEB_BRIDGE_SOURCE = "smart-favorites-web";
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

function createBridgeRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `sf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sendContentScriptBridgeMessage<T>(
  message: Record<string, unknown>
): Promise<T | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const requestId = createBridgeRequestId();
    let settled = false;
    let timeoutId: number | undefined;

    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      if (timeoutId) window.clearTimeout(timeoutId);
      resolve(value);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (
        !data ||
        data.source !== CONTENT_BRIDGE_SOURCE ||
        data.type !== CONTENT_BRIDGE_RESPONSE_TYPE ||
        data.requestId !== requestId
      ) {
        return;
      }

      finish((data.response || null) as T | null);
    };

    window.addEventListener("message", handleMessage);
    timeoutId = window.setTimeout(() => finish(null), EXTENSION_MESSAGE_TIMEOUT_MS);
    window.postMessage(
      {
        source: WEB_BRIDGE_SOURCE,
        type: CONTENT_BRIDGE_REQUEST_TYPE,
        requestId,
        ...message,
      },
      window.location.origin
    );
  });
}

async function pingInstalledExtensionViaContentScript(): Promise<ExtensionPingResult | null> {
  const response = await sendContentScriptBridgeMessage<{
    installed?: boolean;
    extensionId?: string;
    version?: string;
  }>({ action: "ping" });

  if (response?.installed && response.extensionId) {
    return { extensionId: response.extensionId, version: response.version };
  }

  return null;
}

export async function pingInstalledExtension(): Promise<ExtensionPingResult | null> {
  const contentScriptResult = await pingInstalledExtensionViaContentScript();
  if (contentScriptResult) {
    return contentScriptResult;
  }

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
  const contentScriptResponse = await sendContentScriptBridgeMessage<{ success?: boolean }>(
    { action: "openSidePanel" }
  );
  if (contentScriptResponse?.success) {
    return true;
  }

  const response = await sendExtensionMessage<{ success?: boolean }>(
    extensionId,
    { action: "openSidePanel" }
  );
  return Boolean(response?.success);
}

export async function connectInstalledExtensionSession(
  extensionId: string
): Promise<boolean> {
  const tokenResponse = await fetch("/api/auth/extension/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensionId }),
  });

  if (!tokenResponse.ok) {
    return false;
  }

  const { token } = (await tokenResponse.json()) as ExtensionAuthSessionResponse;
  if (!token) {
    return false;
  }

  const contentScriptResponse = await sendContentScriptBridgeMessage<{ success?: boolean }>(
    {
      action: "smartFavoritesExtensionAuth",
      token,
      backendUrl: window.location.origin,
    }
  );
  if (contentScriptResponse?.success) {
    return true;
  }

  const response = await sendExtensionMessage<{ success?: boolean }>(
    extensionId,
    {
      action: "smartFavoritesExtensionAuth",
      token,
      backendUrl: window.location.origin,
    }
  );

  return Boolean(response?.success);
}

export async function triggerExtensionBookmarkSync(
  extensionId: string
): Promise<ExtensionSyncResult> {
  const contentScriptResponse = await sendContentScriptBridgeMessage<ExtensionSyncResult>(
    { action: "triggerSync" }
  );
  if (contentScriptResponse) {
    return contentScriptResponse;
  }

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
