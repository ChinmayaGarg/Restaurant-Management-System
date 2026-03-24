import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";

type RealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");

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

    return () => {
      socket.disconnect();
    };
  }, []);

  return status;
}
