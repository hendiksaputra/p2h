/** Jenis kendaraan yang memakai checklist crane (overhead / gantry). */
export const CRANE_VEHICLE_TYPES_NORMALIZED = ["OVER HEAD CRANE", "GANTRY CRANE"] as const;

/** Kategori master checklist bersama untuk OVER HEAD CRANE & GANTRY CRANE. */
export const CRANE_INSPECTION_CATEGORY_ORDER = ["CRANE"] as const;

const CRANE_CATEGORY_SET = new Set<string>(CRANE_INSPECTION_CATEGORY_ORDER);
const CRANE_TYPE_SET = new Set<string>(CRANE_VEHICLE_TYPES_NORMALIZED);

function normalizeVehicleType(vehicleType: string | null | undefined): string {
  return (vehicleType ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

export function isCraneInspectionCategory(category: string): boolean {
  return CRANE_CATEGORY_SET.has(category);
}

export function isCraneVehicleType(vehicleType: string | null | undefined): boolean {
  const t = normalizeVehicleType(vehicleType);
  if (CRANE_TYPE_SET.has(t)) return true;
  /** Terima juga "OVERHEAD CRANE" tanpa spasi di tengah. */
  if (t === "OVERHEAD CRANE") return true;
  return false;
}

export const CRANE_INSPECTION_CATEGORY_HEADER: Record<
  string,
  { index: number; title: string; subtitle: string }
> = {
  CRANE: {
    index: 1,
    title: "OVER HEAD CRANE / GANTRY CRANE",
    subtitle: "( SWL, pelindung, switch, electrical, hoist, sling, hook, boom, ESD, indicator )",
  },
};
