import { NextRequest, NextResponse } from "next/server";
import { canAccessInspection } from "@/lib/inspection-access";
import { getSessionUser } from "@/lib/auth-session";
import {
  fetchInspectionListPage,
  INSPECTIONS_LIST_PAGE_SIZE,
  parseInspectionListPage,
} from "@/lib/inspections-list";

function serializeRow(row: Awaited<ReturnType<typeof fetchInspectionListPage>>["rows"][number]) {
  return {
    id: row.id,
    unitNo: (row.unitNo ?? "").trim() || null,
    plateNumber: row.plateNumber,
    odometerKm: row.odometerKm,
    inspectedAt: row.inspectedAt.toISOString(),
    inspectorName: row.inspectorName,
    status: row.status,
    roadworthiness: row.roadworthiness,
  };
}

/**
 * GET /api/inspections?q=&page=
 * Daftar P2H dengan Unit No dan odometer (paginasi, filter pencarian sama halaman /inspections).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  if (!(await canAccessInspection("detail.p2h"))) {
    return NextResponse.json({ error: "Anda tidak memiliki izin melihat data P2H." }, { status: 403 });
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
