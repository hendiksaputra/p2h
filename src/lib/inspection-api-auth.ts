import type { NextRequest } from "next/server";
import { verifyApiKeyFromRequest, getConfiguredApiKey } from "@/lib/api-key-auth";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessInspection } from "@/lib/inspection-access";

export type InspectionApiAuth =
  | { ok: true; via: "apiKey" | "session" }
  | { ok: false; status: 401 | 403 | 503; error: string };

/** Akses baca data P2H via API: cookie sesi web ATAU `P2H_API_KEY` (mobile / integrasi). */
export async function authorizeInspectionApiRead(request: NextRequest): Promise<InspectionApiAuth> {
  if (verifyApiKeyFromRequest(request)) {
    return { ok: true, via: "apiKey" };
  }

  const session = await getSessionUser();
  if (!session) {
    if (!getConfiguredApiKey()) {
      return {
        ok: false,
        status: 503,
        error:
          "API key belum dikonfigurasi di server (P2H_API_KEY). Gunakan login web atau hubungi administrator.",
      };
    }
    return {
      ok: false,
      status: 401,
      error: "Tidak diizinkan. Kirim header Authorization: Bearer <API_KEY> atau X-API-Key.",
    };
  }

  if (!(await canAccessInspection("detail.p2h"))) {
    return {
      ok: false,
      status: 403,
      error: "Anda tidak memiliki izin melihat data P2H.",
    };
  }

  return { ok: true, via: "session" };
}
