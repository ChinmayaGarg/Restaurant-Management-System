"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/app-shell";
import { canAccessPath } from "@/lib/access";

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!loading && isAuthenticated && user && !canAccessPath(user, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, user, pathname, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          Checking session...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !canAccessPath(user, pathname)) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </AuthProvider>
  );
}
