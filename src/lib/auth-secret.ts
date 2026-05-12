/** Kunci penandatanganan JWT sesi (HS256). Wajib kuat di production. */
export function getAuthSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) {
    return new TextEncoder().encode(s);
  }
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dev-insecure-p2h-secret-min-32-chars!!");
  }
  throw new Error("Set environment variable AUTH_SECRET (minimal 16 karakter).");
}
