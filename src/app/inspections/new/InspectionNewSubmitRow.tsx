"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ROADWORTHINESS_COPY } from "@/lib/inspection-roadworthiness";
import { useInspectionNewVehicle } from "./InspectionNewVehicleContext";

export function InspectionNewSubmitRow() {
  const { vehicleId, inspectedTodayIds, notRoadworthyLastInspectionIdByVehicle } = useInspectionNewVehicle();

  const inspectedTodaySet = useMemo(() => new Set(inspectedTodayIds), [inspectedTodayIds]);

  const notRoadworthyInspectionId =
    vehicleId && notRoadworthyLastInspectionIdByVehicle[vehicleId]
      ? notRoadworthyLastInspectionIdByVehicle[vehicleId]
      : null;

  const blockedToday = Boolean(vehicleId && inspectedTodaySet.has(vehicleId));
  const blockedNotRoadworthy = Boolean(notRoadworthyInspectionId);
  const submitDisabled = blockedToday || blockedNotRoadworthy;

  return (
    <div className="space-y-3">
      {blockedNotRoadworthy && notRoadworthyInspectionId ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="status"
        >
          <p className="font-medium">{ROADWORTHINESS_COPY.TIDAK_LAYAK_JALAN.title}</p>
          <p className="mt-1 text-red-800/90">
            Unit ini belum bisa membuat P2H baru. Selesaikan perbaikan pada P2H terakhir hingga status kelayakan
            tidak lagi &ldquo;Tidak layak jalan&rdquo;, atau hapus P2H tersebut bila tidak dipakai.
          </p>
          <p className="mt-2">
            <Link
              href={`/inspections/${notRoadworthyInspectionId}`}
              className="font-medium text-red-950 underline hover:no-underline"
            >
              Buka P2H terkait
            </Link>
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="submit"
          value="0"
          disabled={submitDisabled}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
        >
          Simpan draf
        </button>
        <button
          type="submit"
          name="submit"
          value="1"
          disabled={submitDisabled}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
        >
          Kirim P2H
        </button>
      </div>
    </div>
  );
}
