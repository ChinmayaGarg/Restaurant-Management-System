import { getToken } from "./auth";
import type { CreateOrderPayload, Order, OrderStatus } from "@/types/orders";

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

export async function getOrders() {
  return authedFetch<Order[]>("/orders");
}

export async function createOrder(payload: CreateOrderPayload) {
  return authedFetch<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return authedFetch<Order>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
