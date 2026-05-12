import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { InspectionRoadworthiness } from "@prisma/client";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/auth-session";
import { getDbErrorMessage } from "@/lib/db-error";
import { prisma } from "@/lib/db";
import {
  ROADWORTHINESS_COPY,
  roadworthinessPillClass,
} from "@/lib/inspection-roadworthiness";
import {
  REPAIRS_REPORT_PAGE_SIZE,
  dateRangeFromInput,
  parseRepairsPage,
  repairsReportWhere,
} from "@/lib/repairs-query";
import { RepairsPagination } from "./RepairsPagination";
import { RepairsToolbar } from "./RepairsToolbar";

type Props = {
  searchParams: Promise<{ q?: string; page?: string; from?: string; to?: string }>;
};

type RepairReportRow = {
  inspectionId: string;
  inspectedAt: Date;
  plateNumber: string;
  unitNo: string | null;
  inspectorName: string;
  initialFindings: number;
  resolvedFindings: number;
  pendingFindings: number;
  totalRepairLogs: number;
  currentRoadworthiness: InspectionRoadworthiness | null;
  firstNotRoadworthyAt: Date | null;
  firstBackRoadworthyAt: Date | null;
};

export default async function RepairsReportPage(props: Props) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/reports/repairs");

  const {
    q: qRaw = "",
    page: pageRaw,
    from: fromRaw,
    to: toRaw,
  } = await props.searchParams;
  const q = typeof qRaw === "string" ? qRaw : "";
  const pageRequested = parseRepairsPage(typeof pageRaw === "string" ? pageRaw : undefined);
  const dateRange = dateRangeFromInput({ from: fromRaw, to: toRaw });
  const where = repairsReportWhere(q, { from: fromRaw, to: toRaw });

  let rows: RepairReportRow[] = [];
  let total = 0;
  let page = pageRequested;
  let totalUnitsAll = 0;
  let totalRepairLogsAll = 0;
  let dbError: string | null = null;

  try {
    total = await prisma.inspection.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / REPAIRS_REPORT_PAGE_SIZE));
    page = Math.min(Math.max(1, pageRequested), totalPages);
    const skip = (page - 1) * REPAIRS_REPORT_PAGE_SIZE;

    const inspections = await prisma.inspection.findMany({
      where,
      orderBy: { inspectedAt: "desc" },
      skip,
      take: REPAIRS_REPORT_PAGE_SIZE,
      include: {
        vehicle: { select: { plateNumber: true, unitNo: true } },
        lines: { select: { id: true, result: true, initialResult: true } },
        roadworthinessHistory: { orderBy: { recordedAt: "asc" } },
      },
    });

    const lineIds = inspections.flatMap((i) => i.lines.map((l) => l.id));
    const repairCountByInspection = new Map<string, number>();

    if (lineIds.length > 0) {
      const grouped = await prisma.inspectionLineRepair.groupBy({
        by: ["inspectionLineId"],
        _count: { _all: true },
        where: { inspectionLineId: { in: lineIds } },
      });
      const lineToInspection = new Map<string, string>();
      for (const insp of inspections) {
        for (const l of insp.lines) lineToInspection.set(l.id, insp.id);
      }
      for (const g of grouped) {
        const insId = lineToInspection.get(g.inspectionLineId);
        if (!insId) continue;
        repairCountByInspection.set(insId, (repairCountByInspection.get(insId) ?? 0) + g._count._all);
      }
    }

    rows = inspections.map((insp) => {
      const initial = insp.lines.filter((l) => l.initialResult === "NOT_OK");
      const resolved = initial.filter((l) => l.result === "OK").length;
      const pending = initial.length - resolved;
      const firstNotOk =
        insp.roadworthinessHistory.find((h) => h.roadworthiness === "TIDAK_LAYAK_JALAN") ?? null;
      const firstLayak =
        insp.roadworthinessHistory.find((h) => h.roadworthiness === "LAYAK_JALAN") ?? null;

      return {
        inspectionId: insp.id,
        inspectedAt: insp.inspectedAt,
        plateNumber: insp.vehicle.plateNumber,
        unitNo: insp.vehicle.unitNo,
        inspectorName: insp.inspectorName,
        initialFindings: initial.length,
        resolvedFindings: resolved,
        pendingFindings: pending,
        totalRepairLogs: repairCountByInspection.get(insp.id) ?? 0,
        currentRoadworthiness: insp.roadworthiness,
        firstNotRoadworthyAt: firstNotOk?.recordedAt ?? null,
        firstBackRoadworthyAt: firstLayak?.recordedAt ?? null,
      };
    });

    const totalDistinctVehicles = await prisma.inspection.findMany({
      where: { lines: { some: { initialResult: "NOT_OK" } } },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    });
    totalUnitsAll = totalDistinctVehicles.length;

    const totalRepairAgg = await prisma.inspectionLineRepair.count({
      where: { line: { inspection: { lines: { some: { initialResult: "NOT_OK" } } } } },
    });
    totalRepairLogsAll = totalRepairAgg;
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat laporan perbaikan.";
  }

  const rowOffset = (page - 1) * REPAIRS_REPORT_PAGE_SIZE;

  return (
    <>
      <PageHeader
        title="Laporan unit yang pernah perlu perbaikan"
        description="P2H yang memiliki temuan awal Tidak memenuhi standar dan riwayat perubahan kelayakan unit."
        action={
          <Link href="/inspections" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kembali ke daftar P2H
          </Link>
        }
      />

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="P2H dengan temuan (semua)" value={total} />
          <SummaryCard label="Unit unik tercatat" value={totalUnitsAll} />
          <SummaryCard label="Total catatan perbaikan" value={totalRepairLogsAll} />
        </div>
      ) : null}

      {!dbError ? (
        <Suspense
          fallback={
            <div className="mb-4 h-10 max-w-md animate-pulse rounded-lg bg-slate-200" aria-hidden />
          }
        >
          <RepairsToolbar
            initialQ={q}
            initialFrom={dateRange.fromYmd ?? ""}
            initialTo={dateRange.toYmd ?? ""}
          />
        </Suspense>
      ) : null}

      {!dbError && total === 0 && !q.trim() && !dateRange.filter ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center text-sm text-emerald-900">
          Belum ada P2H dengan temuan awal Tidak memenuhi standar dalam catatan.
        </p>
      ) : null}

      {!dbError && total === 0 && (q.trim() || dateRange.filter) ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Tidak ada laporan yang cocok dengan filter aktif. Ubah kata kunci atau rentang tanggal.
        </p>
      ) : null}

      {!dbError && rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="w-14 px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">Tgl P2H</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Pemeriksa</th>
                <th className="px-4 py-3 text-right">Temuan awal</th>
                <th className="px-4 py-3 text-right">Sudah / Belum</th>
                <th className="px-4 py-3">Pertama tidak layak</th>
                <th className="px-4 py-3">Pertama kembali layak</th>
                <th className="px-4 py-3">Kelayakan saat ini</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => (
                <tr key={r.inspectionId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                    {rowOffset + idx + 1}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(r.inspectedAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.plateNumber}</p>
                    {r.unitNo ? (
                      <p className="text-xs text-slate-500">Unit No: {r.unitNo}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.inspectorName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {r.initialFindings}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className="font-medium text-emerald-800">{r.resolvedFindings}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="font-medium text-amber-800">{r.pendingFindings}</span>
                    {r.totalRepairLogs > 0 ? (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                        {r.totalRepairLogs} log
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {r.firstNotRoadworthyAt ? formatDate(r.firstNotRoadworthyAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {r.firstBackRoadworthyAt ? formatDate(r.firstBackRoadworthyAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.currentRoadworthiness ? (
                      <span
                        className={[
                          "inline-flex max-w-[14rem] rounded-full border px-2 py-0.5 text-xs font-medium",
                          roadworthinessPillClass(r.currentRoadworthiness),
                        ].join(" ")}
                      >
                        {ROADWORTHINESS_COPY[r.currentRoadworthiness].title}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/inspections/${r.inspectionId}#riwayat-temuan-awal`}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Lihat detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4 pt-1">
            <RepairsPagination
              page={page}
              pageSize={REPAIRS_REPORT_PAGE_SIZE}
              total={total}
              q={q}
              from={dateRange.fromYmd ?? ""}
              to={dateRange.toYmd ?? ""}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(d);
}
