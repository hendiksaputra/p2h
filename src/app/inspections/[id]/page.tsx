import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecklistCategoryHeader, sortChecklistCategoryEntries } from "@/components/ChecklistCategoryHeader";
import { PageHeader } from "@/components/PageHeader";
import { canAccessInspection } from "@/lib/inspection-access";
import {
  NON_COMPLIANT_LABEL,
  ROADWORTHINESS_COPY,
  ROADWORTHINESS_EVENT_SOURCE_LABEL,
  effectiveRoadworthiness,
  roadworthinessCardClass,
  roadworthinessPillClass,
} from "@/lib/inspection-roadworthiness";
import { prisma } from "@/lib/db";
import { LineRepairForm } from "./LineRepairForm";
import { RepairHistoryList } from "./RepairHistoryList";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
};

const resultLabel: Record<string, string> = {
  OK: "OK",
  NOT_OK: NON_COMPLIANT_LABEL,
  NA: "Tidak berlaku",
};

export default async function InspectionDetailPage(props: Props) {
  if (!(await canAccessInspection("detail.p2h"))) {
    notFound();
  }

  const canRepair = await canAccessInspection("repair.p2h");
  const { id } = await props.params;
  const { err: errRaw, ok: okRaw } = await props.searchParams;
  const repairError = typeof errRaw === "string" ? errRaw.trim() : "";
  const repairOk = okRaw === "1" || okRaw === "true";

  const inspection = await prisma.inspection
    .findUnique({
      where: { id },
      include: {
        vehicle: true,
        roadworthinessHistory: { orderBy: { recordedAt: "asc" } },
        lines: {
          include: {
            item: true,
            repairs: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    })
    .catch(() => null);

  if (!inspection) notFound();

  const lines = [...inspection.lines].sort(
    (a, b) => a.item.sortOrder - b.item.sortOrder || a.item.label.localeCompare(b.item.label),
  );
  const grouped = new Map<string, typeof lines>();
  for (const line of lines) {
    const cat = line.item.category;
    const list = grouped.get(cat) ?? [];
    list.push(line);
    grouped.set(cat, list);
  }

  const roadworthiness = effectiveRoadworthiness(inspection.roadworthiness, lines);

  const notOkLines = lines.filter((l) => l.result === "NOT_OK");
  const notOkByCategory = new Map<string, typeof notOkLines>();
  for (const line of notOkLines) {
    const cat = line.item.category;
    const list = notOkByCategory.get(cat) ?? [];
    list.push(line);
    notOkByCategory.set(cat, list);
  }
  const repairCategoryEntries = sortChecklistCategoryEntries(
    Array.from(notOkByCategory.entries()).filter(([, list]) => list.length > 0),
  );

  /** Daftar poin yang awalnya tidak memenuhi standar (bisa sudah/belum diperbaiki). */
  const initiallyNotOkLines = lines.filter((l) => l.initialResult === "NOT_OK");
  const initiallyNotOkResolvedCount = initiallyNotOkLines.filter((l) => l.result === "OK").length;
  const initiallyNotOkPendingCount = initiallyNotOkLines.length - initiallyNotOkResolvedCount;
  const initiallyByCategory = new Map<string, typeof initiallyNotOkLines>();
  for (const line of initiallyNotOkLines) {
    const cat = line.item.category;
    const list = initiallyByCategory.get(cat) ?? [];
    list.push(line);
    initiallyByCategory.set(cat, list);
  }
  const initiallyCategoryEntries = sortChecklistCategoryEntries(
    Array.from(initiallyByCategory.entries()).filter(([, list]) => list.length > 0),
  );

  const rwHistory = [...inspection.roadworthinessHistory];
  const firstTidakLayak = rwHistory.find((h) => h.roadworthiness === "TIDAK_LAYAK_JALAN");
  const firstLayak = rwHistory.find((h) => h.roadworthiness === "LAYAK_JALAN");

  return (
    <>
      <PageHeader
        title="Detail P2H"
        description={`${inspection.vehicle.plateNumber} · ${formatDate(inspection.inspectedAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#riwayat-temuan-awal"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Riwayat temuan awal
            </a>
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              |
            </span>
            <a
              href="#riwayat-kelayakan"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Riwayat kelayakan
            </a>
            {canRepair ? (
              <>
                <span className="hidden text-slate-300 sm:inline" aria-hidden>
                  |
                </span>
                <a
                  href="#tindakan-perbaikan"
                  className="text-sm font-medium text-amber-800 hover:text-amber-950"
                >
                  Tindakan perbaikan
                </a>
              </>
            ) : null}
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              |
            </span>
            <Link href="/inspections" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Kembali
            </Link>
          </div>
        }
      />

      {repairError && canRepair ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {repairError}
        </div>
      ) : null}

      {repairOk && canRepair ? (
        <div
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          Perbaikan berhasil dicatat dan status poin diperbarui ke OK. Kelayakan unit telah dihitung ulang.
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Tanggal pemeriksaan</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDate(inspection.inspectedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Pemeriksa</dt>
            <dd className="mt-1 text-sm text-slate-900">{inspection.inspectorName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {inspection.status === "SUBMITTED" ? "Dikirim" : "Draf"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-500">Kelayakan unit</dt>
            <dd className="mt-2">
              {roadworthiness == null ? (
                <span className="text-sm text-slate-600">—</span>
              ) : (
                <div className={`rounded-lg border px-4 py-3 text-sm ${roadworthinessCardClass(roadworthiness)}`}>
                  <span className="font-bold">{ROADWORTHINESS_COPY[roadworthiness].title}</span>
                  <p className="mt-1 opacity-90">{ROADWORTHINESS_COPY[roadworthiness].subtitle}</p>
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Odometer</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {inspection.odometerKm != null ? `${inspection.odometerKm.toLocaleString("id-ID")} km` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">BBM</dt>
            <dd className="mt-1 text-sm text-slate-900">{inspection.fuelLevel ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-500">Catatan umum</dt>
            <dd className="mt-1 text-sm text-slate-900">{inspection.overallNotes ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <section
        id="riwayat-temuan-awal"
        className="mb-6 scroll-mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-labelledby="riwayat-temuan-awal-heading"
      >
        <h2 id="riwayat-temuan-awal-heading" className="text-sm font-semibold text-slate-900">
          Riwayat hasil pemeriksaan awal
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Daftar poin yang <strong>tercatat tidak memenuhi standar saat pemeriksaan pertama</strong>. Data ini
          tetap disimpan walau sudah ditangani, untuk keperluan pelaporan unit yang pernah membutuhkan
          perbaikan.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-medium uppercase text-slate-500">Total temuan awal</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {initiallyNotOkLines.length}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <p className="text-xs font-medium uppercase text-emerald-800">Sudah ditangani</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-900">
              {initiallyNotOkResolvedCount}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
            <p className="text-xs font-medium uppercase text-amber-900">Masih perlu perbaikan</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-900">
              {initiallyNotOkPendingCount}
            </p>
          </div>
        </div>

        {initiallyCategoryEntries.length === 0 ? (
          <p className="mt-4 text-sm text-emerald-900">
            Pada pemeriksaan ini tidak ada poin yang tercatat sebagai tidak memenuhi standar.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {initiallyCategoryEntries.map(([category, list]) => (
              <li key={category} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{category}</p>
                <ul className="mt-2 space-y-2">
                  {list.map((line) => {
                    const resolved = line.result === "OK";
                    return (
                      <li key={line.id} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{line.item.label}</span>
                          <span
                            className={
                              resolved
                                ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                            }
                          >
                            {resolved ? "Sudah diperbaiki" : "Belum diperbaiki"}
                          </span>
                          {line.repairs.length > 0 ? (
                            <span className="text-xs text-slate-500">
                              {line.repairs.length} catatan perbaikan
                            </span>
                          ) : null}
                        </div>
                        {line.initialNotes ? (
                          <p className="mt-0.5 text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Temuan awal:</span> {line.initialNotes}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="riwayat-kelayakan"
        className="mb-6 scroll-mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-labelledby="riwayat-kelayakan-heading"
      >
        <h2 id="riwayat-kelayakan-heading" className="text-sm font-semibold text-slate-900">
          Riwayat status kelayakan unit
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Waktu tercatat saat status kelayakan berubah (pemeriksaan awal atau setelah perbaikan). Data ini tetap
          disimpan meskipun status checklist diperbarui.
        </p>

        <dl className="mt-4 grid gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Tidak layak jalan (pertama tercatat)</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {firstTidakLayak ? formatDateTime(firstTidakLayak.recordedAt) : "— (tidak ada pada riwayat ini)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Layak jalan (pertama tercatat)</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {firstLayak ? formatDateTime(firstLayak.recordedAt) : "— (belum tercatat)"}
            </dd>
          </div>
        </dl>

        {rwHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada riwayat tersimpan. Data lama bisa muncul setelah migrasi; P2H baru otomatis mencatat riwayat.
          </p>
        ) : (
          <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
            {rwHistory.map((h) => (
              <li key={h.id} className="relative">
                <span
                  className="absolute -left-[calc(0.25rem+2px)] top-1.5 h-2 w-2 rounded-full bg-slate-400"
                  aria-hidden
                />
                <time
                  dateTime={h.recordedAt.toISOString()}
                  className="text-xs font-medium text-slate-500"
                >
                  {formatDateTime(h.recordedAt)}
                </time>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      roadworthinessPillClass(h.roadworthiness),
                    ].join(" ")}
                  >
                    {ROADWORTHINESS_COPY[h.roadworthiness].title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {ROADWORTHINESS_EVENT_SOURCE_LABEL[h.source]}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canRepair ? (
        <section
          id="tindakan-perbaikan"
          className="mb-6 scroll-mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          aria-labelledby="tindakan-perbaikan-heading"
        >
          <h2 id="tindakan-perbaikan-heading" className="text-sm font-semibold text-slate-900">
            Tindakan perbaikan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Untuk setiap kategori di bawah, catat perbaikan pada poin yang berstatus {NON_COMPLIANT_LABEL}. Setelah
            disimpan, poin menjadi <strong>OK</strong>, riwayat tersimpan, dan <strong>kelayakan unit</strong>{" "}
            dihitung ulang. Gunakan menu kategori untuk lompat cepat.
          </p>

        {repairCategoryEntries.length === 0 ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Tidak ada poin yang masih memerlukan tindakan perbaikan berdasarkan hasil pemeriksaan ini.
          </p>
        ) : (
          <>
            <nav
              className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4"
              aria-label="Menu perbaikan per kategori"
            >
              {repairCategoryEntries.map(([category]) => (
                <a
                  key={category}
                  href={`#${repairSectionId(category)}`}
                  className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 hover:border-amber-300 hover:bg-amber-100"
                >
                  Perbaikan: {category}
                </a>
              ))}
            </nav>
            <ul className="mt-4 space-y-5">
              {repairCategoryEntries.map(([category, badList]) => (
                <li
                  key={category}
                  id={repairSectionId(category)}
                  className="scroll-mt-6 rounded-lg border border-amber-200/90 bg-gradient-to-b from-amber-50/60 to-white px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100/90 pb-2">
                    <p className="text-sm font-semibold text-slate-900">{category}</p>
                    <a
                      href={`#${categorySectionId(category)}`}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Lihat di checklist →
                    </a>
                  </div>
                  <ul className="mt-3 space-y-4">
                    {badList.map((line) => (
                      <li key={line.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                        <p className="text-sm font-medium text-slate-900">{line.item.label}</p>
                        {line.item.description ? (
                          <p className="text-xs text-slate-500">{line.item.description}</p>
                        ) : null}
                        {line.notes ? (
                          <p className="mt-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Temuan pemeriksaan:</span> {line.notes}
                          </p>
                        ) : null}
                        <RepairHistoryList repairs={line.repairs} className="mt-2" />
                        <LineRepairForm inspectionId={inspection.id} lineId={line.id} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
        </section>
      ) : null}

      {sortChecklistCategoryEntries(Array.from(grouped.entries())).map(([category, list]) => (
        <section
          key={category}
          id={categorySectionId(category)}
          className="mb-6 scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-4">
            <ChecklistCategoryHeader category={category} />
          </div>
          <ul className="divide-y divide-slate-100">
            {list.map((line) => (
              <li key={line.id} className="px-5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{line.item.label}</p>
                    {line.item.description ? (
                      <p className="mt-0.5 text-sm text-slate-500">{line.item.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        line.result === "NOT_OK"
                          ? "inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800"
                          : line.result === "OK"
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                      }
                    >
                      {resultLabel[line.result] ?? line.result}
                    </span>
                    {line.initialResult === "NOT_OK" && line.result !== line.initialResult ? (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                        Awalnya {NON_COMPLIANT_LABEL}
                      </span>
                    ) : null}
                  </div>
                </div>
                {line.notes ? <p className="mt-2 text-xs text-slate-600">{line.notes}</p> : null}
                {line.initialResult === "NOT_OK" &&
                line.initialNotes &&
                line.initialNotes !== (line.notes ?? "") ? (
                  <p className="mt-1 text-xs italic text-slate-500">
                    <span className="font-medium not-italic text-slate-600">Catatan awal:</span>{" "}
                    {line.initialNotes}
                  </p>
                ) : null}
                <RepairHistoryList repairs={line.repairs} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(d);
}

function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categorySectionId(category: string): string {
  return `checklist-${categorySlug(category)}`;
}

function repairSectionId(category: string): string {
  return `perbaikan-${categorySlug(category)}`;
}
