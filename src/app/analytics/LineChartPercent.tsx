import { ANALYTICS_COLORS } from "@/lib/analytics";

type Props = {
  labels: string[];
  values: number[]; // 0..100
  color: string;
  /** Optional aria label for SVG. */
  ariaLabel?: string;
};

const PCT_TICKS = [0, 25, 50, 75, 100];

export function LineChartPercent({ labels, values, color, ariaLabel }: Props) {
  const VBW = 600;
  const VBH = 280;
  const padding = { top: 16, right: 18, bottom: 36, left: 40 };
  const innerW = VBW - padding.left - padding.right;
  const innerH = VBH - padding.top - padding.bottom;

  const n = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const points = values.map((v, i) => {
    const safe = Math.max(0, Math.min(100, v));
    const x = padding.left + (n > 1 ? i * stepX : innerW / 2);
    const y = padding.top + innerH - (safe / 100) * innerH;
    return { x, y };
  });

  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full" role="img" aria-label={ariaLabel ?? "Tren persentase"}>
      {PCT_TICKS.map((t) => {
        const y = padding.top + innerH - (t / 100) * innerH;
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
              {t}%
            </text>
          </g>
        );
      })}

      {labels.map((label, i) => {
        const x = padding.left + (n > 1 ? i * stepX : innerW / 2);
        return (
          <text
            key={`${label}-${i}`}
            x={x}
            y={padding.top + innerH + 18}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 11 }}
          >
            {label}
          </text>
        );
      })}

      {path ? <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="white" stroke={color} strokeWidth={2} />
      ))}
    </svg>
  );
}
