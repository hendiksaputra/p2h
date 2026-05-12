/** Kunci permission modul P2H (urutan tampilan di UI). */
export const INSPECTION_PERMISSION_KEYS = [
  "create.p2h",
  "detail.p2h",
  "edit.p2h",
  "delete.p2h",
  "repair.p2h",
] as const;

export type InspectionPermissionKey = (typeof INSPECTION_PERMISSION_KEYS)[number];
