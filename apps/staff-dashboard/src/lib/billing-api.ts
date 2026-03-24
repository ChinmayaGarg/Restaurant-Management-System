import { getToken } from "./auth";
import type { Bill } from "@/types/billing";

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

export async function generateBill(tableSessionId: string) {
  return authedFetch<Bill>("/billing/generate", {
    method: "POST",
    body: JSON.stringify({ tableSessionId }),
  });
}

export async function getBill(billId: string) {
  return authedFetch<Bill>(`/billing/${billId}`);
}

export async function closeBill(billId: string) {
  return authedFetch<Bill>(`/billing/${billId}/close`, {
    method: "POST",
  });
}
