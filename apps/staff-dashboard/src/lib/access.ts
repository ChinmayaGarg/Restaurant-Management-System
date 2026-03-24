import type { AuthenticatedUser } from "@/types/auth";

type NavKey =
  | "dashboard"
  | "tables"
  | "orders"
  | "serviceRequests"
  | "billing"
  | "notifications"
  | "kitchen";

const ROLE_NAV_ACCESS: Record<string, NavKey[]> = {
  Owner: [
    "dashboard",
    "tables",
    "orders",
    "serviceRequests",
    "billing",
    "notifications",
    "kitchen",
  ],
  Manager: [
    "dashboard",
    "tables",
    "orders",
    "serviceRequests",
    "billing",
    "notifications",
    "kitchen",
  ],
  Server: ["dashboard", "tables", "orders", "serviceRequests", "notifications"],
  Cashier: ["dashboard", "billing", "notifications"],
  Kitchen: ["dashboard", "kitchen", "notifications"],
  Admin: [
    "dashboard",
    "tables",
    "orders",
    "serviceRequests",
    "billing",
    "notifications",
    "kitchen",
  ],
};

const ROUTE_TO_NAV_KEY: Array<{ prefix: string; key: NavKey }> = [
  { prefix: "/dashboard", key: "dashboard" },
  { prefix: "/tables", key: "tables" },
  { prefix: "/orders", key: "orders" },
  { prefix: "/service-requests", key: "serviceRequests" },
  { prefix: "/billing", key: "billing" },
  { prefix: "/notifications", key: "notifications" },
  { prefix: "/kitchen", key: "kitchen" },
];

export function getAllowedNavKeys(user: AuthenticatedUser | null): Set<NavKey> {
  if (!user) return new Set();

  const allowed = new Set<NavKey>();

  for (const role of user.roles) {
    const keys = ROLE_NAV_ACCESS[role] ?? [];
    for (const key of keys) {
      allowed.add(key);
    }
  }

  return allowed;
}

export function canAccessNavKey(
  user: AuthenticatedUser | null,
  key: NavKey,
): boolean {
  return getAllowedNavKeys(user).has(key);
}

export function canAccessPath(
  user: AuthenticatedUser | null,
  pathname: string,
): boolean {
  const match = ROUTE_TO_NAV_KEY.find((item) =>
    pathname.startsWith(item.prefix),
  );

  if (!match) return true;

  return canAccessNavKey(user, match.key);
}
