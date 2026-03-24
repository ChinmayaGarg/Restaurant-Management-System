"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getToken } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications-api";
import { useNotificationsSocket } from "@/hooks/use-notifications-socket";
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

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const token = typeof window !== "undefined" ? getToken() : null;

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const handleCreated = useCallback(
    (notification: NotificationItem) => {
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
    },
    [queryClient],
  );

  useNotificationsSocket({
    token,
    onCreated: handleCreated,
    onRead: handleRead,
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const latestNotifications = useMemo(
    () =>
      [...notifications]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [notifications],
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl border px-4 py-2 text-sm"
      >
        🔔
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-2xl border bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Notifications</div>
              <div className="text-sm text-gray-500">Unread: {unreadCount}</div>
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-black underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {notificationsQuery.isLoading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : null}

            {!notificationsQuery.isLoading &&
            latestNotifications.length === 0 ? (
              <div className="text-sm text-gray-600">No notifications yet.</div>
            ) : null}

            {latestNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-3 ${
                  notification.isRead ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">{notification.title}</div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium ${getTypeBadgeClasses(
                      notification.type,
                    )}`}
                  >
                    {notification.type}
                  </span>
                </div>

                <div className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
