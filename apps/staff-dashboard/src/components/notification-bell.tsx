"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getNotifications } from "@/lib/notifications-api";
import { useRealtime } from "@/providers/realtime-provider";
import type { NotificationItem } from "@/types/notifications";

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

function sortNotifications(notifications: NotificationItem[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { latestNotification, latestReadEvent } = useRealtime();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  useEffect(() => {
    if (!latestNotification) return;

    queryClient.setQueryData<NotificationItem[]>(
      ["notifications"],
      (current = []) => {
        const exists = current.some(
          (item) => item.id === latestNotification.id,
        );

        return exists ? current : [latestNotification, ...current];
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

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const latestNotifications = useMemo(
    () => sortNotifications(notifications).slice(0, 5),
    [notifications],
  );

  const hasNotifications = latestNotifications.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl border px-4 py-2 text-sm"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-6 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
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
            {isLoading && (
              <div className="text-sm text-gray-600">Loading...</div>
            )}

            {!isLoading && !hasNotifications && (
              <div className="text-sm text-gray-600">No notifications yet.</div>
            )}

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
      )}
    </div>
  );
}
