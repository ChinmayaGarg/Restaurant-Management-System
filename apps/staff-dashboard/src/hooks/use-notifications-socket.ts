"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import type {
  NotificationItem,
  NotificationReadEvent,
} from "@/types/notifications";

type UseNotificationsSocketParams = {
  token: string | null;
  onCreated: (notification: NotificationItem) => void;
  onRead: (payload: NotificationReadEvent) => void;
};

export function useNotificationsSocket({
  token,
  onCreated,
  onRead,
}: UseNotificationsSocketParams) {
  useEffect(() => {
    if (!token) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const socket: Socket = io(`${backendUrl}/notifications`, {
      auth: {
        token,
      },
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Notifications socket connected");
    });

    socket.on("notification.created", (notification: NotificationItem) => {
      onCreated(notification);
    });

    socket.on("notification.read", (payload: NotificationReadEvent) => {
      onRead(payload);
    });

    socket.on("disconnect", () => {
      console.log("Notifications socket disconnected");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Notifications socket error:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, onCreated, onRead]);
}
