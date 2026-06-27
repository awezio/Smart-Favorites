export const DASHBOARD_NAV_COLLAPSED_KEY = "dashboard-nav-collapsed";

export function readDashboardNavCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DASHBOARD_NAV_COLLAPSED_KEY) === "true";
}

export function writeDashboardNavCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DASHBOARD_NAV_COLLAPSED_KEY, collapsed ? "true" : "false");
}
