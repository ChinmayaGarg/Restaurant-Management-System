import { getToken } from "./auth";
import type {
  CreateServiceRequestPayload,
  ServiceRequest,
} from "@/types/service-requests";

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

export async function getServiceRequests() {
  return authedFetch<ServiceRequest[]>("/service-requests");
}

export async function createServiceRequest(
  payload: CreateServiceRequestPayload,
) {
  return authedFetch<ServiceRequest>("/service-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function acknowledgeServiceRequest(id: string) {
  return authedFetch<ServiceRequest>(`/service-requests/${id}/acknowledge`, {
    method: "PATCH",
  });
}

export async function resolveServiceRequest(id: string) {
  return authedFetch<ServiceRequest>(`/service-requests/${id}/resolve`, {
    method: "PATCH",
  });
}

export async function escalateServiceRequest(id: string) {
  return authedFetch<ServiceRequest>(`/service-requests/${id}/escalate`, {
    method: "PATCH",
  });
}
