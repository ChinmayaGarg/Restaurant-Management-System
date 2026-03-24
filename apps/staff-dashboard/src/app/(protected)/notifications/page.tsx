"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  markNotificationRead,
} from "@/lib/notifications-api";
import { canDoAction } from "@/lib/access";
import { useAuth } from "@/providers/auth-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { useToast } from "@/providers/toast-provider";

import type { NotificationItem } from "@/types/notifications";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function getNotificationTone(type: string) {
  switch (type) {
    case "SERVICE_REQUEST_CREATED":
      return "blue";
    case "SERVICE_REQUEST_ESCALATED":
      return "red";
    case "ORDER_READY":
      return "green";
    case "BILL_GENERATED":
      return "purple";
    case "PAYMENT_RECORDED":
      return "emerald";
    case "BILL_PAID":
      return "green";
    case "MENU_ITEM_UNAVAILABLE":
      return "orange";
    case "MENU_ITEM_AVAILABLE":
      return "green";
    default:
      return "gray";
  }
}

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-gray-600">{sublabel}</div>
    </Card>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    latestNotification,
    latestReadEvent,
    status: realtimeStatus,
  } = useRealtime();

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!latestNotification) return;

    queryClient.setQueryData<NotificationItem[]>(
      ["notifications"],
      (current = []) => {
        const exists = current.some(
          (item) => item.id === latestNotification.id,
        );
        if (exists) return current;
        return [latestNotification, ...current];
      },
    );
  }, [latestNotification, queryClient]);

  useEffect(() => {
    if (!latestReadEvent) return;

    queryClient.setQueryData<NotificationItem[]>(
      ["notifications"],
      (current = []) =>
        current.map((item) =>
          item.id === latestReadEvent.id
            ? { ...item, isRead: true, readAt: latestReadEvent.readAt }
            : item,
        ),
    );
  }, [latestReadEvent, queryClient]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: async (updatedNotification) => {
      setErrorMessage("");

      queryClient.setQueryData<NotificationItem[]>(
        ["notifications"],
        (current = []) =>
          current.map((item) =>
            item.id === updatedNotification.id ? updatedNotification : item,
          ),
      );

      showToast({
        type: "success",
        title: "Notification marked as read",
        message: "The notification was updated successfully.",
      });

      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not update notification",
        message,
      });
    },
  });

  const notifications = useMemo(() => {
    const base = notificationsQuery.data ?? [];
    return [...base].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notificationsQuery.data]);

  const summary = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      read: notifications.filter((item) => item.isRead).length,
      serviceRequestAlerts: notifications.filter((item) =>
        ["SERVICE_REQUEST_CREATED", "SERVICE_REQUEST_ESCALATED"].includes(
          item.type,
        ),
      ).length,
      orderAlerts: notifications.filter((item) =>
        [
          "ORDER_READY",
          "BILL_GENERATED",
          "PAYMENT_RECORDED",
          "BILL_PAID",
        ].includes(item.type),
      ).length,
    };
  }, [notifications]);

  return (
    <main className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Live restaurant alerts and workflow events."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {notificationsQuery.isLoading ? (
        <Card>Loading notifications...</Card>
      ) : null}

      {notificationsQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {notificationsQuery.error instanceof Error
            ? notificationsQuery.error.message
            : "Failed to load notifications"}
        </Card>
      ) : null}

      {!notificationsQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total"
            value={summary.total}
            sublabel="All notifications currently loaded"
          />
          <SummaryCard
            label="Unread"
            value={summary.unread}
            sublabel="Needs your attention"
          />
          <SummaryCard
            label="Read"
            value={summary.read}
            sublabel="Already acknowledged"
          />
          <SummaryCard
            label="Service Alerts"
            value={summary.serviceRequestAlerts}
            sublabel="Request-related notifications"
          />
          <SummaryCard
            label="Order & Billing Alerts"
            value={summary.orderAlerts}
            sublabel="Kitchen, billing, and payment events"
          />
        </div>
      )}

      <Card>
        <CardHeader
          title="Notification stream"
          description={`Realtime status: ${realtimeStatus}`}
          action={
            <StatusBadge
              label={realtimeStatus}
              tone={
                realtimeStatus === "connected"
                  ? "green"
                  : realtimeStatus === "connecting"
                    ? "yellow"
                    : realtimeStatus === "error"
                      ? "red"
                      : "gray"
              }
            />
          }
        />

        <CardContent className="space-y-4">
          {!notificationsQuery.isLoading && notifications.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="New alerts and workflow events will appear here."
            />
          ) : null}

          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border p-4 shadow-none ${
                notification.isRead ? "opacity-80" : ""
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{notification.title}</div>

                    <StatusBadge
                      label={notification.type}
                      tone={getNotificationTone(notification.type)}
                    />

                    {!notification.isRead ? (
                      <StatusBadge label="Unread" tone="gray" />
                    ) : (
                      <StatusBadge label="Read" tone="gray" />
                    )}
                  </div>

                  <p className="text-sm text-gray-700">
                    {notification.message}
                  </p>

                  <div className="text-xs text-gray-500">
                    Created: {new Date(notification.createdAt).toLocaleString()}
                  </div>

                  {notification.readAt ? (
                    <div className="text-xs text-gray-500">
                      Read: {new Date(notification.readAt).toLocaleString()}
                    </div>
                  ) : null}

                  {notification.targetUserId ? (
                    <div className="text-xs text-gray-500">
                      Targeted notification
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Branch-wide notification
                    </div>
                  )}
                </div>

                {!notification.isRead &&
                canDoAction(user, "notifications.markRead") ? (
                  <Button
                    variant="outline"
                    onClick={() => markReadMutation.mutate(notification.id)}
                    disabled={markReadMutation.isPending}
                  >
                    {markReadMutation.isPending ? "Saving..." : "Mark as read"}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
