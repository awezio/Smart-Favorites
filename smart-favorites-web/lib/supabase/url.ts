export function getSupabasePublicUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseHostname() {
  const url = getSupabasePublicUrl();
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function usesDefaultSupabaseCloudDomain() {
  return getSupabaseHostname().endsWith(".supabase.co");
}
