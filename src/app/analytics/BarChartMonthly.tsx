import { ANALYTICS_COLORS, type MonthlyStat } from "@/lib/analytics";

type Props = {
  monthly: MonthlyStat[];
};

const SERIES = [
  { key: "layak", label: "Layak Jalan", color: ANALYTICS_COLORS.layak },
  { key: "perluPerhatian", label: "Perlu Perhatian", color: ANALYTICS_COLORS.perluPerhatian },
  { key: "tidakAman", label: "Tidak Aman", color: ANALYTICS_COLORS.tidakAman },
] as const;

export function BarChartMonthly({ monthly }: Props) {
  const VBW = 800;
  const VBH = 320;
  const padding = { top: 20, right: 20, bottom: 56, left: 36 };
  const innerW = VBW - padding.left - padding.right;
  const innerH = VBH - padding.top - padding.bottom;

  const dataMax = Math.max(0, ...monthly.flatMap((m) => [m.layak, m.perluPerhatian, m.tidakAman]));
  const niceMax = Math.max(1, niceCeiling(dataMax));
  const tickCount = Math.min(niceMax + 1, 6);
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round((i * niceMax) / (tickCount - 1)));

  const groupCount = Math.max(1, monthly.length);
  const groupSlot = innerW / groupCount;
  const groupOuterPad = groupSlot * 0.18;
  const seriesGap = 2;
  const seriesCount = SERIES.length;
  const barWidth = Math.max(
    4,
    (groupSlot - groupOuterPad * 2 - seriesGap * (seriesCount - 1)) / seriesCount,
  );

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full" role="img" aria-label="Jumlah inspeksi bulanan">
        {ticks.map((t) => {
          const y = padding.top + innerH - (t / niceMax) * innerH;
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke={ANALYTICS_COLORS.grid}
                strokeDasharray="3 3"
              />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" className="fill-slate-500" style={{ fontSize: 11 }}>
                {t}
              </text>
            </g>
          );
        })}

        {monthly.map((m, gi) => {
          const groupX0 = padding.left + gi * groupSlot + groupOuterPad;
          const labelX = padding.left + gi * groupSlot + groupSlot / 2;
          return (
            <g key={m.monthKey}>
              <text x={labelX} y={padding.top + innerH + 18} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11 }}>
                {m.monthLabel}
              </text>
              {SERIES.map((s, si) => {
                const value = m[s.key];
                const h = niceMax > 0 ? (value / niceMax) * innerH : 0;
                const x = groupX0 + si * (barWidth + seriesGap);
                const y = padding.top + innerH - h;
                return value > 0 ? <rect key={s.key} x={x} y={y} width={barWidth} height={h} fill={s.color} rx={2} /> : null;
              })}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-700">
        {SERIES.map((s) => (
          <div key={s.key} className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sederhana: bulatkan ke atas ke kelipatan "rapi" (1, 2, 5, 10, 20, 50, ...). */
function niceCeiling(v: number): number {
  if (v <= 0) return 0;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const m = v / base;
  let nice: number;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}
