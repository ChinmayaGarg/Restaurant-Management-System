"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { canAccessNavKey } from "@/lib/access";

const cards = [
  {
    href: "/tables",
    title: "Tables",
    description: "View tables and manage sessions.",
    key: "tables" as const,
  },
  {
    href: "/orders",
    title: "Orders",
    description: "Create and manage orders.",
    key: "orders" as const,
  },
  {
    href: "/service-requests",
    title: "Service Requests",
    description: "Manage table-side requests.",
    key: "serviceRequests" as const,
  },
  {
    href: "/billing",
    title: "Billing",
    description: "Generate bills and record payments.",
    key: "billing" as const,
  },
  {
    href: "/notifications",
    title: "Notifications",
    description: "View alerts and live workflow events.",
    key: "notifications" as const,
  },
  {
    href: "/kitchen",
    title: "Kitchen",
    description: "Manage the kitchen queue.",
    key: "kitchen" as const,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const visibleCards = cards.filter((card) => canAccessNavKey(user, card.key));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Restaurant operations overview and quick navigation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
