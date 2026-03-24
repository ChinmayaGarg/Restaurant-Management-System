"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useBrowserOnline } from "@/hooks/use-browser-online";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";

function formatTime(date: Date | null) {
  if (!date) return "Never";
  return date.toLocaleTimeString();
}

export function DataRefreshBar() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const online = useBrowserOnline();
  const realtimeStatus = useRealtimeStatus();

  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const previousFetching = useRef(0);

  useEffect(() => {
    if (previousFetching.current > 0 && isFetching === 0) {
      setLastUpdated(new Date());
    }
    previousFetching.current = isFetching;
  }, [isFetching]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await queryClient.refetchQueries({ type: "active" });
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge
          label={online ? "Online" : "Offline"}
          tone={online ? "green" : "red"}
        />

        <StatusBadge
          label={
            realtimeStatus === "connected"
              ? "Realtime connected"
              : realtimeStatus === "connecting"
                ? "Realtime connecting"
                : realtimeStatus === "error"
                  ? "Realtime error"
                  : "Realtime disconnected"
          }
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

        <div className="text-gray-600">
          Last updated:{" "}
          <span className="font-medium text-gray-900">
            {formatTime(lastUpdated)}
          </span>
        </div>

        {isFetching > 0 ? (
          <div className="text-gray-600">Refreshing data…</div>
        ) : null}
      </div>

      <Button
        variant="outline"
        onClick={handleRefresh}
        disabled={refreshing || !online}
      >
        {refreshing ? "Refreshing..." : "Refresh now"}
      </Button>
    </div>
  );
}
