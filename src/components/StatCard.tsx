interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" } | null;
}

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--foreground)]">{value}</div>
      {delta && (
        <div
          className={
            "mt-1 flex items-center gap-1 text-sm tabular-nums " +
            (delta.direction === "up"
              ? "text-[var(--good)]"
              : delta.direction === "down"
                ? "text-[var(--critical)]"
                : "text-[var(--muted)]")
          }
        >
          <span aria-hidden>{delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "–"}</span>
          <span>{delta.value} since last refresh</span>
        </div>
      )}
    </div>
  );
}
