"use client";

import { useMemo } from "react";
import { ChecklistCategoryHeader, CHECKLIST_CATEGORY_ORDER, sortChecklistCategoryEntries } from "@/components/ChecklistCategoryHeader";
import { HEAVY_INSPECTION_CATEGORY_ORDER } from "@/lib/heavy-equipment-inspection";
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

type VehicleRef = { id: string; plateNumber: string };

function normalizePlate(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

type Props = {
  formId: string;
  vehicles: VehicleRef[];
  roadItems: ChecklistItemRow[];
  heavyItems: ChecklistItemRow[];
};

export function InspectionNewChecklistBody({ formId, vehicles, roadItems, heavyItems }: Props) {
  const { vehicleId } = useInspectionNewVehicle();

  const plate = useMemo(
    () => vehicles.find((v) => v.id === vehicleId)?.plateNumber ?? "",
    [vehicles, vehicleId],
  );

  const useHeavy = normalizePlate(plate) === HEAVY_EQUIPMENT_PLATE_NORMALIZED;
  const activeItems = useHeavy ? heavyItems : roadItems;

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
    const order = useHeavy ? HEAVY_INSPECTION_CATEGORY_ORDER : CHECKLIST_CATEGORY_ORDER;
    return sortChecklistCategoryEntries(Array.from(grouped.entries()), order);
  }, [grouped, useHeavy]);

  const checklistForSummary = useMemo(
    () => activeItems.map((i) => ({ id: i.id, label: i.label, category: i.category })),
    [activeItems],
  );

  if (useHeavy && heavyItems.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Master checklist alat berat belum ada di database. Jalankan{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code> pada server, lalu muat ulang halaman ini.
      </div>
    );
  }

  if (!useHeavy && roadItems.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Master checklist kendaraan jalan kosong. Jalankan{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code>.
      </div>
    );
  }

  return (
    <>
      {vehicleId && useHeavy ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          Kendaraan terpilih memakai nomor polisi <strong>ALAT BERAT</strong> — checklist disesuaikan untuk alat
          berat.
        </p>
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
