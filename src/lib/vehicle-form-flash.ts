import { cookies } from "next/headers";

const COOKIE_NEW = "p2h_v_new";
const COOKIE_EDIT = "p2h_v_edit";
const COOKIE_LIST_OK = "p2h_v_list_ok";
const MAX_LEN = 3500;
const MAX_OK_LEN = 240;

/** Set-Cookie tidak boleh berisi kontrol char / `;` mentah — bisa memutus nilai cookie. */
function sanitizeForCookie(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/;/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEN);
}

/** Simpan pesan error form (server action); redirect URL tetap pendek — tidak memakai query string panjang. */
export async function setVehicleNewFlash(message: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NEW, sanitizeForCookie(message), {
    path: "/",
    maxAge: 90,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getVehicleNewFlash(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NEW)?.value ?? null;
}

/** Format nilai: `${vehicleId}::${message}` agar tidak tertukar antar tab/unit. */
export async function setVehicleEditFlash(vehicleId: string, message: string): Promise<void> {
  const jar = await cookies();
  const payload = `${vehicleId}::${sanitizeForCookie(message)}`;
  jar.set(COOKIE_EDIT, payload, {
    path: "/",
    maxAge: 90,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getVehicleEditFlash(vehicleId: string): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_EDIT)?.value;
  if (!raw) return null;
  const sep = raw.indexOf("::");
  if (sep === -1) return raw;
  const id = raw.slice(0, sep);
  if (id !== vehicleId) return null;
  return raw.slice(sep + 2) || null;
}

/** Pesan sukses sekali tampil di /vehicles setelah simpan (httpOnly cookie, TTL pendek). */
export async function setVehicleListSuccessFlash(message: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_LIST_OK, sanitizeForCookie(message).slice(0, MAX_OK_LEN), {
    path: "/",
    maxAge: 35,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getVehicleListSuccessFlash(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_LIST_OK)?.value ?? null;
}
