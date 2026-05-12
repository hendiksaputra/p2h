"use server";

import { compare } from "bcrypt";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSessionCookie, createSessionToken, setSessionCookie } from "@/lib/auth-session";
import { userMessageFromPrismaError } from "@/lib/prisma-errors";

export type LoginState = {
  error?: string;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  let user: { id: string; username: string; fullname: string; password: string } | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, fullname: true, password: true },
    });
  } catch (e: unknown) {
    console.error("loginAction:", e);
    return { error: userMessageFromPrismaError(e, "Tidak dapat memverifikasi login.") };
  }

  if (!user) {
    return { error: "Username atau password tidak valid." };
  }

  const ok = await compare(password, user.password);
  if (!ok) {
    return { error: "Username atau password tidak valid." };
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    fullname: user.fullname,
  });
  await setSessionCookie(token);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
