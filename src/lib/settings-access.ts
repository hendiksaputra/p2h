import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { SETTINGS_PERMISSION_KEYS, type SettingsPermissionKey } from "@/lib/settings-permissions";

export async function getCurrentUserSettingsPermissions(): Promise<Set<SettingsPermissionKey>> {
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
    .filter(
      (k): k is SettingsPermissionKey => (SETTINGS_PERMISSION_KEYS as readonly string[]).includes(k),
    );
  if (direct.length > 0) return new Set(direct);

  const fromRole =
    user.role?.permissions
      .map((x) => x.permission.key)
      .filter(
        (k): k is SettingsPermissionKey =>
          (SETTINGS_PERMISSION_KEYS as readonly string[]).includes(k),
      ) ?? [];
  return new Set(fromRole);
}

export async function canAccessSetting(permission: SettingsPermissionKey): Promise<boolean> {
  const perms = await getCurrentUserSettingsPermissions();
  return perms.has(permission);
}
