import { sequential, type Mode } from "@/lib/palette";

interface Item {
  label: string;
  value: number;
  sublabel?: string;
}

export function HorizontalBarList({
  items,
  mode,
  formatValue = (v) => v.toLocaleString(),
}: {
  items: Item[];
  mode: Mode;
  formatValue?: (v: number) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-sm text-[var(--text-secondary)]" title={item.label}>
            {item.label}
            {item.sublabel && <span className="text-[var(--muted)]"> · {item.sublabel}</span>}
          </div>
          <div className="h-2 flex-1 rounded-full bg-[var(--gridline)]">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max((item.value / max) * 100, 3)}%`, background: sequential[mode] }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-sm tabular-nums text-[var(--foreground)]">
            {formatValue(item.value)}
          </div>
        </li>
      ))}
    </ul>
  );
}
