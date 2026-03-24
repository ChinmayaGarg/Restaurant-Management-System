import type { AuthenticatedUser } from "@/types/auth";

type NavKey =
  | "dashboard"
  | "tables"
  | "orders"
  | "serviceRequests"
  | "billing"
  | "notifications"
  | "kitchen";

type ActionKey =
  | "tables.view"
  | "tables.openSession"
  | "tables.closeSession"
  | "tables.updateStatus"
  | "orders.view"
  | "orders.create"
  | "orders.updateStatus"
  | "serviceRequests.view"
  | "serviceRequests.create"
  | "serviceRequests.acknowledge"
  | "serviceRequests.resolve"
  | "serviceRequests.escalate"
  | "billing.view"
  | "billing.generate"
  | "billing.close"
  | "payments.view"
  | "payments.markCash"
  | "payments.markCard"
  | "notifications.view"
  | "notifications.markRead"
  | "kitchen.view"
  | "kitchen.updateStatus"
  | "kitchen.updateItemAvailability";

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

const ROLE_ACTION_ACCESS: Record<string, ActionKey[]> = {
  Owner: [
    "tables.view",
    "tables.openSession",
    "tables.closeSession",
    "tables.updateStatus",
    "orders.view",
    "orders.create",
    "orders.updateStatus",
    "serviceRequests.view",
    "serviceRequests.create",
    "serviceRequests.acknowledge",
    "serviceRequests.resolve",
    "serviceRequests.escalate",
    "billing.view",
    "billing.generate",
    "billing.close",
    "payments.view",
    "payments.markCash",
    "payments.markCard",
    "notifications.view",
    "notifications.markRead",
    "kitchen.view",
    "kitchen.updateStatus",
    "kitchen.updateItemAvailability",
  ],
  Manager: [
    "tables.view",
    "tables.openSession",
    "tables.closeSession",
    "tables.updateStatus",
    "orders.view",
    "orders.create",
    "orders.updateStatus",
    "serviceRequests.view",
    "serviceRequests.create",
    "serviceRequests.acknowledge",
    "serviceRequests.resolve",
    "serviceRequests.escalate",
    "billing.view",
    "billing.generate",
    "billing.close",
    "payments.view",
    "payments.markCash",
    "payments.markCard",
    "notifications.view",
    "notifications.markRead",
    "kitchen.view",
    "kitchen.updateStatus",
    "kitchen.updateItemAvailability",
  ],
  Server: [
    "tables.view",
    "tables.openSession",
    "tables.closeSession",
    "tables.updateStatus",
    "orders.view",
    "orders.create",
    "orders.updateStatus",
    "serviceRequests.view",
    "serviceRequests.create",
    "serviceRequests.acknowledge",
    "serviceRequests.resolve",
    "serviceRequests.escalate",
    "notifications.view",
    "notifications.markRead",
  ],
  Cashier: [
    "billing.view",
    "billing.generate",
    "billing.close",
    "payments.view",
    "payments.markCash",
    "payments.markCard",
    "notifications.view",
    "notifications.markRead",
  ],
  Kitchen: [
    "kitchen.view",
    "kitchen.updateStatus",
    "kitchen.updateItemAvailability",
    "notifications.view",
    "notifications.markRead",
  ],
  Admin: [
    "tables.view",
    "tables.openSession",
    "tables.closeSession",
    "tables.updateStatus",
    "orders.view",
    "orders.create",
    "orders.updateStatus",
    "serviceRequests.view",
    "serviceRequests.create",
    "serviceRequests.acknowledge",
    "serviceRequests.resolve",
    "serviceRequests.escalate",
    "billing.view",
    "billing.generate",
    "billing.close",
    "payments.view",
    "payments.markCash",
    "payments.markCard",
    "notifications.view",
    "notifications.markRead",
    "kitchen.view",
    "kitchen.updateStatus",
    "kitchen.updateItemAvailability",
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

export function getAllowedActions(
  user: AuthenticatedUser | null,
): Set<ActionKey> {
  if (!user) return new Set();

  const allowed = new Set<ActionKey>();

  for (const role of user.roles) {
    const keys = ROLE_ACTION_ACCESS[role] ?? [];
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

export function canDoAction(
  user: AuthenticatedUser | null,
  action: ActionKey,
): boolean {
  return getAllowedActions(user).has(action);
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
