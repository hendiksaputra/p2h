import { NextRequest, NextResponse } from "next/server";
import { canAccessInspection } from "@/lib/inspection-access";
import { getSessionUser } from "@/lib/auth-session";
import { fetchInspectionVehicleContext } from "@/lib/inspections-list";

/**
 * GET /api/inspections/vehicle-info?vehicleId=
 * Unit No, nomor polisi, dan odometer terakhir untuk unit terpilih (form P2H baru).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  if (!(await canAccessInspection("create.p2h")) && !(await canAccessInspection("detail.p2h"))) {
    return NextResponse.json({ error: "Anda tidak memiliki izin." }, { status: 403 });
  }

  const vehicleId = (request.nextUrl.searchParams.get("vehicleId") ?? "").trim();
  if (!vehicleId) {
    return NextResponse.json({ error: "Parameter vehicleId wajib." }, { status: 400 });
  }

  try {
    const ctx = await fetchInspectionVehicleContext(vehicleId);
    if (!ctx) {
      return NextResponse.json({ error: "Kendaraan tidak ditemukan atau tidak aktif." }, { status: 404 });
    }

    return NextResponse.json({
      vehicleId: ctx.vehicleId,
      unitNo: (ctx.unitNo ?? "").trim() || null,
      plateNumber: ctx.plateNumber,
      lastOdometerKm: ctx.lastOdometerKm,
      lastOdometerAt: ctx.lastOdometerAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data unit." }, { status: 500 });
  }
}
