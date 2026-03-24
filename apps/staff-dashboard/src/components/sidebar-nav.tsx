"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { canAccessNavKey } from "@/lib/access";

const navItems = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" as const },
  { href: "/tables", label: "Tables", key: "tables" as const },
  { href: "/orders", label: "Orders", key: "orders" as const },
  {
    href: "/service-requests",
    label: "Service Requests",
    key: "serviceRequests" as const,
  },
  { href: "/billing", label: "Billing", key: "billing" as const },
  {
    href: "/notifications",
    label: "Notifications",
    key: "notifications" as const,
  },
  { href: "/kitchen", label: "Kitchen", key: "kitchen" as const },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = navItems.filter((item) =>
    canAccessNavKey(user, item.key),
  );

  return (
    <aside className="w-full shrink-0 rounded-2xl bg-white p-4 shadow xl:w-64">
      <div className="mb-4 px-2">
        <div className="text-lg font-semibold">Staff Dashboard</div>
        <div className="text-sm text-gray-500">Restaurant Operations</div>
      </div>

      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
