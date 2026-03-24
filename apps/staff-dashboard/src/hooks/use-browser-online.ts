"use client";

import { useEffect, useState } from "react";

export function useBrowserOnline() {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
