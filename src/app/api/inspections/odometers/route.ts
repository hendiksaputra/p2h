import { NextRequest, NextResponse } from "next/server";
import { fetchAllVehiclesOdometer, serializeVehicleOdometer } from "@/lib/inspections-list";

/**
 * GET /api/inspections/odometers
 * GET /api/inspections/odometers?q=VA
 * Odometer terakhir (dari P2H terbaru) untuk semua kendaraan aktif.
 * Endpoint publik (tanpa login / API key) — hanya baca data odometer.
 */
export async function GET(request: NextRequest) {
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
