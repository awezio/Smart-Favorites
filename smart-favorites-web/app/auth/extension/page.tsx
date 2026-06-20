"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type ExtensionRuntime = {
  runtime?: {
    sendMessage?: (
      extensionId: string,
      message: Record<string, unknown>,
      callback?: (response?: { success?: boolean; error?: string }) => void
    ) => void;
    lastError?: { message?: string };
  };
};

/**
 * Extension Connect Page
 * When user visits with ?ext_id=xxx, if logged in, sends an extension-scoped token to the extension.
 * If not logged in, redirects to /login with return URL.
 */
function ExtensionAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extId = searchParams.get("ext_id");
  const redirectUri = searchParams.get("redirect_uri");

  useEffect(() => {
    if (!extId) {
      router.replace("/login");
      return;
    }

    const run = async () => {
      const returnPath = `/auth/extension?${new URLSearchParams({
        ext_id: extId,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      }).toString()}`;
      let accessToken = "";

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token || "";
      } catch {
        // The server API below can still resolve auth from Supabase SSR cookies.
      }

      const tokenResponse = await fetch("/api/auth/extension/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ extensionId: extId }),
      });

      if (!tokenResponse.ok) {
        router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
        return;
      }

      const { token } = await tokenResponse.json();
      const runtime = (window as Window & { chrome?: ExtensionRuntime }).chrome?.runtime;
      const callbackUrl =
        redirectUri &&
        (redirectUri.startsWith(`https://${extId}.chromiumapp.org/`) ||
          redirectUri.startsWith(`chrome-extension://${extId}/`))
          ? redirectUri
          : `chrome-extension://${extId}/auth-callback.html`;
      const callbackHash = new URLSearchParams({
        extensionToken: token,
        backendUrl: window.location.origin,
      }).toString();

      const redirectToExtensionCallback = () => {
        window.location.href = `${callbackUrl}#${callbackHash}`;
      };

      if (!runtime?.sendMessage) {
        redirectToExtensionCallback();
        return;
      }

      runtime.sendMessage(
        extId,
        {
          action: "smartFavoritesExtensionAuth",
          token,
        },
        (response) => {
          const lastError = runtime.lastError;
          if (lastError || !response?.success) {
            redirectToExtensionCallback();
            return;
          }

          redirectToExtensionCallback();
        }
      );
    };

    run();
  }, [extId, redirectUri, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">正在连接扩展...</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          即将跳转到浏览器扩展
        </p>
      </div>
    </div>
  );
}

export default function ExtensionAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <ExtensionAuthContent />
    </Suspense>
  );
}
