import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Kunci dari env `P2H_API_KEY` (server). Jangan commit nilai aslinya. */
export function getConfiguredApiKey(): string | null {
  const key = process.env.P2H_API_KEY?.trim();
  return key && key.length >= 16 ? key : null;
}

/**
 * Validasi API key dari header:
 * - `Authorization: Bearer <key>`
 * - `X-API-Key: <key>`
 */
export function verifyApiKeyFromRequest(request: NextRequest): boolean {
  const expected = getConfiguredApiKey();
  if (!expected) return false;

  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token && safeEqual(token, expected)) return true;
  }

  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey && safeEqual(headerKey, expected)) return true;

  return false;
}
