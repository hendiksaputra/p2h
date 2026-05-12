"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { INSPECTION_PERMISSION_KEYS } from "@/lib/inspection-permissions";
import { userMessageFromPrismaError } from "@/lib/prisma-errors";
import { SETTINGS_PERMISSION_KEYS } from "@/lib/settings-permissions";
import { VEHICLE_PERMISSION_KEYS } from "@/lib/vehicle-permissions";

export type RbacFormState = {
  ok?: boolean;
  error?: string;
};

/** Simpan role user + izin per user (kendaraan + pengaturan) ke `user_permissions`. */
export async function updateUserRolePermissionsAction(
  _prev: RbacFormState,
  formData: FormData,
): Promise<RbacFormState> {
  const userId = String(formData.get("userId") ?? "").trim();
  const roleIdRaw = String(formData.get("roleId") ?? "").trim();
  const roleId = roleIdRaw === "" ? null : roleIdRaw;

  if (!userId) {
    return { error: "User tidak valid." };
  }

  if (roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
    if (!role) {
      return { error: "Role tidak ditemukan." };
    }
  }

  const selected = formData.getAll("permissionId").map((v) => String(v).trim()).filter(Boolean);
  const allowedKeys = [...VEHICLE_PERMISSION_KEYS, ...INSPECTION_PERMISSION_KEYS, ...SETTINGS_PERMISSION_KEYS];

  const allowed = await prisma.permission.findMany({
    where: { key: { in: allowedKeys } },
    select: { id: true },
  });
  const allowedIds = new Set(allowed.map((p: { id: string }) => p.id));
  const toSave = selected.filter((id) => allowedIds.has(id));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { roleId },
      });
      await tx.userPermission.deleteMany({ where: { userId } });
      if (toSave.length > 0) {
        await tx.userPermission.createMany({
          data: toSave.map((permissionId) => ({ userId, permissionId })),
        });
      }
    });
  } catch (e: unknown) {
    console.error("updateUserRolePermissionsAction:", e);
    return { error: userMessageFromPrismaError(e, "Gagal memperbarui role / izin user.") };
  }

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function updateRolePermissionsAction(
  _prev: RbacFormState,
  formData: FormData,
): Promise<RbacFormState> {
  const roleId = String(formData.get("roleId") ?? "").trim();
  if (!roleId) {
    return { error: "Role tidak valid." };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) {
    return { error: "Role tidak ditemukan." };
  }

  const selected = formData.getAll("permissionId").map((v) => String(v).trim()).filter(Boolean);

  const valid = await prisma.permission.findMany({
    where: { id: { in: selected } },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p: { id: string }) => p.id));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (validIds.size > 0) {
        await tx.rolePermission.createMany({
          data: [...validIds].map((permissionId) => ({ roleId, permissionId })),
        });
      }
    });
  } catch (e: unknown) {
    console.error("updateRolePermissionsAction:", e);
    return { error: userMessageFromPrismaError(e, "Gagal memperbarui izin role.") };
  }

  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
  return { ok: true };
}
