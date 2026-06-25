export type ProviderStatusMap = Record<string, { configured?: boolean }>;

export function isAnyProviderConfigured(
  providers: ProviderStatusMap | null | undefined
): boolean {
  if (!providers) {
    return false;
  }

  return Object.values(providers).some((status) => Boolean(status?.configured));
}
