"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ErrorBoundary } from "@/components/providers/error-boundary";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    api.getProfile().then((res) => {
      if (res.success && res.data) setProfile(res.data as UserProfile);
      setLoading(false);
    });
  }, [setProfile, setLoading]);

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-background" onClick={(e) => e.stopPropagation()}>
            <DashboardSidebar />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
