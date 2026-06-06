"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Extension Connect Page
 * When user visits with ?ext_id=xxx, if logged in, redirects to extension with an extension-scoped token.
 * If not logged in, redirects to /login with return URL.
 */
function ExtensionAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extId = searchParams.get("ext_id");

  useEffect(() => {
    if (!extId) {
      router.replace("/login");
      return;
    }

    const run = async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.replace(`/login?redirect=${encodeURIComponent(`/auth/extension?ext_id=${extId}`)}`);
        return;
      }

      const tokenResponse = await fetch("/api/auth/extension/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionId: extId }),
      });

      if (!tokenResponse.ok) {
        router.replace(`/login?redirect=${encodeURIComponent(`/auth/extension?ext_id=${extId}`)}`);
        return;
      }

      const { token } = await tokenResponse.json();
      const callbackUrl = `chrome-extension://${extId}/auth-callback.html`;
      const hash = new URLSearchParams({
        extensionToken: token,
      }).toString();

      window.location.href = `${callbackUrl}#${hash}`;
    };

    run();
  }, [extId, router]);

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
