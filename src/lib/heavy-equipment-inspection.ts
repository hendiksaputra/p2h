/** Kategori checklist P2H khusus kendaraan bertanda nomor polisi ALAT BERAT (urut tampilan). */
export const HEAVY_INSPECTION_CATEGORY_ORDER = [
  "UNDERCARRIAGE",
  "ATTACHMENT",
  "CYLINDER",
  "VESSEL",
] as const;

const HEAVY_SET = new Set<string>(HEAVY_INSPECTION_CATEGORY_ORDER);

export function isHeavyEquipmentInspectionCategory(category: string): boolean {
  return HEAVY_SET.has(category);
}

/** Judul & subjudul di header kategori (selaras permintaan bisnis). */
export const HEAVY_INSPECTION_CATEGORY_HEADER: Record<
  string,
  { index: number; title: string; subtitle: string }
> = {
  UNDERCARRIAGE: {
    index: 1,
    title: "UNDERCARRIAGE",
    subtitle: "( pemeriksaan track, roller, final drive )",
  },
  ATTACHMENT: {
    index: 2,
    title: "ATTACHMENT",
    subtitle: "( pemeriksaan fork, boom, arm, bucket, main hook, chain, wire rope )",
  },
  CYLINDER: {
    index: 3,
    title: "CYLINDER",
    subtitle: "( pemeriksaan kebocoran cylinder & hose )",
  },
  VESSEL: {
    index: 4,
    title: "VESSEL",
    subtitle: "( pemeriksaan dump vessel, long vessel, tipper vessel )",
  },
};
