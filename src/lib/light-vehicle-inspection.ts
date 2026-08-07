/** Nilai jenis kendaraan (`vehicle.vehicleType`) untuk checklist light vehicle. */
export const LIGHT_VEHICLE_TYPE_NORMALIZED = "LIGHT VEHICLE";

/** Kategori checklist P2H khusus LIGHT VEHICLE (urut tampilan). */
export const LIGHT_VEHICLE_INSPECTION_CATEGORY_ORDER = ["LIGHT VEHICLE"] as const;

const LIGHT_SET = new Set<string>(LIGHT_VEHICLE_INSPECTION_CATEGORY_ORDER);

export function isLightVehicleInspectionCategory(category: string): boolean {
  return LIGHT_SET.has(category);
}

export function isLightVehicleType(vehicleType: string | null | undefined): boolean {
  return (vehicleType ?? "").trim().toUpperCase().replace(/\s+/g, " ") === LIGHT_VEHICLE_TYPE_NORMALIZED;
}

export const LIGHT_VEHICLE_INSPECTION_CATEGORY_HEADER: Record<
  string,
  { index: number; title: string; subtitle: string }
> = {
  "LIGHT VEHICLE": {
    index: 1,
    title: "LIGHT VEHICLE",
    subtitle: "( pemeriksaan lampu, wiper, rem parkir, sabuk, indikator, ban, cairan, sakelar )",
  },
};
