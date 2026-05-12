"use server";

import { InspectionRoadworthinessEventSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessInspection } from "@/lib/inspection-access";
import { computeRoadworthinessFromResults } from "@/lib/inspection-roadworthiness";
import { prisma } from "@/lib/db";

function fail(inspectionId: string, message: string): never {
  redirect(`/inspections/${inspectionId}?err=${encodeURIComponent(message)}`);
}

export async function recordInspectionLineRepair(formData: FormData) {
  const session = await getSessionUser();
  const inspectionIdEarly = String(formData.get("inspectionId") ?? "").trim();
  if (!session) {
    redirect(
      inspectionIdEarly
        ? `/login?next=${encodeURIComponent(`/inspections/${inspectionIdEarly}`)}`
        : "/login",
    );
  }
  if (!(await canAccessInspection("repair.p2h"))) {
    fail(inspectionIdEarly || "unknown", "Anda tidak memiliki izin tindakan perbaikan.");
  }

  const inspectionId = inspectionIdEarly;
  const lineId = String(formData.get("lineId") ?? "").trim();
  const note = String(formData.get("repairNote") ?? "").trim();

  if (!inspectionId || !lineId) fail(inspectionId || "unknown", "Data tidak lengkap.");

  try {
    await prisma.$transaction(async (tx) => {
      const beforeInsp = await tx.inspection.findUnique({
        where: { id: inspectionId },
        select: { roadworthiness: true },
      });
      const previousRoadworthiness = beforeInsp?.roadworthiness ?? null;

      const line = await tx.inspectionLine.findFirst({
        where: { id: lineId, inspectionId },
      });
      if (!line) {
        throw new Error("Baris checklist tidak ditemukan.");
      }
      if (line.result !== "NOT_OK") {
        throw new Error("Hanya poin dengan temuan yang dapat ditandai selesai diperbaiki.");
      }

      await tx.inspectionLineRepair.create({
        data: {
          inspectionLineId: lineId,
          reporterUserId: session.id,
          reporterName: session.fullname,
          note: note.length ? note : null,
        },
      });

      await tx.inspectionLine.update({
        where: { id: lineId },
        data: { result: "OK" },
      });

      const allLines = await tx.inspectionLine.findMany({
        where: { inspectionId },
        select: { result: true },
      });
      const roadworthiness = computeRoadworthinessFromResults(allLines.map((l) => l.result));
      await tx.inspection.update({
        where: { id: inspectionId },
        data: { roadworthiness },
      });

      if (roadworthiness !== previousRoadworthiness) {
        await tx.inspectionRoadworthinessHistory.create({
          data: {
            inspectionId,
            roadworthiness,
            source: InspectionRoadworthinessEventSource.PEMBARUAN_PERBAIKAN,
          },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan perbaikan.";
    fail(inspectionId, msg);
  }

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${inspectionId}`);
  redirect(`/inspections/${inspectionId}?ok=1#tindakan-perbaikan`);
}
