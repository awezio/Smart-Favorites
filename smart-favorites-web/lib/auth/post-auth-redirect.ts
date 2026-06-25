const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

export const ONBOARDING_SETTINGS_PATH = "/dashboard/settings?onboarding=1";

export function isRecentlyCreatedUser(createdAt: string | undefined): boolean {
  if (!createdAt) {
    return false;
  }

  return Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS;
}

export function getPostAuthRedirectPath(
  user: { created_at?: string } | null,
  defaultRedirect: string
): string {
  if (user && isRecentlyCreatedUser(user.created_at)) {
    return ONBOARDING_SETTINGS_PATH;
  }

  return defaultRedirect;
}
