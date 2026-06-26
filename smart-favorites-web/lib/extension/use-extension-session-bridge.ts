"use client";

import { useEffect } from "react";
import { connectInstalledExtensionSession } from "@/lib/extension/bridge";

const BRIDGE_READY_TYPE = "smart-favorites-extension-bridge-ready";

export function useExtensionSessionBridge() {
  useEffect(() => {
    const handleBridgeReady = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (data?.source !== "smart-favorites-extension" || data?.type !== BRIDGE_READY_TYPE) {
        return;
      }

      if (typeof data.extensionId !== "string") {
        return;
      }

      connectInstalledExtensionSession(data.extensionId).catch((error) => {
        console.warn("Failed to connect installed extension session:", error);
      });
    };

    window.addEventListener("message", handleBridgeReady);
    return () => window.removeEventListener("message", handleBridgeReady);
  }, []);
}
