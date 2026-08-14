import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--muted)]">Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}
