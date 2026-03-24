import { getToken } from "./auth";
import type { DiningTable, TableStatus, TableSession } from "@/types/tables";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function authedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Missing auth token");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export async function getTables() {
  return authedFetch<DiningTable[]>("/tables");
}

export async function openTableSession(tableId: string, guestCount?: number) {
  return authedFetch<TableSession>(`/tables/${tableId}/open-session`, {
    method: "POST",
    body: JSON.stringify({
      ...(guestCount ? { guestCount } : {}),
    }),
  });
}

export async function closeTableSession(tableId: string) {
  return authedFetch<TableSession>(`/tables/${tableId}/close-session`, {
    method: "POST",
  });
}

export async function updateTableStatus(tableId: string, status: TableStatus) {
  return authedFetch<DiningTable>(`/tables/${tableId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
