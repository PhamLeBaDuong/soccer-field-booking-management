import { ROUTES } from "./constants";

export function isManagementRoute(pathname: string) {
  return pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);
}

export function isNavigationActive(pathname: string, href: string) {
  if (href === ROUTES.admin || href === ROUTES.home) return pathname === href;
  if (href === ROUTES.fields && pathname === ROUTES.home) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionNavigation(management: boolean, isAdmin: boolean) {
  if (management) return [
    { href: ROUTES.myVenues, label: "nav.myVenues", icon: "venues" },
    ...(isAdmin ? [
      { href: ROUTES.adminOverview, label: "nav.overview", icon: "dashboard" },
      { href: ROUTES.adminComplexes, label: "nav.allComplexes", icon: "venues" },
      { href: ROUTES.adminFields, label: "nav.allFields", icon: "fields" },
    ] : []),
  ];
  return [
    { href: ROUTES.dashboard, label: "nav.dashboard", icon: "dashboard" },
    { href: ROUTES.home, label: "nav.fields", icon: "fields" },
    { href: ROUTES.bookings, label: "nav.bookings", icon: "bookings" },
    { href: ROUTES.teams, label: "nav.teams", icon: "teams" },
    { href: ROUTES.matching, label: "nav.matches", icon: "matches" },
    { href: ROUTES.lobbies, label: "nav.lobbies", icon: "lobbies" },
    { href: ROUTES.history, label: "nav.history", icon: "history" },
  ];
}
