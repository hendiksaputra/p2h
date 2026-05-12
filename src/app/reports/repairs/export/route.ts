import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  ROADWORTHINESS_COPY,
} from "@/lib/inspection-roadworthiness";
import {
  dateRangeFromInput,
  repairsReportWhere,
} from "@/lib/repairs-query";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});

function fmt(d: Date | null | undefined): string {
  return d ? DATE_FMT.format(d) : "";
}

function ymdWita(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(
      new URL("/login?next=/reports/repairs", req.url),
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const fromRaw = url.searchParams.get("from") ?? undefined;
  const toRaw = url.searchParams.get("to") ?? undefined;

  const dateRange = dateRangeFromInput({ from: fromRaw, to: toRaw });
  if (
    dateRange.fromYmd &&
    dateRange.toYmd &&
    dateRange.fromYmd > dateRange.toYmd
  ) {
    return NextResponse.json(
      { error: "Rentang tanggal tidak valid." },
      { status: 400 },
    );
  }

  const where = repairsReportWhere(q, { from: fromRaw, to: toRaw });

  const inspections = await prisma.inspection.findMany({
    where,
    orderBy: { inspectedAt: "desc" },
    include: {
      vehicle: { select: { plateNumber: true, unitNo: true } },
      lines: {
        include: {
          item: { select: { category: true, label: true } },
          repairs: {
            orderBy: { createdAt: "asc" },
            select: { reporterName: true, note: true, createdAt: true },
          },
        },
      },
      roadworthinessHistory: { orderBy: { recordedAt: "asc" } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "P2H ARKA";
  wb.created = new Date();

  // === Sheet 1: Ringkasan per P2H ===
  const summary = wb.addWorksheet("Ringkasan", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  summary.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Tgl P2H", key: "tanggal", width: 22 },
    { header: "Plat Nomor", key: "plat", width: 14 },
    { header: "Unit No", key: "unit", width: 12 },
    { header: "Pemeriksa", key: "pemeriksa", width: 22 },
    { header: "Temuan awal", key: "temuanAwal", width: 12 },
    { header: "Sudah diperbaiki", key: "selesai", width: 16 },
    { header: "Belum diperbaiki", key: "pending", width: 16 },
    { header: "Total log perbaikan", key: "totalLog", width: 18 },
    { header: "Pertama tidak layak", key: "firstTidak", width: 22 },
    { header: "Pertama kembali layak", key: "firstLayak", width: 22 },
    { header: "Kelayakan saat ini", key: "kelayakan", width: 22 },
    { header: "Catatan umum", key: "catatan", width: 36 },
  ];

  summary.getRow(1).font = { bold: true };
  summary.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  inspections.forEach((insp, idx) => {
    const initial = insp.lines.filter((l) => l.initialResult === "NOT_OK");
    const resolved = initial.filter((l) => l.result === "OK").length;
    const pending = initial.length - resolved;
    const totalLog = insp.lines.reduce((acc, l) => acc + l.repairs.length, 0);
    const firstNotOk = insp.roadworthinessHistory.find(
      (h) => h.roadworthiness === "TIDAK_LAYAK_JALAN",
    );
    const firstLayak = insp.roadworthinessHistory.find(
      (h) => h.roadworthiness === "LAYAK_JALAN",
    );
    summary.addRow({
      no: idx + 1,
      tanggal: fmt(insp.inspectedAt),
      plat: insp.vehicle.plateNumber,
      unit: insp.vehicle.unitNo ?? "",
      pemeriksa: insp.inspectorName,
      temuanAwal: initial.length,
      selesai: resolved,
      pending,
      totalLog,
      firstTidak: fmt(firstNotOk?.recordedAt),
      firstLayak: fmt(firstLayak?.recordedAt),
      kelayakan: insp.roadworthiness
        ? ROADWORTHINESS_COPY[insp.roadworthiness].title
        : "",
      catatan: insp.overallNotes ?? "",
    });
  });

  summary.eachRow({ includeEmpty: false }, (row) => {
    row.alignment = { vertical: "middle", wrapText: true };
  });

  // === Sheet 2: Detail temuan per poin checklist ===
  const detail = wb.addWorksheet("Detail temuan", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  detail.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Tgl P2H", key: "tanggal", width: 22 },
    { header: "Plat Nomor", key: "plat", width: 14 },
    { header: "Unit No", key: "unit", width: 12 },
    { header: "Pemeriksa", key: "pemeriksa", width: 22 },
    { header: "Kategori", key: "kategori", width: 22 },
    { header: "Poin", key: "poin", width: 28 },
    { header: "Catatan awal", key: "catatanAwal", width: 32 },
    { header: "Status saat ini", key: "statusKini", width: 16 },
    { header: "Catatan saat ini", key: "catatanKini", width: 32 },
    { header: "Jumlah log perbaikan", key: "logCount", width: 18 },
    { header: "Riwayat perbaikan", key: "riwayat", width: 60 },
  ];
  detail.getRow(1).font = { bold: true };
  detail.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  let detailNo = 0;
  for (const insp of inspections) {
    for (const line of insp.lines) {
      if (line.initialResult !== "NOT_OK") continue;
      detailNo += 1;
      const riwayat = line.repairs
        .map(
          (r) =>
            `[${fmt(r.createdAt)}] ${r.reporterName}${r.note ? ` — ${r.note}` : ""}`,
        )
        .join("\n");
      detail.addRow({
        no: detailNo,
        tanggal: fmt(insp.inspectedAt),
        plat: insp.vehicle.plateNumber,
        unit: insp.vehicle.unitNo ?? "",
        pemeriksa: insp.inspectorName,
        kategori: line.item.category,
        poin: line.item.label,
        catatanAwal: line.initialNotes ?? "",
        statusKini:
          line.result === "OK"
            ? "OK (sudah diperbaiki)"
            : line.result === "NOT_OK"
              ? "Tidak memenuhi standar"
              : "Tidak berlaku",
        catatanKini: line.notes ?? "",
        logCount: line.repairs.length,
        riwayat,
      });
    }
  }
  detail.eachRow({ includeEmpty: false }, (row) => {
    row.alignment = { vertical: "middle", wrapText: true };
  });

  // === Sheet 3: Info filter ===
  const info = wb.addWorksheet("Info filter");
  info.columns = [
    { header: "Parameter", key: "key", width: 24 },
    { header: "Nilai", key: "value", width: 60 },
  ];
  info.getRow(1).font = { bold: true };
  info.addRow({ key: "Pencarian (q)", value: q.trim() || "—" });
  info.addRow({
    key: "Dari tanggal",
    value: dateRange.fromYmd ?? "— (tanpa batas bawah)",
  });
  info.addRow({
    key: "Sampai tanggal",
    value: dateRange.toYmd ?? "— (tanpa batas atas)",
  });
  info.addRow({ key: "Total baris ringkasan", value: inspections.length });
  info.addRow({ key: "Diunduh oleh", value: session.fullname });
  info.addRow({ key: "Diunduh pada", value: fmt(new Date()) });

  const rawBuffer = await wb.xlsx.writeBuffer();
  const responseBody =
    rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);

  const today = ymdWita(new Date());
  const rangeLabel =
    dateRange.fromYmd || dateRange.toYmd
      ? `_${dateRange.fromYmd ?? "all"}_to_${dateRange.toYmd ?? "all"}`
      : "";
  const filename = `laporan-p2h-perbaikan_${today}${rangeLabel}.xlsx`;

  return new NextResponse(responseBody, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
