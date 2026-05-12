import { cookies } from "next/headers";
import {
  P2H_SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "./auth-jwt";

export type AppSessionUser = {
  id: string;
  username: string;
  fullname: string;
};

export async function getSessionUser(): Promise<AppSessionUser | null> {
  const jar = await cookies();
  const token = jar.get(P2H_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return { id: payload.sub, username: payload.username, fullname: payload.fullname };
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(P2H_SESSION_COOKIE, token, {
    httpOnly: true,
    // Server saat ini diakses via HTTP (tanpa TLS), jadi cookie harus non-secure.
    // Nyalakan kembali secure=true ketika sudah pindah ke HTTPS.
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(P2H_SESSION_COOKIE);
}

export { createSessionToken };
