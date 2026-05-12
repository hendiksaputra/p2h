import { cookies } from "next/headers";

const COOKIE_USERS_OK = "p2h_users_ok";
const MAX_OK_LEN = 240;

function sanitizeForCookie(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/;/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_OK_LEN);
}

export async function setUsersListSuccessFlash(message: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_USERS_OK, sanitizeForCookie(message), {
    path: "/",
    maxAge: 35,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getUsersListSuccessFlash(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_USERS_OK)?.value ?? null;
}
