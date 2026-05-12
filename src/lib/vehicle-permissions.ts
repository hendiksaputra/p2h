/** Kunci permission modul kendaraan (urutan tampilan di UI). */
export const VEHICLE_PERMISSION_KEYS = ["create.vehicles", "ubah.vehicles", "read.vehicles"] as const;

export type VehiclePermissionKey = (typeof VEHICLE_PERMISSION_KEYS)[number];
