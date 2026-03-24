"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              Live restaurant alerts and workflow events.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-700">
              Unread: {unreadCount}
            </p>
          </div>

          <Link href="/dashboard" className="rounded-xl border px-4 py-2">
            Back to dashboard
          </Link>
        </div>

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
            <div
              key={notification.id}
              className={`rounded-2xl bg-white p-5 shadow ${
                notification.isRead ? "opacity-80" : ""
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold">{notification.title}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getTypeBadgeClasses(
                        notification.type,
                      )}`}
                    >
                      {notification.type}
                    </span>
                    {!notification.isRead ? (
                      <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
                        Unread
                      </span>
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

                {!notification.isRead ? (
                  <button
                    onClick={() => markReadMutation.mutate(notification.id)}
                    disabled={markReadMutation.isPending}
                    className="rounded-xl border px-4 py-2"
                  >
                    {markReadMutation.isPending ? "Saving..." : "Mark as read"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          {!notificationsQuery.isLoading && notifications.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow text-sm text-gray-600">
              No notifications yet.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
