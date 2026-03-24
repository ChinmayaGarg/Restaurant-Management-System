"use client";

import { SidebarNav } from "./sidebar-nav";
import { NotificationBell } from "./notification-bell";
import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow">Loading app...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl bg-white p-4 shadow">
          <div>
            <div className="font-semibold">
              {user ? `${user.firstName} ${user.lastName}` : "Staff User"}
            </div>
            <div className="text-sm text-gray-500">
              {user?.email} • {user?.roles.join(", ")}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <button
              onClick={logout}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <SidebarNav />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
