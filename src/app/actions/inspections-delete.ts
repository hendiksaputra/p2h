"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { canAccessInspection } from "@/lib/inspection-access";

export async function deleteInspectionAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?next=/inspections");
  }
  if (!(await canAccessInspection("delete.p2h"))) {
    redirect("/inspections?err=" + encodeURIComponent("Anda tidak memiliki izin untuk menghapus P2H."));
  }

  const id = String(formData.get("inspectionId") ?? "").trim();
  if (!id) {
    redirect("/inspections?err=" + encodeURIComponent("ID P2H tidak valid."));
  }

  try {
    const deleted = await prisma.inspection.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      redirect("/inspections?err=" + encodeURIComponent("P2H tidak ditemukan atau sudah dihapus."));
    }
  } catch (e) {
    console.error(e);
    redirect("/inspections?err=" + encodeURIComponent("Gagal menghapus P2H."));
  }

  revalidatePath("/inspections");
  revalidatePath("/");
  redirect("/inspections?deleted=1");
}
