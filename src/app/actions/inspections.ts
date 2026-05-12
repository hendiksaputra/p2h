"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InspectionRoadworthinessEventSource, type CheckResult } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-session";
import { canAccessInspection } from "@/lib/inspection-access";
import { computeRoadworthinessFromResults } from "@/lib/inspection-roadworthiness";
import { prisma } from "@/lib/db";

const RESULTS = new Set<string>(["OK", "NOT_OK", "NA"]);

function failInspection(message: string): never {
  redirect(`/inspections/new?error=${encodeURIComponent(message)}`);
}

/** Parse YYYY-MM-DD sebagai awal hari di Asia/Makassar (WITA). */
function parseInspectedDateYmd(raw: string): Date | null {
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const isoLocal = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+08:00`;
  const dt = new Date(isoLocal);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Ambil komponen jam:menit:detik dari `ref` dalam zona Asia/Makassar (WITA). */
function localTimeOfDayMs(ref: Date): number {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(ref);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const h = get("hour") % 24;
  const m = get("minute");
  const s = get("second");
  return (h * 3600 + m * 60 + s) * 1000;
}

/**
 * Gabungkan tanggal yang dipilih user dengan jam-WITA.
 * `sourceTime` opsional: bila ada, gunakan jam dari sumber tersebut (untuk update),
 * else pakai jam saat ini (untuk create).
 */
function combineWithLocalTimeOfDay(dayStart: Date, sourceTime?: Date): Date {
  const ms = localTimeOfDayMs(sourceTime ?? new Date());
  return new Date(dayStart.getTime() + ms);
}

const DATE_FORMATTER_ID = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Makassar",
});

/** Cari P2H pada hari yang sama untuk vehicleId. Bisa exclude ID tertentu (untuk update). */
async function findExistingInspectionOnDay(
  vehicleId: string,
  dayStart: Date,
  excludeInspectionId?: string,
) {
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.inspection.findFirst({
    where: {
      vehicleId,
      inspectedAt: { gte: dayStart, lt: dayEnd },
      ...(excludeInspectionId ? { id: { not: excludeInspectionId } } : {}),
    },
    select: {
      id: true,
      vehicle: { select: { unitNo: true, plateNumber: true } },
    },
  });
}

function vehicleLabel(v: { unitNo: string | null; plateNumber: string }): string {
  const unit = (v.unitNo ?? "").trim();
  return unit.length > 0 ? unit : v.plateNumber;
}

export async function createInspection(formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) failInspection("Sesi berakhir. Silakan login kembali.");
  if (!(await canAccessInspection("create.p2h"))) {
    failInspection("Anda tidak memiliki izin untuk membuat P2H.");
  }

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const inspectorName = sessionUser.fullname.trim();
  if (!vehicleId) failInspection("Pilih kendaraan.");
  if (!inspectorName) failInspection("Nama pemeriksa tidak tersedia pada akun Anda.");

  const inspectedDateRaw = String(formData.get("inspectedDate") ?? "").trim();
  const inspectedAt = parseInspectedDateYmd(inspectedDateRaw);
  if (!inspectedAt) failInspection("Tanggal pemeriksaan tidak valid.");

  const odometerKm = parseOptionalInt(formData.get("odometerKm"));
  const fuelLevel = emptyToNull(formData.get("fuelLevel"));
  const overallNotes = emptyToNull(formData.get("overallNotes"));
  const submit = formData.get("submit") === "1";

  const itemIds = formData.getAll("itemId").map(String);
  const lines: { itemId: string; result: CheckResult; notes: string | null }[] = [];

  for (const itemId of itemIds) {
    const resultRaw = String(formData.get(`result_${itemId}`) ?? "").trim();
    if (!RESULTS.has(resultRaw)) {
      failInspection("Lengkapi hasil untuk semua poin checklist.");
    }
    const notes = emptyToNull(formData.get(`notes_${itemId}`));
    lines.push({ itemId, result: resultRaw as CheckResult, notes });
  }

  if (lines.length === 0) {
    failInspection("Checklist tidak tersedia. Jalankan seed database.");
  }

  const duplicate = await findExistingInspectionOnDay(vehicleId, inspectedAt);
  if (duplicate) {
    const label = vehicleLabel(duplicate.vehicle);
    failInspection(
      `Unit ${label} sudah memiliki P2H pada ${DATE_FORMATTER_ID.format(inspectedAt)}. Pilih kendaraan lain atau lakukan P2H di hari berikutnya.`,
    );
  }

  const latestForVehicle = await prisma.inspection.findFirst({
    where: { vehicleId },
    orderBy: [{ inspectedAt: "desc" }, { id: "desc" }],
    select: { roadworthiness: true },
  });
  if (latestForVehicle?.roadworthiness === "TIDAK_LAYAK_JALAN") {
    failInspection(
      "Unit ini masih memiliki P2H terakhir dengan status tidak layak jalan. Selesaikan perbaikan pada P2H tersebut (atau hapus bila tidak dipakai) sebelum membuat P2H baru.",
    );
  }

  const roadworthiness = computeRoadworthinessFromResults(lines.map((l) => l.result));
  const inspectedAtWithTime = combineWithLocalTimeOfDay(inspectedAt);

  try {
    await prisma.inspection.create({
      data: {
        vehicleId,
        inspectorName,
        inspectedAt: inspectedAtWithTime,
        odometerKm,
        fuelLevel,
        overallNotes,
        roadworthiness,
        status: submit ? "SUBMITTED" : "DRAFT",
        roadworthinessHistory: {
          create: {
            roadworthiness,
            source: InspectionRoadworthinessEventSource.PEMERIKSAAN_AWAL,
            recordedAt: inspectedAtWithTime,
          },
        },
        lines: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            result: l.result,
            notes: l.notes,
            initialResult: l.result,
            initialNotes: l.notes,
          })),
        },
      },
    });
  } catch (e) {
    console.error(e);
    failInspection("Gagal menyimpan P2H.");
  }

  revalidatePath("/inspections");
  redirect("/inspections");
}

function failInspectionEdit(inspectionId: string, message: string): never {
  if (inspectionId) {
    redirect(`/inspections/${inspectionId}/edit?error=${encodeURIComponent(message)}`);
  }
  redirect(`/inspections?err=${encodeURIComponent(message)}`);
}

export async function updateInspection(formData: FormData) {
  const sessionUser = await getSessionUser();
  const inspectionId = String(formData.get("inspectionId") ?? "").trim();
  if (!sessionUser) {
    redirect(
      inspectionId
        ? `/login?next=${encodeURIComponent(`/inspections/${inspectionId}/edit`)}`
        : "/login",
    );
  }
  if (!(await canAccessInspection("edit.p2h"))) {
    failInspectionEdit(inspectionId, "Anda tidak memiliki izin untuk mengubah P2H.");
  }
  if (!inspectionId) {
    redirect(`/inspections?err=${encodeURIComponent("ID P2H tidak valid.")}`);
  }

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  if (!vehicleId) failInspectionEdit(inspectionId, "Pilih kendaraan.");

  const inspectedDateRaw = String(formData.get("inspectedDate") ?? "").trim();
  const inspectedAt = parseInspectedDateYmd(inspectedDateRaw);
  if (!inspectedAt) failInspectionEdit(inspectionId, "Tanggal pemeriksaan tidak valid.");

  const odometerKm = parseOptionalInt(formData.get("odometerKm"));
  const fuelLevel = emptyToNull(formData.get("fuelLevel"));
  const overallNotes = emptyToNull(formData.get("overallNotes"));
  const submit = formData.get("submit") === "1";

  const itemIds = formData.getAll("itemId").map(String);
  const lines: { itemId: string; result: CheckResult; notes: string | null }[] = [];

  for (const itemId of itemIds) {
    const resultRaw = String(formData.get(`result_${itemId}`) ?? "").trim();
    if (!RESULTS.has(resultRaw)) {
      failInspectionEdit(inspectionId, "Lengkapi hasil untuk semua poin checklist.");
    }
    const notes = emptyToNull(formData.get(`notes_${itemId}`));
    lines.push({ itemId, result: resultRaw as CheckResult, notes });
  }

  if (lines.length === 0) {
    failInspectionEdit(inspectionId, "Checklist tidak tersedia.");
  }

  const duplicate = await findExistingInspectionOnDay(vehicleId, inspectedAt, inspectionId);
  if (duplicate) {
    const label = vehicleLabel(duplicate.vehicle);
    failInspectionEdit(
      inspectionId,
      `Unit ${label} sudah memiliki P2H lain pada ${DATE_FORMATTER_ID.format(inspectedAt)}. Pilih tanggal atau kendaraan lain.`,
    );
  }

  const roadworthiness = computeRoadworthinessFromResults(lines.map((l) => l.result));

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.inspection.findUnique({
        where: { id: inspectionId },
        select: { roadworthiness: true, inspectedAt: true },
      });
      if (!before) throw new Error("P2H tidak ditemukan.");
      const previousRoadworthiness = before.roadworthiness ?? null;
      const inspectedAtWithTime = combineWithLocalTimeOfDay(inspectedAt, before.inspectedAt);

      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          vehicleId,
          inspectedAt: inspectedAtWithTime,
          odometerKm,
          fuelLevel,
          overallNotes,
          roadworthiness,
          status: submit ? "SUBMITTED" : "DRAFT",
        },
      });

      for (const l of lines) {
        await tx.inspectionLine.upsert({
          where: { inspectionId_itemId: { inspectionId, itemId: l.itemId } },
          create: {
            inspectionId,
            itemId: l.itemId,
            result: l.result,
            notes: l.notes,
            initialResult: l.result,
            initialNotes: l.notes,
          },
          update: {
            result: l.result,
            notes: l.notes,
            initialResult: l.result,
            initialNotes: l.notes,
          },
        });
      }

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
    console.error(e);
    failInspectionEdit(
      inspectionId,
      e instanceof Error ? e.message : "Gagal memperbarui P2H.",
    );
  }

  revalidatePath("/inspections");
  revalidatePath(`/inspections/${inspectionId}`);
  redirect(`/inspections?edited=1`);
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
}

