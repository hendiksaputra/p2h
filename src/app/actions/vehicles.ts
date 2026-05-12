"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canAccessVehicle } from "@/lib/vehicle-access";
import { userMessageFromPrismaError } from "@/lib/prisma-errors";
import { setVehicleListSuccessFlash } from "@/lib/vehicle-form-flash";
import {
  HEAVY_EQUIPMENT_PLATE_NORMALIZED,
  normalizedPlateFromForm,
  validateVehicleFields,
  type VehicleFieldErrors,
} from "@/lib/vehicle-validation";

export type VehicleFormState = {
  errors?: VehicleFieldErrors;
  formError?: string;
};

export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  if (!(await canAccessVehicle("create.vehicles"))) {
    return { formError: "Anda tidak punya izin membuat kendaraan (create.vehicles)." };
  }

  const fieldErrors = validateVehicleFields(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors };
  }

  const plateNumber = normalizedPlateFromForm(formData);
  const unitNo = emptyToNull(formData.get("unitNo"));

  const uniquenessErrors = await vehicleUniquenessErrors({
    plateNumber,
    unitNo,
    excludeVehicleId: null,
  });
  if (uniquenessErrors && Object.keys(uniquenessErrors).length > 0) {
    return { errors: uniquenessErrors };
  }

  try {
    await prisma.vehicle.create({
      data: {
        plateNumber,
        unitNo,
        brand: emptyToNull(formData.get("brand")),
        model: emptyToNull(formData.get("model")),
        vehicleType: emptyToNull(formData.get("vehicleType")),
        year: parseOptionalInt(formData.get("year")),
        notes: emptyToNull(formData.get("notes")),
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return { errors: { plateNumber: "Nomor polisi sudah terdaftar." } };
    }
    console.error("createVehicleAction:", e);
    return { formError: userMessageFromPrismaError(e, "Gagal menyimpan kendaraan.") };
  }

  revalidatePath("/vehicles");
  const unitLabel = unitNo ? ` — Unit ${unitNo}` : "";
  await setVehicleListSuccessFlash(`Kendaraan ${plateNumber}${unitLabel} berhasil ditambahkan.`);
  redirect("/vehicles");
}

export async function updateVehicleAction(
  vehicleId: string,
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  if (!(await canAccessVehicle("ubah.vehicles"))) {
    return { formError: "Anda tidak punya izin mengubah kendaraan (ubah.vehicles)." };
  }

  const fieldErrors = validateVehicleFields(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors };
  }

  const plateNumber = normalizedPlateFromForm(formData);
  const unitNo = emptyToNull(formData.get("unitNo"));

  const uniquenessErrors = await vehicleUniquenessErrors({
    plateNumber,
    unitNo,
    excludeVehicleId: vehicleId,
  });
  if (uniquenessErrors && Object.keys(uniquenessErrors).length > 0) {
    return { errors: uniquenessErrors };
  }

  try {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        plateNumber,
        unitNo,
        brand: emptyToNull(formData.get("brand")),
        model: emptyToNull(formData.get("model")),
        vehicleType: emptyToNull(formData.get("vehicleType")),
        year: parseOptionalInt(formData.get("year")),
        notes: emptyToNull(formData.get("notes")),
        isActive: formData.get("isActive") === "on",
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return { errors: { plateNumber: "Nomor polisi sudah dipakai unit lain." } };
    }
    console.error("updateVehicleAction:", e);
    return { formError: userMessageFromPrismaError(e, "Gagal memperbarui kendaraan.") };
  }

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${vehicleId}/edit`);
  const unitLabel = unitNo ? ` — Unit ${unitNo}` : "";
  await setVehicleListSuccessFlash(`Data kendaraan ${plateNumber}${unitLabel} berhasil diperbarui.`);
  redirect("/vehicles");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

/**
 * Nomor polisi unik untuk kendaraan biasa.
 * Untuk `ALAT BERAT`, nomor boleh sama antar baris; yang unik adalah pasangan dengan Unit No.
 */
async function vehicleUniquenessErrors(params: {
  plateNumber: string;
  unitNo: string | null;
  excludeVehicleId: string | null;
}): Promise<VehicleFieldErrors | null> {
  const { plateNumber, unitNo, excludeVehicleId } = params;
  const notSelf =
    excludeVehicleId && excludeVehicleId.length > 0 ? { id: { not: excludeVehicleId } as const } : {};

  if (plateNumber === HEAVY_EQUIPMENT_PLATE_NORMALIZED) {
    const u = unitNo?.trim();
    if (!u) {
      return { unitNo: "Unit No wajib untuk nomor polisi ALAT BERAT." };
    }
    const dup = await prisma.vehicle.findFirst({
      where: {
        plateNumber: HEAVY_EQUIPMENT_PLATE_NORMALIZED,
        unitNo: u,
        ...notSelf,
      },
    });
    if (dup) {
      return { unitNo: "Unit No ini sudah dipakai untuk kendaraan ALAT BERAT lain." };
    }
    return null;
  }

  const dup = await prisma.vehicle.findFirst({
    where: { plateNumber, ...notSelf },
  });
  if (dup) {
    return { plateNumber: "Nomor polisi sudah terdaftar." };
  }
  return null;
}

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
