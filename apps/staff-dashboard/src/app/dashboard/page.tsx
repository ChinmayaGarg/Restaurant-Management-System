"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { getToken, removeToken } from "@/lib/auth";
import { AuthenticatedUser } from "@/types/auth";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const me = await getMe();
        setUser(me);
      } catch (err) {
        removeToken();
        setError(err instanceof Error ? err.message : "Failed to load user");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          Loading dashboard...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-semibold">
              Welcome, {user.firstName} {user.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Branch: {user.branchId}
            </p>
            <p className="text-sm text-gray-600">
              Roles: {user.roles.join(", ")}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border px-4 py-2"
          >
            Logout
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">{error}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/tables"
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">Tables</h2>
            <p className="mt-2 text-sm text-gray-600">
              View tables, open sessions, close sessions, and manage statuses.
            </p>
          </Link>

          <Link
            href="/orders"
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">Orders</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create orders and move them through the workflow.
            </p>
          </Link>

          <Link
            href="/service-requests"
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">Service Requests</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create and manage call-server, bill, water, and help requests.
            </p>
          </Link>

          <Link
            href="/billing"
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">Billing</h2>
            <p className="mt-2 text-sm text-gray-600">
              Generate bills, record payments, and close bills.
            </p>
          </Link>

          <Link
            href="/notifications"
            className="rounded-2xl bg-white p-5 shadow block"
          >
            <h2 className="font-semibold">Notifications</h2>
            <p className="mt-2 text-sm text-gray-600">
              View realtime restaurant alerts and workflow events.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
