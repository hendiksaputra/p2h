import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionApiRead } from "@/lib/inspection-api-auth";
import {
  fetchInspectionListPage,
  INSPECTIONS_LIST_PAGE_SIZE,
  parseInspectionListPage,
} from "@/lib/inspections-list";

function serializeRow(row: Awaited<ReturnType<typeof fetchInspectionListPage>>["rows"][number]) {
  const km = row.odometerKm;
  return {
    id: row.id,
    unitNo: (row.unitNo ?? "").trim() || null,
    plateNumber: row.plateNumber,
    odometerKm: km,
    lastOdometerKm: km,
    inspectedAt: row.inspectedAt.toISOString(),
    inspectorName: row.inspectorName,
    status: row.status,
    roadworthiness: row.roadworthiness,
  };
}

/**
 * GET /api/inspections?q=&page=
 * Daftar P2H dengan Unit No dan odometer.
 * Auth: cookie sesi web ATAU API key (Bearer / X-API-Key, env P2H_API_KEY).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInspectionApiRead(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const page = parseInspectionListPage(searchParams.get("page") ?? undefined);
  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize =
    pageSizeRaw && Number.isFinite(Number(pageSizeRaw))
      ? Math.min(100, Math.max(1, Math.floor(Number(pageSizeRaw))))
      : INSPECTIONS_LIST_PAGE_SIZE;

  try {
    const { rows, total, page: safePage, pageSize: size, totalPages } = await fetchInspectionListPage({
      q,
      page,
      pageSize,
    });

    return NextResponse.json({
      items: rows.map(serializeRow),
      page: safePage,
      pageSize: size,
      total,
      totalPages,
      q: q || null,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data P2H." }, { status: 500 });
  }
}
