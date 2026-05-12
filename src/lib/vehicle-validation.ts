/** Nilai nomor polisi bersama untuk banyak unit alat berat (boleh duplikat di DB; bedakan dengan Unit No). */
export const HEAVY_EQUIPMENT_PLATE_NORMALIZED = "ALAT BERAT";

export const vehicleFieldKeys = [
  "plateNumber",
  "unitNo",
  "brand",
  "model",
  "vehicleType",
  "year",
  "notes",
] as const;

export type VehicleFieldKey = (typeof vehicleFieldKeys)[number];

export type VehicleFieldErrors = Partial<Record<VehicleFieldKey, string>>;

/** Normalisasi nomor polisi: trim, huruf besar, spasi tunggal. */
export function normalizedPlateFromForm(formData: FormData): string {
  return String(formData.get("plateNumber") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function validateVehicleFields(formData: FormData): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};

  const plate = normalizedPlateFromForm(formData);
  if (!plate) {
    errors.plateNumber = "Nomor polisi wajib diisi.";
  } else if (plate.length < 3) {
    errors.plateNumber = "Nomor polisi minimal 3 karakter.";
  } else if (plate.length > 20) {
    errors.plateNumber = "Nomor polisi maksimal 20 karakter.";
  } else if (!/^[\dA-Z ]+$/.test(plate)) {
    errors.plateNumber = "Nomor polisi hanya boleh huruf, angka, dan spasi.";
  }

  const unitNo = String(formData.get("unitNo") ?? "").trim();
  if (!errors.plateNumber && plate === HEAVY_EQUIPMENT_PLATE_NORMALIZED && !unitNo) {
    errors.unitNo = "Unit No wajib untuk nomor polisi ALAT BERAT (bedakan tiap unit alat berat).";
  }

  if (unitNo.length > 64) {
    errors.unitNo = "Unit No maksimal 64 karakter.";
  }

  for (const key of ["brand", "model", "vehicleType"] as const) {
    const v = String(formData.get(key) ?? "").trim();
    if (v.length > 120) {
      errors[key] = "Maksimal 120 karakter.";
    }
  }

  const yearStr = String(formData.get("year") ?? "").trim();
  if (yearStr) {
    const y = Number(yearStr);
    if (!Number.isFinite(y) || !Number.isInteger(y)) {
      errors.year = "Tahun harus berupa angka bulat.";
    } else if (y < 1980 || y > 2100) {
      errors.year = "Tahun harus antara 1980 dan 2100.";
    }
  }

  const notes = String(formData.get("notes") ?? "");
  if (notes.length > 5000) {
    errors.notes = "Catatan terlalu panjang (maks. 5000 karakter).";
  }

  return errors;
}
