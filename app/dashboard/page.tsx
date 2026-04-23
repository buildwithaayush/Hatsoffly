"use client";

import { Suspense } from "react";
import { DashboardExperience } from "@/components/dashboard/dashboard-experience";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-600">Loading dashboard…</p>
        </div>
      }
    >
      <DashboardExperience />
    </Suspense>
  );
}
