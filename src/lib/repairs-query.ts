import type { Prisma } from "@prisma/client";

export const REPAIRS_REPORT_PAGE_SIZE = 15;

/** Parse YYYY-MM-DD jadi awal hari WITA (Asia/Makassar, +08:00). */
export function parseYmdToWita(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+08:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Tambahkan 1 hari ke `dt` (untuk membuat batas atas eksklusif). */
function addDays(dt: Date, days: number): Date {
  return new Date(dt.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Range tanggal pemeriksaan dari querystring (opsional, semuanya null kalau kosong). */
export type DateRangeInput = {
  from?: string;
  to?: string;
};

export function dateRangeFromInput(input: DateRangeInput): {
  fromYmd: string | null;
  toYmd: string | null;
  filter: { gte?: Date; lt?: Date } | null;
} {
  const fromDate = parseYmdToWita(input.from);
  const toDate = parseYmdToWita(input.to);
  const filter: { gte?: Date; lt?: Date } = {};
  if (fromDate) filter.gte = fromDate;
  // batas atas eksklusif: hari berikutnya dari "to"
  if (toDate) filter.lt = addDays(toDate, 1);
  return {
    fromYmd: fromDate ? (input.from?.trim() ?? null) : null,
    toYmd: toDate ? (input.to?.trim() ?? null) : null,
    filter: Object.keys(filter).length > 0 ? filter : null,
  };
}

/** Where untuk laporan: P2H yang punya minimal satu temuan awal `NOT_OK` + filter pencarian + range tanggal (opsional). */
export function repairsReportWhere(
  q: string,
  range: DateRangeInput = {},
): Prisma.InspectionWhereInput {
  const baseFinding: Prisma.InspectionWhereInput = {
    lines: { some: { initialResult: "NOT_OK" } },
  };

  const conditions: Prisma.InspectionWhereInput[] = [baseFinding];

  const t = q.trim();
  if (t) {
    conditions.push({
      OR: [
        { inspectorName: { contains: t } },
        { overallNotes: { contains: t } },
        {
          vehicle: {
            is: {
              OR: [{ plateNumber: { contains: t } }, { unitNo: { contains: t } }],
            },
          },
        },
        {
          lines: {
            some: {
              initialResult: "NOT_OK",
              OR: [
                { initialNotes: { contains: t } },
                { notes: { contains: t } },
                { item: { is: { label: { contains: t } } } },
                { item: { is: { category: { contains: t } } } },
              ],
            },
          },
        },
      ],
    });
  }

  const dr = dateRangeFromInput(range);
  if (dr.filter) {
    conditions.push({ inspectedAt: dr.filter });
  }

  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

export function parseRepairsPage(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}
