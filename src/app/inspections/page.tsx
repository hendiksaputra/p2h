import Link from "next/link";
import { Suspense } from "react";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { canAccessInspection } from "@/lib/inspection-access";
import { getDbErrorMessage } from "@/lib/db-error";
import { prisma } from "@/lib/db";
import { inspectionListWhere } from "@/lib/inspections-query";
import type { InspectionRoadworthiness } from "@prisma/client";
import { ROADWORTHINESS_COPY, roadworthinessPillClass } from "@/lib/inspection-roadworthiness";
import { DeleteInspectionButton } from "./DeleteInspectionButton";
import { InspectionsToolbar } from "./InspectionsToolbar";

type Props = {
  searchParams: Promise<{ q?: string; err?: string; deleted?: string; edited?: string }>;
};

function DetailIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

export default async function InspectionsPage(props: Props) {
  const {
    q: qRaw = "",
    err: errRaw,
    deleted: deletedRaw,
    edited: editedRaw,
  } = await props.searchParams;
  const q = typeof qRaw === "string" ? qRaw : "";
  const listError = typeof errRaw === "string" ? errRaw.trim() : "";
  const deletedOk = deletedRaw === "1" || deletedRaw === "true";
  const editedOk = editedRaw === "1" || editedRaw === "true";
  const canCreate = await canAccessInspection("create.p2h");
  const canDetail = await canAccessInspection("detail.p2h");
  const canEdit = await canAccessInspection("edit.p2h");
  const canDelete = await canAccessInspection("delete.p2h");

  let rows: {
    id: string;
    inspectedAt: Date;
    inspectorName: string;
    status: string;
    unitNo: string | null;
    plate: string;
    roadworthiness: InspectionRoadworthiness | null;
  }[] = [];
  let dbError: string | null = null;

  try {
    const list = await prisma.inspection.findMany({
      where: inspectionListWhere(q),
      orderBy: { inspectedAt: "desc" },
      take: 200,
      include: { vehicle: { select: { plateNumber: true, unitNo: true } } },
    });
    rows = list.map((x) => ({
      id: x.id,
      inspectedAt: x.inspectedAt,
      inspectorName: x.inspectorName,
      status: x.status,
      unitNo: x.vehicle.unitNo,
      plate: x.vehicle.plateNumber,
      roadworthiness: x.roadworthiness,
    }));
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat P2H.";
  }

  return (
    <>
      <PageHeader
        title="Pemeriksaan harian (P2H)"
        description="Riwayat checklist per kendaraan. Gunakan detail untuk audit temuan."
        action={
          canCreate ? (
            <Link
              href="/inspections/new"
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              P2H baru
            </Link>
          ) : null
        }
      />

      {!canDetail ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Anda tidak memiliki izin untuk melihat detail P2H.
        </div>
      ) : null}

      {listError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {deletedOk ? (
        <div
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          P2H berhasil dihapus.
        </div>
      ) : null}

      {editedOk ? (
        <div
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          P2H berhasil diperbarui.
        </div>
      ) : null}

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError ? (
        <Suspense
          fallback={
            <div className="mb-4 h-10 max-w-md animate-pulse rounded-lg bg-slate-200" aria-hidden />
          }
        >
          <InspectionsToolbar initialQ={q} />
        </Suspense>
      ) : null}

      {!dbError && canDetail && rows.length === 0 && !q.trim() ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Belum ada P2H.{" "}
          <Link href="/inspections/new" className="font-medium text-blue-700 hover:underline">
            Buat yang pertama
          </Link>
          .
        </p>
      ) : null}

      {!dbError && canDetail && rows.length === 0 && q.trim() ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Tidak ada P2H yang cocok dengan &quot;{q.trim()}&quot;. Ubah kata kunci pencarian.
        </p>
      ) : null}

      {!dbError && canDetail && rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="w-14 px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Unit No</th>
                <th className="px-4 py-3">Kendaraan</th>
                <th className="px-4 py-3">Pemeriksa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Kelayakan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-center tabular-nums text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.inspectedAt)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {(r.unitNo ?? "").trim() ? (
                      <span className="font-medium text-slate-900">{(r.unitNo ?? "").trim()}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.plate}</td>
                  <td className="px-4 py-3 text-slate-600">{r.inspectorName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "SUBMITTED"
                          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                          : "inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                      }
                    >
                      {r.status === "SUBMITTED" ? "Dikirim" : "Draf"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.roadworthiness ? (
                      <span
                        className={[
                          "inline-flex max-w-[min(100%,14rem)] rounded-full border px-2 py-0.5 text-xs font-medium",
                          roadworthinessPillClass(r.roadworthiness),
                        ].join(" ")}
                      >
                        {ROADWORTHINESS_COPY[r.roadworthiness].title}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Link
                        href={`/inspections/${r.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        title="Detail"
                        aria-label={`Detail P2H ${r.plate}`}
                      >
                        <DetailIcon />
                      </Link>
                      {canEdit ? (
                        <Link
                          href={`/inspections/${r.id}/edit`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          title="Edit P2H"
                          aria-label={`Edit P2H ${r.plate}`}
                        >
                          <EditIcon />
                        </Link>
                      ) : null}
                      {canDelete ? <DeleteInspectionButton inspectionId={r.id} plateLabel={r.plate} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(d);
}
