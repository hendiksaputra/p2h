type Segment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  segments: Segment[];
};

export function DonutChart({ segments }: Props) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const r = 70;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
      <svg viewBox="-100 -100 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="Distribusi status kendaraan">
        <circle r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {total > 0
          ? segments.map((seg) => {
              const fraction = seg.value / total;
              const segLen = fraction * circumference;
              const offset = -cumulative;
              cumulative += segLen;
              return (
                <circle
                  key={seg.label}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segLen} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  transform="rotate(-90)"
                />
              );
            })
          : null}
      </svg>

      <ul className="space-y-2 text-sm">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <li key={seg.label} className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: seg.color }} aria-hidden />
              <span className="min-w-[8.5rem] text-slate-700">{seg.label}</span>
              <span className="font-medium tabular-nums text-slate-900">{seg.value}</span>
              <span className="text-slate-500">({pct.toFixed(0)}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
