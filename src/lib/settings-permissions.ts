/** Kunci permission modul Pengaturan (urutan tampilan di UI). */
export const SETTINGS_PERMISSION_KEYS = [
  "read.settings",
  "manage.users",
  "manage.roles",
] as const;

export type SettingsPermissionKey = (typeof SETTINGS_PERMISSION_KEYS)[number];
