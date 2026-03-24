"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { canAccessNavKey } from "@/lib/access";
import { getTables } from "@/lib/tables-api";
import { getOrders } from "@/lib/orders-api";
import { getServiceRequests } from "@/lib/service-requests-api";
import { getNotifications } from "@/lib/notifications-api";
import { getKitchenQueue } from "@/lib/kitchen-api";

function StatCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-white p-5 shadow block">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
    </Link>
  );
}

const navCards = [
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

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const serviceRequestsQuery = useQuery({
    queryKey: ["service-requests"],
    queryFn: getServiceRequests,
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const kitchenQueueQuery = useQuery({
    queryKey: ["kitchen-queue"],
    queryFn: getKitchenQueue,
  });

  const visibleCards = navCards.filter((card) =>
    canAccessNavKey(user, card.key),
  );

  const summary = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    const orders = ordersQuery.data ?? [];
    const serviceRequests = serviceRequestsQuery.data ?? [];
    const notifications = notificationsQuery.data ?? [];
    const kitchenQueue = kitchenQueueQuery.data ?? [];

    const openSessions = tables.filter(
      (table) => table.sessions.length > 0,
    ).length;
    const availableTables = tables.filter(
      (table) => table.status === "AVAILABLE",
    ).length;

    const activeOrders = orders.filter((order) =>
      ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(order.status),
    ).length;

    const unresolvedRequests = serviceRequests.filter(
      (request) => !["RESOLVED", "CANCELLED"].includes(request.status),
    ).length;

    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    const readyOrders = kitchenQueue.filter(
      (order) => order.status === "READY",
    ).length;

    return {
      totalTables: tables.length,
      openSessions,
      availableTables,
      activeOrders,
      unresolvedRequests,
      unreadNotifications,
      kitchenQueueCount: kitchenQueue.length,
      readyOrders,
    };
  }, [
    tablesQuery.data,
    ordersQuery.data,
    serviceRequestsQuery.data,
    notificationsQuery.data,
    kitchenQueueQuery.data,
  ]);

  const loading =
    tablesQuery.isLoading ||
    ordersQuery.isLoading ||
    serviceRequestsQuery.isLoading ||
    notificationsQuery.isLoading ||
    kitchenQueueQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Restaurant operations overview and quick navigation."
      />

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow text-sm text-gray-600">
          Loading dashboard summary...
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canAccessNavKey(user, "tables") ? (
          <StatCard
            title="Tables"
            value={summary.openSessions}
            subtitle={`${summary.availableTables} available out of ${summary.totalTables}`}
            href="/tables"
          />
        ) : null}

        {canAccessNavKey(user, "orders") ? (
          <StatCard
            title="Active Orders"
            value={summary.activeOrders}
            subtitle="Placed, accepted, preparing, or ready"
            href="/orders"
          />
        ) : null}

        {canAccessNavKey(user, "serviceRequests") ? (
          <StatCard
            title="Open Requests"
            value={summary.unresolvedRequests}
            subtitle="Requests still needing attention"
            href="/service-requests"
          />
        ) : null}

        {canAccessNavKey(user, "notifications") ? (
          <StatCard
            title="Unread Notifications"
            value={summary.unreadNotifications}
            subtitle="Realtime alerts not yet read"
            href="/notifications"
          />
        ) : null}

        {canAccessNavKey(user, "kitchen") ? (
          <>
            <StatCard
              title="Kitchen Queue"
              value={summary.kitchenQueueCount}
              subtitle="Orders currently in the kitchen workflow"
              href="/kitchen"
            />
            <StatCard
              title="Ready Orders"
              value={summary.readyOrders}
              subtitle="Orders ready for pickup or service"
              href="/kitchen"
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {visibleCards.map((card) => (
          <Card key={card.href} className="p-5">
            <Link href={card.href}>
              <h2 className="font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{card.description}</p>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
