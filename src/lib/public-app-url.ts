import { headers } from "next/headers";

/**
 * Asal URL publik untuk tautan cetak (QR login, dll.).
 * Set `NEXT_PUBLIC_APP_ORIGIN` jika akses lewat reverse proxy dan header Host/proto tidak sesuai publik.
 * Contoh: `https://p2h.domain.com` (tanpa slash akhir).
 */
export async function getPublicAppOrigin(): Promise<string> {
  const trimmed = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

/** URL halaman login (untuk QR / tautan cetak). */
export async function getLoginPagePublicUrl(): Promise<string> {
  const origin = await getPublicAppOrigin();
  return `${origin}/login`;
}
