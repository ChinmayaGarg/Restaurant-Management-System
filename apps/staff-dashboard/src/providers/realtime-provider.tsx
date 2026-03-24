"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";
import type {
  NotificationItem,
  NotificationReadEvent,
} from "@/types/notifications";

type RealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

type RealtimeContextValue = {
  status: RealtimeStatus;
  latestNotification: NotificationItem | null;
  latestReadEvent: NotificationReadEvent | null;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const [latestNotification, setLatestNotification] =
    useState<NotificationItem | null>(null);
  const [latestReadEvent, setLatestReadEvent] =
    useState<NotificationReadEvent | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setStatus("disconnected");
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;
    const socket: Socket = io(`${backendUrl}/notifications`, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"],
    });

    setStatus("connecting");

    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("error");
    });

    socket.on("notification.created", (notification: NotificationItem) => {
      setLatestNotification(notification);
    });

    socket.on("notification.read", (payload: NotificationReadEvent) => {
      setLatestReadEvent(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      latestNotification,
      latestReadEvent,
    }),
    [status, latestNotification, latestReadEvent],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const value = useContext(RealtimeContext);

  if (!value) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }

  return value;
}
