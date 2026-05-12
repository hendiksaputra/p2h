"use server";

import { hash } from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canAccessSetting } from "@/lib/settings-access";
import { userMessageFromPrismaError } from "@/lib/prisma-errors";
import { setUsersListSuccessFlash } from "@/lib/users-form-flash";
import {
  normalizeUserInput,
  validateUserInput,
  type UserFieldErrors,
} from "@/lib/user-validation";

export type UserFormState = {
  errors?: UserFieldErrors;
  formError?: string;
};

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const input = normalizeUserInput(formData);
  const fieldErrors = validateUserInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors };
  }

  try {
    const passwordHash = await hash(input.password, 10);
    await prisma.user.create({
      data: {
        username: input.username,
        password: passwordHash,
        nik: input.nik,
        fullname: input.fullname,
        position: input.position,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      if (target.includes("username")) {
        return { errors: { username: "Username sudah digunakan." } };
      }
      if (target.includes("nik")) {
        return { errors: { nik: "NIK sudah terdaftar." } };
      }
      return { formError: "Data duplikat terdeteksi (username/NIK)." };
    }
    console.error("createUserAction:", e);
    return { formError: userMessageFromPrismaError(e, "Gagal menyimpan user.") };
  }

  revalidatePath("/settings/users");
  await setUsersListSuccessFlash(`User ${input.username} berhasil ditambahkan.`);
  redirect("/settings/users");
}

export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  if (!(await canAccessSetting("manage.users"))) {
    return { formError: "Tidak ada izin untuk mengubah data user." };
  }

  const userId = String(formData.get("id") ?? "").trim();
  if (!userId) {
    return { formError: "ID user tidak valid." };
  }

  const input = normalizeUserInput(formData);
  const fieldErrors = validateUserInput(input, { passwordOptional: true });
  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existing) {
      return { formError: "User tidak ditemukan." };
    }

    const data: {
      username: string;
      nik: string;
      fullname: string;
      position: string;
      password?: string;
    } = {
      username: input.username,
      nik: input.nik,
      fullname: input.fullname,
      position: input.position,
    };
    if (input.password) {
      data.password = await hash(input.password, 10);
    }

    await prisma.user.update({ where: { id: userId }, data });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      if (target.includes("username")) {
        return { errors: { username: "Username sudah digunakan." } };
      }
      if (target.includes("nik")) {
        return { errors: { nik: "NIK sudah terdaftar." } };
      }
      return { formError: "Data duplikat terdeteksi (username/NIK)." };
    }
    console.error("updateUserAction:", e);
    return { formError: userMessageFromPrismaError(e, "Gagal memperbarui user.") };
  }

  revalidatePath("/settings/users");
  await setUsersListSuccessFlash(`User ${input.username} berhasil diperbarui.`);
  redirect("/settings/users");
}
