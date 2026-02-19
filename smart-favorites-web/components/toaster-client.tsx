"use client";

import { Toaster } from "sonner";
import { useEffect, useState } from "react";

/**
 * Client-only Toaster to avoid hydration mismatch (Sonner injects DOM that differs from server).
 */
export function ToasterClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Toaster richColors position="top-right" />;
}
