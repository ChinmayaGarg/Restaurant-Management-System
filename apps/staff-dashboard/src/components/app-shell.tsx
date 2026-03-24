"use client";

import { SidebarNav } from "./sidebar-nav";
import { NotificationBell } from "./notification-bell";
import { DataRefreshBar } from "./data-refresh-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <Card>Loading app...</Card>
      </main>
    );
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Staff User";

  const rolesText = user?.roles.join(", ") ?? "No roles";

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold">{fullName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-xs text-gray-500">Roles: {rolesText}</div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </Card>

        <DataRefreshBar />

        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <SidebarNav />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
