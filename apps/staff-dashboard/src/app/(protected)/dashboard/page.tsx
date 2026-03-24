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

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function KpiCard({
  title,
  value,
  subtitle,
  href,
  tone = "gray",
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  tone?: "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "emerald";
}) {
  return (
    <Link href={href}>
      <Card className="p-5 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-500">{title}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
            <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
          </div>

          <StatusBadge label={title} tone={tone} />
        </div>
      </Card>
    </Link>
  );
}

const quickLinks = [
  {
    href: "/tables",
    title: "Tables",
    description: "Open sessions, close sessions, and manage statuses.",
    key: "tables" as const,
  },
  {
    href: "/orders",
    title: "Orders",
    description: "Create and manage dine-in orders.",
    key: "orders" as const,
  },
  {
    href: "/service-requests",
    title: "Service Requests",
    description: "Track and respond to guest requests.",
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
    description: "See live restaurant workflow events.",
    key: "notifications" as const,
  },
  {
    href: "/kitchen",
    title: "Kitchen",
    description: "Manage kitchen queue and item availability.",
    key: "kitchen" as const,
  },
];

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

  const loading =
    tablesQuery.isLoading ||
    ordersQuery.isLoading ||
    serviceRequestsQuery.isLoading ||
    notificationsQuery.isLoading ||
    kitchenQueueQuery.isLoading;

  const summary = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    const orders = ordersQuery.data ?? [];
    const serviceRequests = serviceRequestsQuery.data ?? [];
    const notifications = notificationsQuery.data ?? [];
    const kitchenQueue = kitchenQueueQuery.data ?? [];

    const totalTables = tables.length;
    const openSessions = tables.filter(
      (table) => table.sessions.length > 0,
    ).length;
    const availableTables = tables.filter(
      (table) => table.status === "AVAILABLE",
    ).length;
    const occupiedTables = tables.filter(
      (table) => table.status === "OCCUPIED",
    ).length;

    const activeOrders = orders.filter((order) =>
      ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(order.status),
    ).length;

    const readyOrders = orders.filter(
      (order) => order.status === "READY",
    ).length;

    const openRequests = serviceRequests.filter((request) =>
      ["OPEN", "ACKNOWLEDGED", "ESCALATED"].includes(request.status),
    ).length;

    const escalatedRequests = serviceRequests.filter(
      (request) => request.status === "ESCALATED",
    ).length;

    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    const kitchenQueueCount = kitchenQueue.length;
    const kitchenPreparing = kitchenQueue.filter(
      (order) => order.status === "PREPARING",
    ).length;

    return {
      totalTables,
      openSessions,
      availableTables,
      occupiedTables,
      activeOrders,
      readyOrders,
      openRequests,
      escalatedRequests,
      unreadNotifications,
      kitchenQueueCount,
      kitchenPreparing,
    };
  }, [
    tablesQuery.data,
    ordersQuery.data,
    serviceRequestsQuery.data,
    notificationsQuery.data,
    kitchenQueueQuery.data,
  ]);

  const visibleQuickLinks = quickLinks.filter((item) =>
    canAccessNavKey(user, item.key),
  );

  const attentionItems = useMemo(() => {
    const items: Array<{
      title: string;
      description: string;
      href: string;
      tone: "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "emerald";
    }> = [];

    if (
      canAccessNavKey(user, "notifications") &&
      summary.unreadNotifications > 0
    ) {
      items.push({
        title: `${summary.unreadNotifications} unread notification${
          summary.unreadNotifications === 1 ? "" : "s"
        }`,
        description: "New alerts need to be reviewed.",
        href: "/notifications",
        tone: "red",
      });
    }

    if (
      canAccessNavKey(user, "serviceRequests") &&
      summary.escalatedRequests > 0
    ) {
      items.push({
        title: `${summary.escalatedRequests} escalated request${
          summary.escalatedRequests === 1 ? "" : "s"
        }`,
        description: "High-priority service requests need attention.",
        href: "/service-requests",
        tone: "red",
      });
    }

    if (canAccessNavKey(user, "orders") && summary.readyOrders > 0) {
      items.push({
        title: `${summary.readyOrders} ready order${
          summary.readyOrders === 1 ? "" : "s"
        }`,
        description: "Orders are ready for service or pickup.",
        href: "/orders",
        tone: "green",
      });
    }

    if (canAccessNavKey(user, "kitchen") && summary.kitchenPreparing > 0) {
      items.push({
        title: `${summary.kitchenPreparing} order${
          summary.kitchenPreparing === 1 ? "" : "s"
        } preparing`,
        description: "Kitchen workflow is currently active.",
        href: "/kitchen",
        tone: "yellow",
      });
    }

    if (canAccessNavKey(user, "tables") && summary.availableTables > 0) {
      items.push({
        title: `${summary.availableTables} available table${
          summary.availableTables === 1 ? "" : "s"
        }`,
        description: "Tables are ready to seat new guests.",
        href: "/tables",
        tone: "blue",
      });
    }

    return items;
  }, [summary, user]);

  return (
    <main className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Restaurant operations overview and quick navigation."
      />

      {loading ? <Card>Loading dashboard summary...</Card> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canAccessNavKey(user, "tables") ? (
          <>
            <KpiCard
              title="Open Sessions"
              value={summary.openSessions}
              subtitle={`${summary.availableTables} available out of ${summary.totalTables} tables`}
              href="/tables"
              tone="blue"
            />
            <KpiCard
              title="Occupied Tables"
              value={summary.occupiedTables}
              subtitle="Tables currently in use"
              href="/tables"
              tone="yellow"
            />
          </>
        ) : null}

        {canAccessNavKey(user, "orders") ? (
          <KpiCard
            title="Active Orders"
            value={summary.activeOrders}
            subtitle="Placed, accepted, preparing, or ready"
            href="/orders"
            tone="purple"
          />
        ) : null}

        {canAccessNavKey(user, "serviceRequests") ? (
          <KpiCard
            title="Open Requests"
            value={summary.openRequests}
            subtitle="Service requests still needing attention"
            href="/service-requests"
            tone="red"
          />
        ) : null}

        {canAccessNavKey(user, "notifications") ? (
          <KpiCard
            title="Unread Alerts"
            value={summary.unreadNotifications}
            subtitle="Notifications not yet read"
            href="/notifications"
            tone="red"
          />
        ) : null}

        {canAccessNavKey(user, "kitchen") ? (
          <KpiCard
            title="Kitchen Queue"
            value={summary.kitchenQueueCount}
            subtitle="Orders currently in kitchen workflow"
            href="/kitchen"
            tone="green"
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader
            title="Attention needed"
            description="Items that may need action soon."
          />

          <CardContent className="space-y-3">
            {attentionItems.length === 0 ? (
              <EmptyState
                title="Everything looks good"
                description="No urgent workflow items need attention right now."
              />
            ) : (
              attentionItems.map((item) => (
                <Card key={item.title} className="border p-4 shadow-none">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{item.title}</div>
                        <StatusBadge label="Attention" tone={item.tone} />
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {item.description}
                      </div>
                    </div>

                    <Link href={item.href}>
                      <Button variant="outline" size="sm">
                        Open
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Quick navigation"
            description="Jump into the areas you use most."
          />

          <CardContent className="space-y-3">
            {visibleQuickLinks.length === 0 ? (
              <EmptyState
                title="No sections available"
                description="Your current role does not have dashboard sections assigned."
              />
            ) : (
              visibleQuickLinks.map((card) => (
                <Link key={card.href} href={card.href}>
                  <Card className="border p-4 shadow-none transition hover:shadow-sm">
                    <div className="font-medium">{card.title}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {card.description}
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
