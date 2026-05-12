import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { VEHICLE_PERMISSION_KEYS, type VehiclePermissionKey } from "@/lib/vehicle-permissions";

export async function getCurrentUserVehiclePermissions(): Promise<Set<VehiclePermissionKey>> {
  const session = await getSessionUser();
  if (!session) return new Set();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      permissions: { select: { permission: { select: { key: true } } } },
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });
  if (!user) return new Set();

  const direct = user.permissions
    .map((x) => x.permission.key)
    .filter((k): k is VehiclePermissionKey =>
      (VEHICLE_PERMISSION_KEYS as readonly string[]).includes(k),
    );
  if (direct.length > 0) {
    return new Set(direct);
  }

  const fromRole =
    user.role?.permissions
      .map((x) => x.permission.key)
      .filter((k): k is VehiclePermissionKey =>
        (VEHICLE_PERMISSION_KEYS as readonly string[]).includes(k),
      ) ?? [];

  return new Set(fromRole);
}

export async function canAccessVehicle(permission: VehiclePermissionKey): Promise<boolean> {
  const perms = await getCurrentUserVehiclePermissions();
  return perms.has(permission);
}
