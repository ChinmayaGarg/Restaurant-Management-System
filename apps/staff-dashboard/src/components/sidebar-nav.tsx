"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tables", label: "Tables" },
  { href: "/orders", label: "Orders" },
  { href: "/service-requests", label: "Service Requests" },
  { href: "/billing", label: "Billing" },
  { href: "/notifications", label: "Notifications" },
  { href: "/kitchen", label: "Kitchen" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 rounded-2xl bg-white p-4 shadow xl:w-64">
      <div className="mb-4 px-2">
        <div className="text-lg font-semibold">Staff Dashboard</div>
        <div className="text-sm text-gray-500">Restaurant Operations</div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
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
