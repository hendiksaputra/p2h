import type {
  CheckResult,
  InspectionRoadworthiness,
  InspectionRoadworthinessEventSource,
} from "@prisma/client";

/** Label singkat untuk hasil NOT_OK di UI (nilai form tetap `NOT_OK`). */
export const NON_COMPLIANT_LABEL = "Tidak memenuhi standar";

/** Keterangan sumber entri riwayat kelayakan. */
export const ROADWORTHINESS_EVENT_SOURCE_LABEL: Record<
  InspectionRoadworthinessEventSource,
  string
> = {
  PEMERIKSAAN_AWAL: "Hasil pemeriksaan awal",
  PEMBARUAN_PERBAIKAN: "Pembaruan setelah perbaikan checklist",
};

/** Tampilan konsisten form & detail. */
export const ROADWORTHINESS_COPY: Record<
  InspectionRoadworthiness,
  { title: string; subtitle: string }
> = {
  LAYAK_JALAN: {
    title: "Layak jalan",
    subtitle: "Semua poin memenuhi standar atau tidak berlaku; tidak ada temuan ketidaksesuaian.",
  },
  RUSAK_RINGAN_PERLU_PERBAIKAN: {
    title: "Ketidaksesuaian terbatas — perlu perbaikan",
    subtitle:
      "Ada satu atau dua poin yang tidak memenuhi standar; selesaikan tindak lanjut sebelum operasi rutin.",
  },
  TIDAK_LAYAK_JALAN: {
    title: "Tidak layak jalan",
    subtitle:
      "Tiga atau lebih poin tidak memenuhi standar; unit tidak disarankan beroperasi sebelum perbaikan menyeluruh.",
  },
};

export function roadworthinessCardClass(r: InspectionRoadworthiness): string {
  switch (r) {
    case "LAYAK_JALAN":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "RUSAK_RINGAN_PERLU_PERBAIKAN":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "TIDAK_LAYAK_JALAN":
      return "border-red-200 bg-red-50 text-red-950";
    default:
      return "border-slate-200 bg-white text-slate-900";
  }
}

/** Pill/badge ringkas untuk tabel & daftar (hijau / amber / merah). */
export function roadworthinessPillClass(r: InspectionRoadworthiness): string {
  switch (r) {
    case "LAYAK_JALAN":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "TIDAK_LAYAK_JALAN":
      return "border-red-200 bg-red-50 text-red-800";
    case "RUSAK_RINGAN_PERLU_PERBAIKAN":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/**
 * Hitung status kelayakan dari hasil checklist.
 * Hanya `NOT_OK` yang menurunkan kelayakan; `NA` dianggap tidak menambah temuan rusak.
 *
 * Aturan: 0 NOT_OK → layak; 1–2 NOT_OK → rusak ringan; ≥3 NOT_OK → tidak layak.
 */
export function computeRoadworthinessFromResults(results: CheckResult[]): InspectionRoadworthiness {
  const notOk = results.filter((r) => r === "NOT_OK").length;
  if (notOk === 0) return "LAYAK_JALAN";
  if (notOk <= 2) return "RUSAK_RINGAN_PERLU_PERBAIKAN";
  return "TIDAK_LAYAK_JALAN";
}

export function effectiveRoadworthiness(
  stored: InspectionRoadworthiness | null,
  lines: { result: CheckResult }[],
): InspectionRoadworthiness | null {
  if (stored) return stored;
  if (lines.length === 0) return null;
  return computeRoadworthinessFromResults(lines.map((l) => l.result));
}
