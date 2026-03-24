import { AuthenticatedUser, LoginResponse } from "@/types/auth";
import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;

  const token = auth ? getToken() : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch<AuthenticatedUser>("/auth/me", {
    method: "GET",
    auth: true,
  });
}
