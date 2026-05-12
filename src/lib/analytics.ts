import { prisma } from "@/lib/db";

export type MonthlyStat = {
  monthKey: string; // YYYY-MM
  monthLabel: string; // contoh: "Apr 26"
  layak: number;
  perluPerhatian: number;
  tidakAman: number;
  total: number;
};

export type AnalyticsData = {
  rangeStart: Date;
  rangeEnd: Date;
  monthsBack: number;
  totals: {
    total: number;
    layak: number;
    perluPerhatian: number;
    tidakAman: number;
  };
  monthly: MonthlyStat[];
};

const MONTH_LABELS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return `${MONTH_LABELS_ID[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** Mengembalikan ringkasan analitik P2H untuk N bulan terakhir (termasuk bulan ini). */
export async function getAnalyticsData(monthsBack: number = 6): Promise<AnalyticsData> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const inspections = await prisma.inspection.findMany({
    where: {
      inspectedAt: { gte: start, lt: end },
      roadworthiness: { not: null },
    },
    select: { inspectedAt: true, roadworthiness: true },
  });

  const monthly: MonthlyStat[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthly.push({
      monthKey: monthKey(d),
      monthLabel: monthLabel(d),
      layak: 0,
      perluPerhatian: 0,
      tidakAman: 0,
      total: 0,
    });
  }
  const indexByKey = new Map(monthly.map((m, i) => [m.monthKey, i]));

  for (const insp of inspections) {
    const idx = indexByKey.get(monthKey(insp.inspectedAt));
    if (idx === undefined) continue;
    const r = insp.roadworthiness;
    monthly[idx].total += 1;
    if (r === "LAYAK_JALAN") monthly[idx].layak += 1;
    else if (r === "RUSAK_RINGAN_PERLU_PERBAIKAN") monthly[idx].perluPerhatian += 1;
    else if (r === "TIDAK_LAYAK_JALAN") monthly[idx].tidakAman += 1;
  }

  const totals = monthly.reduce(
    (acc, m) => ({
      total: acc.total + m.total,
      layak: acc.layak + m.layak,
      perluPerhatian: acc.perluPerhatian + m.perluPerhatian,
      tidakAman: acc.tidakAman + m.tidakAman,
    }),
    { total: 0, layak: 0, perluPerhatian: 0, tidakAman: 0 },
  );

  return { rangeStart: start, rangeEnd: end, monthsBack, totals, monthly };
}

export const ANALYTICS_COLORS = {
  layak: "#10b981", // emerald-500
  perluPerhatian: "#f59e0b", // amber-500
  tidakAman: "#ef4444", // red-500
  pass: "#3b82f6", // blue-500
  repair: "#f97316", // orange-500
  axis: "#94a3b8", // slate-400
  grid: "#e5e7eb", // slate-200
} as const;
