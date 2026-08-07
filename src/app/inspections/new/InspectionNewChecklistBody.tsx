"use client";

import { useMemo } from "react";
import { ChecklistCategoryHeader, CHECKLIST_CATEGORY_ORDER, sortChecklistCategoryEntries } from "@/components/ChecklistCategoryHeader";
import { HEAVY_INSPECTION_CATEGORY_ORDER } from "@/lib/heavy-equipment-inspection";
import {
  isLightVehicleType,
  LIGHT_VEHICLE_INSPECTION_CATEGORY_ORDER,
} from "@/lib/light-vehicle-inspection";
import { NON_COMPLIANT_LABEL } from "@/lib/inspection-roadworthiness";
import { HEAVY_EQUIPMENT_PLATE_NORMALIZED } from "@/lib/vehicle-validation";
import { useInspectionNewVehicle } from "./InspectionNewVehicleContext";
import { UnitRoadworthinessSummary } from "./UnitRoadworthinessSummary";

export type ChecklistItemRow = {
  id: string;
  category: string;
  label: string;
  description: string | null;
  sortOrder: number;
};

type VehicleRef = { id: string; plateNumber: string; vehicleType: string | null };

function normalizePlate(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

type Props = {
  formId: string;
  vehicles: VehicleRef[];
  roadItems: ChecklistItemRow[];
  heavyItems: ChecklistItemRow[];
  lightItems: ChecklistItemRow[];
};

export function InspectionNewChecklistBody({
  formId,
  vehicles,
  roadItems,
  heavyItems,
  lightItems,
}: Props) {
  const { vehicleId } = useInspectionNewVehicle();

  const selected = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  const plate = selected?.plateNumber ?? "";
  const useHeavy = normalizePlate(plate) === HEAVY_EQUIPMENT_PLATE_NORMALIZED;
  const useLight = !useHeavy && isLightVehicleType(selected?.vehicleType);

  /** ALAT BERAT: standar + alat berat. LIGHT VEHICLE: hanya checklist light vehicle. Lainnya: standar. */
  const activeItems = useHeavy
    ? [...roadItems, ...heavyItems]
    : useLight
      ? lightItems
      : roadItems;

  const hasRoad = roadItems.length > 0;
  const hasHeavy = heavyItems.length > 0;
  const hasLight = lightItems.length > 0;

  const grouped = useMemo(() => {
    const m = new Map<string, ChecklistItemRow[]>();
    for (const it of activeItems) {
      const list = m.get(it.category) ?? [];
      list.push(it);
      m.set(it.category, list);
    }
    return m;
  }, [activeItems]);

  const sortedEntries = useMemo(() => {
    const order = useHeavy
      ? ([...CHECKLIST_CATEGORY_ORDER, ...HEAVY_INSPECTION_CATEGORY_ORDER] as readonly string[])
      : useLight
        ? LIGHT_VEHICLE_INSPECTION_CATEGORY_ORDER
        : CHECKLIST_CATEGORY_ORDER;
    return sortChecklistCategoryEntries(Array.from(grouped.entries()), order);
  }, [grouped, useHeavy, useLight]);

  const checklistForSummary = useMemo(
    () => activeItems.map((i) => ({ id: i.id, label: i.label, category: i.category })),
    [activeItems],
  );

  if (useLight && !hasLight) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Master checklist <strong>LIGHT VEHICLE</strong> belum ada di database. Jalankan{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code>, lalu muat ulang halaman ini.
      </div>
    );
  }

  if (useHeavy && !hasRoad && !hasHeavy) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Master checklist kosong. Jalankan{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code> pada server, lalu muat ulang halaman ini.
      </div>
    );
  }

  if (!useHeavy && !useLight && roadItems.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Master checklist kendaraan jalan kosong. Jalankan{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code>.
      </div>
    );
  }

  return (
    <>
      {vehicleId && useLight ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          Jenis kendaraan <strong>LIGHT VEHICLE</strong> — checklist mengikuti form pemeriksaan light vehicle
          (lampu, wiper, rem parkir, sabuk, indikator, ban, cairan, sakelar, coolant).
        </p>
      ) : null}

      {vehicleId && useHeavy ? (
        <div className="space-y-2">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            Kendaraan terpilih memakai nomor polisi <strong>ALAT BERAT</strong> — ditampilkan checklist{" "}
            <strong>kendaraan standar</strong> (Eksterior, Lampu &amp; Sinyal, dll.) dan{" "}
            <strong>kategori khusus alat berat</strong> (UNDERCARRIAGE, ATTACHMENT, dll.).
          </p>
          {hasRoad && !hasHeavy ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Master checklist khusus alat berat belum ada di database. Jalankan{" "}
              <code className="rounded bg-amber-100 px-1">npm run db:seed</code> bila perlu bagian tersebut.
            </p>
          ) : null}
          {!hasRoad && hasHeavy ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Master checklist kendaraan standar kosong. Jalankan{" "}
              <code className="rounded bg-amber-100 px-1">npm run db:seed</code> untuk kategori Eksterior, Lampu
              &amp; Sinyal, dll.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 rounded-xl bg-slate-100 p-4 sm:p-6 xl:grid-cols-2">
        {sortedEntries.map(([category, list]) => (
          <section key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <ChecklistCategoryHeader category={category} />
            </div>
            <ul className="divide-y divide-slate-100">
              {list.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <input type="hidden" name="itemId" value={item.id} />
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`result_${item.id}`} value="OK" required />
                      <span>OK</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`result_${item.id}`} value="NOT_OK" />
                      <span>{NON_COMPLIANT_LABEL}</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`result_${item.id}`} value="NA" />
                      <span>Tidak berlaku</span>
                    </label>
                  </div>
                  <label className="mt-2 block text-xs font-medium text-slate-500" htmlFor={`notes_${item.id}`}>
                    Catatan poin
                  </label>
                  <input
                    id={`notes_${item.id}`}
                    name={`notes_${item.id}`}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <UnitRoadworthinessSummary formId={formId} checklistItems={checklistForSummary} />
    </>
  );
}
