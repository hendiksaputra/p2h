import { NextRequest, NextResponse } from "next/server";
import { canAccessInspection } from "@/lib/inspection-access";
import { getSessionUser } from "@/lib/auth-session";
import {
  fetchInspectionVehicleContext,
  resolveActiveVehicleForContext,
} from "@/lib/inspections-list";

/**
 * GET /api/inspections/vehicle-info?vehicleId=  (ID kendaraan di database, cuid)
 * GET /api/inspections/vehicle-info?unitNo=    (Unit No, mis. VA 055)
 * Unit No, nomor polisi, dan odometer terakhir untuk unit terpilih.
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
  const unitNo = (request.nextUrl.searchParams.get("unitNo") ?? "").trim();
  if (!vehicleId && !unitNo) {
    return NextResponse.json(
      { error: "Isi salah satu: vehicleId (ID database) atau unitNo (mis. VA 055)." },
      { status: 400 },
    );
  }

  try {
    const resolved = await resolveActiveVehicleForContext({ vehicleId, unitNo });
    if (resolved === "ambiguous") {
      return NextResponse.json(
        {
          error:
            "Lebih dari satu kendaraan aktif dengan Unit No tersebut. Gunakan parameter vehicleId (ID database).",
        },
        { status: 409 },
      );
    }
    if (!resolved) {
      return NextResponse.json(
        {
          error: "Kendaraan tidak ditemukan atau tidak aktif.",
          hint:
            vehicleId && !unitNo
              ? "vehicleId harus ID database (bukan Unit No). Coba ?unitNo=... atau lihat vehicleId di GET /api/inspections."
              : "Periksa ejaan Unit No (harus sama persis dengan data di sistem).",
        },
        { status: 404 },
      );
    }

    const ctx = await fetchInspectionVehicleContext(resolved.id);
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
