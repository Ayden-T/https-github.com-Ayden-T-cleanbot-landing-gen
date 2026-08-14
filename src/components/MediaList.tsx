import type { MediaWithLatest } from "@/lib/analytics";
import { engagementRate } from "@/lib/analytics";

function truncate(text: string | null, max = 70) {
  if (!text) return "(no caption)";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function MediaList({ items }: { items: MediaWithLatest[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No data yet — refresh to pull your latest posts.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--border)]">
      {items.map((item, i) => {
        const rate = engagementRate(item);
        return (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className="w-5 shrink-0 text-center text-sm tabular-nums text-[var(--muted)]">{i + 1}</div>
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--gridline)]">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={item.permalink ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-[var(--foreground)] hover:underline"
              >
                {truncate(item.caption)}
              </a>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {item.mediaProductType === "REELS" ? "Reel" : "Post"}
              </div>
            </div>
            <div className="flex shrink-0 gap-4 text-right text-sm tabular-nums">
              {item.latest?.playsCount != null && (
                <Metric label="Plays" value={item.latest.playsCount.toLocaleString()} />
              )}
              {item.latest?.reach != null && <Metric label="Reach" value={item.latest.reach.toLocaleString()} />}
              {rate != null && <Metric label="Eng. rate" value={`${(rate * 100).toFixed(1)}%`} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--foreground)]">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
