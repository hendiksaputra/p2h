"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROADWORTHINESS_COPY } from "@/lib/inspection-roadworthiness";
import { useInspectionNewVehicleOptional } from "./InspectionNewVehicleContext";

type VehicleOption = {
  id: string;
  plateNumber: string;
  unitNo: string | null;
};

type Props = {
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
  /** ID kendaraan yang sudah memiliki P2H pada hari ini (Asia/Makassar / WITA). */
  inspectedTodayIds?: string[];
  /** vehicleId → id P2H terakhir yang status kelayakannya tidak layak jalan (blok P2H baru). */
  notRoadworthyLastInspectionIdByVehicle?: Record<string, string>;
};

function normalizeForSearch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** Cocokkan Unit No atau nomor polisi (perbandingan case-insensitive, spasi diabaikan untuk polisi). */
function optionMatchesQuery(queryRaw: string, unitNo: string, plateNumber: string): boolean {
  const q = queryRaw.trim();
  if (!q) return true;
  const qLower = q.toLowerCase();
  const qPlate = normalizeForSearch(q);
  const unitLower = unitNo.toLowerCase();
  const plateLower = plateNumber.toLowerCase();
  const plateCompact = normalizeForSearch(plateNumber);
  return (
    unitLower.includes(qLower) ||
    plateLower.includes(qLower) ||
    (qPlate.length > 0 && plateCompact.includes(qPlate))
  );
}

export function UnitNoVehiclePicker({
  vehicles,
  defaultVehicleId,
  inspectedTodayIds = [],
  notRoadworthyLastInspectionIdByVehicle = {},
}: Props) {
  const formVehicleCtx = useInspectionNewVehicleOptional();

  const inspectedTodaySet = useMemo(
    () => new Set(inspectedTodayIds),
    [inspectedTodayIds],
  );

  const options = useMemo(
    () =>
      vehicles
        .filter((v) => (v.unitNo ?? "").trim().length > 0)
        .map((v) => ({
          id: v.id,
          unitNo: (v.unitNo ?? "").trim(),
          plateNumber: v.plateNumber,
          alreadyToday: inspectedTodaySet.has(v.id),
          notRoadworthy: Boolean(notRoadworthyLastInspectionIdByVehicle[v.id]),
        }))
        .sort((a, b) => a.unitNo.localeCompare(b.unitNo)),
    [vehicles, inspectedTodaySet, notRoadworthyLastInspectionIdByVehicle],
  );

  const [selectedId, setSelectedId] = useState(defaultVehicleId ?? "");
  const [query, setQuery] = useState(() => {
    if (!defaultVehicleId) return "";
    const v = vehicles.find((x) => x.id === defaultVehicleId);
    return (v?.unitNo ?? "").trim();
  });

  const setFormVehicleId = formVehicleCtx?.setVehicleId;
  useEffect(() => {
    setFormVehicleId?.(selectedId);
  }, [selectedId, setFormVehicleId]);

  const filtered = options.filter((o) => optionMatchesQuery(query, o.unitNo, o.plateNumber));
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const queryTrim = query.trim();
  const selectionCommitted =
    Boolean(selectedId && selected && queryTrim === selected.unitNo);
  const showSuggestions = queryTrim.length > 0 && !selectionCommitted;
  const selectedAlreadyToday = Boolean(selected && selected.alreadyToday);
  const selectedNotRoadworthy = Boolean(selected && selected.notRoadworthy);
  const notRoadworthyInspectionId = selectedId
    ? notRoadworthyLastInspectionIdByVehicle[selectedId]
    : undefined;

  return (
    <>
      <input type="hidden" name="vehicleId" value={selectedId} />

      <div>
        <label htmlFor="vehiclePlateNumber" className="block text-sm font-medium text-slate-700">
          Kendaraan / Nomor polisi
        </label>
        <input
          id="vehiclePlateNumber"
          type="text"
          readOnly
          value={selected?.plateNumber ?? ""}
          placeholder="Otomatis terisi setelah Unit No dipilih"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm text-slate-700"
        />
      </div>

      <div className="relative">
        <label htmlFor="unitNoSearch" className="block text-sm font-medium text-slate-700">
          Unit No / No polisi <span className="text-red-600">*</span>
        </label>
        <input
          id="unitNoSearch"
          type="search"
          required
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
          }}
          placeholder="Cari Unit No atau nomor polisi…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
        />
        {selectedAlreadyToday ? (
          <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Unit ini sudah memiliki P2H hari ini. Silakan pilih unit lain atau lakukan P2H di hari berikutnya.
          </p>
        ) : null}
        {selectedNotRoadworthy && notRoadworthyInspectionId ? (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            <span className="font-semibold">{ROADWORTHINESS_COPY.TIDAK_LAYAK_JALAN.title}.</span> Belum bisa membuat
            P2H baru untuk unit ini.{" "}
            <Link
              href={`/inspections/${notRoadworthyInspectionId}`}
              className="font-medium text-red-950 underline hover:no-underline"
            >
              Buka P2H terakhir
            </Link>
          </p>
        ) : null}
        {showSuggestions ? (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">
                Tidak ada kendaraan yang cocok dengan Unit No atau nomor polisi tersebut.
              </p>
            ) : (
              <ul>
                {filtered.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedId === o.id}
                      onClick={() => {
                        setSelectedId(o.id);
                        setQuery(o.unitNo);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                        selectedId === o.id ? "bg-blue-50 text-blue-700" : "text-slate-700",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{o.unitNo}</span>
                        <span className="ml-2 text-xs text-slate-500">{o.plateNumber}</span>
                      </span>
                      {o.alreadyToday ? (
                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                          Sudah P2H hari ini
                        </span>
                      ) : null}
                      {o.notRoadworthy ? (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                          Tidak layak jalan
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

