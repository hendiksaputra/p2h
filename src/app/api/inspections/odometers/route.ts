import { NextRequest, NextResponse } from "next/server";
import { authorizeInspectionApiRead } from "@/lib/inspection-api-auth";
import { fetchAllVehiclesOdometer, serializeVehicleOdometer } from "@/lib/inspections-list";

/**
 * GET /api/inspections/odometers
 * GET /api/inspections/odometers?q=VA
 * Odometer terakhir (dari P2H terbaru) untuk semua kendaraan aktif.
 * Auth: cookie sesi web ATAU API key (P2H_API_KEY).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInspectionApiRead(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  try {
    const rows = await fetchAllVehiclesOdometer(q);
    const items = rows.map(serializeVehicleOdometer);

    return NextResponse.json({
      items,
      total: items.length,
      q: q || null,
      note: "odometerKm diambil dari P2H terakhir per unit; null jika belum pernah diisi di P2H.",
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data odometer." }, { status: 500 });
  }
}
