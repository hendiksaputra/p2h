import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionApiRead } from "@/lib/inspection-api-auth";
import {
  fetchInspectionVehicleContext,
  resolveActiveVehicleForContext,
  serializeVehicleOdometer,
} from "@/lib/inspections-list";

/**
 * GET /api/inspections/vehicle-info?vehicleId=  (ID kendaraan di database, cuid)
 * GET /api/inspections/vehicle-info?unitNo=    (Unit No, mis. VA 055)
 * Unit No, nomor polisi, dan odometer terakhir untuk unit terpilih.
 * Auth: cookie sesi web ATAU API key (env P2H_API_KEY).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInspectionApiRead(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    return NextResponse.json(serializeVehicleOdometer(ctx));
  } catch {
    return NextResponse.json({ error: "Gagal memuat data unit." }, { status: 500 });
  }
}
