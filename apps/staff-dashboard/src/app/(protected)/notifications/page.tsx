"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
import { useNotificationsSocket } from "@/hooks/use-notifications-socket";
import { getToken } from "@/lib/auth";
import {
  getNotifications,
  markNotificationRead,
} from "@/lib/notifications-api";
import type {
  NotificationItem,
  NotificationReadEvent,
} from "@/types/notifications";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";

function getTypeBadgeClasses(type: string) {
  switch (type) {
    case "SERVICE_REQUEST_CREATED":
      return "bg-blue-100 text-blue-700";
    case "SERVICE_REQUEST_ESCALATED":
      return "bg-red-100 text-red-700";
    case "ORDER_READY":
      return "bg-green-100 text-green-700";
    case "BILL_GENERATED":
      return "bg-purple-100 text-purple-700";
    case "PAYMENT_RECORDED":
      return "bg-emerald-100 text-emerald-700";
    case "BILL_PAID":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [liveNotifications, setLiveNotifications] = useState<
    NotificationItem[]
  >([]);

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

      setLiveNotifications((current) =>
        current.map((item) =>
          item.id === updatedNotification.id ? updatedNotification : item,
        ),
      );
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read",
      );
    },
  });

  const token = typeof window !== "undefined" ? getToken() : null;

  const handleCreated = useCallback(
    (notification: NotificationItem) => {
      setLiveNotifications((current) => {
        const existsInLive = current.some(
          (item) => item.id === notification.id,
        );
        if (existsInLive) return current;
        return [notification, ...current];
      });

      queryClient.setQueryData<NotificationItem[]>(
        ["notifications"],
        (current = []) => {
          const exists = current.some((item) => item.id === notification.id);
          if (exists) return current;
          return [notification, ...current];
        },
      );
    },
    [queryClient],
  );

  const handleRead = useCallback(
    (payload: NotificationReadEvent) => {
      queryClient.setQueryData<NotificationItem[]>(
        ["notifications"],
        (current = []) =>
          current.map((item) =>
            item.id === payload.id
              ? { ...item, isRead: true, readAt: payload.readAt }
              : item,
          ),
      );

      setLiveNotifications((current) =>
        current.map((item) =>
          item.id === payload.id
            ? { ...item, isRead: true, readAt: payload.readAt }
            : item,
        ),
      );
    },
    [queryClient],
  );

  useNotificationsSocket({
    token,
    onCreated: handleCreated,
    onRead: handleRead,
  });

  const notifications = useMemo(() => {
    const base = notificationsQuery.data ?? [];
    const map = new Map<string, NotificationItem>();

    for (const item of base) {
      map.set(item.id, item);
    }

    for (const item of liveNotifications) {
      map.set(item.id, item);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notificationsQuery.data, liveNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Notifications"
          description="Live restaurant alerts and workflow events."
        />

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {notificationsQuery.isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            Loading notifications...
          </div>
        ) : null}

        {notificationsQuery.isError ? (
          <div className="rounded-2xl bg-red-50 p-6 text-red-600 shadow">
            {notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : "Failed to load notifications"}
          </div>
        ) : null}

        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? "opacity-80" : ""}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold">{notification.title}</h2>
                    <StatusBadge
                      label={notification.type}
                      tone={
                        notification.type === "SERVICE_REQUEST_CREATED"
                          ? "blue"
                          : notification.type === "SERVICE_REQUEST_ESCALATED"
                            ? "red"
                            : notification.type === "ORDER_READY"
                              ? "green"
                              : notification.type === "BILL_GENERATED"
                                ? "purple"
                                : notification.type === "PAYMENT_RECORDED"
                                  ? "emerald"
                                  : notification.type === "BILL_PAID"
                                    ? "green"
                                    : "gray"
                      }
                    />
                    {!notification.isRead ? (
                      <StatusBadge label="Unread" tone="gray" />
                    ) : null}
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

          {!notificationsQuery.isLoading && notifications.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="New alerts and workflow events will appear here."
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
