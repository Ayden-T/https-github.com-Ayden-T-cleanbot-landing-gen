import type { PostingFrequencyPoint } from "@/lib/analytics";

function formatRange(fromDate: string, toDate: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(fromDate).toLocaleDateString(undefined, opts)} – ${new Date(toDate).toLocaleDateString(undefined, opts)}`;
}

export function PostingFrequencyTable({ points }: { points: PostingFrequencyPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Refresh at least twice to see how posting frequency lines up with follower growth between refreshes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--muted)]">
            <th className="pb-2 font-normal">Period</th>
            <th className="pb-2 pr-2 text-right font-normal">Posts</th>
            <th className="pb-2 text-right font-normal">Follower change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {points.map((p) => (
            <tr key={`${p.fromDate}-${p.toDate}`}>
              <td className="py-2 text-[var(--text-secondary)]">{formatRange(p.fromDate, p.toDate)}</td>
              <td className="py-2 pr-2 text-right tabular-nums text-[var(--foreground)]">{p.postsCount}</td>
              <td
                className={
                  "py-2 text-right tabular-nums " +
                  (p.followerDelta > 0
                    ? "text-[var(--good)]"
                    : p.followerDelta < 0
                      ? "text-[var(--critical)]"
                      : "text-[var(--muted)]")
                }
              >
                {p.followerDelta > 0 ? "+" : ""}
                {p.followerDelta.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
