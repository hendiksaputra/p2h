import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateInspection } from "@/app/actions/inspections";
import { ChecklistCategoryHeader, sortChecklistCategoryEntries } from "@/components/ChecklistCategoryHeader";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/auth-session";
import { getDbErrorMessage } from "@/lib/db-error";
import { canAccessInspection } from "@/lib/inspection-access";
import { NON_COMPLIANT_LABEL } from "@/lib/inspection-roadworthiness";
import { prisma } from "@/lib/db";
import { UnitNoVehiclePicker } from "../../new/UnitNoVehiclePicker";
import { UnitRoadworthinessSummary } from "../../new/UnitRoadworthinessSummary";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditInspectionPage(props: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    const { id } = await props.params;
    redirect(`/login?next=${encodeURIComponent(`/inspections/${id}/edit`)}`);
  }
  if (!(await canAccessInspection("edit.p2h"))) {
    redirect("/inspections");
  }

  const { id } = await props.params;
  const { error: errorParam } = await props.searchParams;
  const formError = errorParam?.trim() || null;

  let dbError: string | null = null;
  let inspection: Awaited<ReturnType<typeof loadInspection>> | null = null;
  let vehicles: { id: string; plateNumber: string; unitNo: string | null }[] = [];

  try {
    [inspection, vehicles] = await Promise.all([
      loadInspection(id),
      prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { plateNumber: "asc" },
        select: { id: true, plateNumber: true, unitNo: true },
      }),
    ]);
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat data P2H untuk diedit.";
  }

  if (!dbError && !inspection) notFound();

  const items = (inspection?.lines ?? [])
    .map((l) => ({
      id: l.item.id,
      category: l.item.category,
      label: l.item.label,
      description: l.item.description,
      sortOrder: l.item.sortOrder,
      result: l.result,
      notes: l.notes,
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.sortOrder - b.sortOrder;
    });

  const grouped = new Map<string, typeof items>();
  for (const it of items) {
    const list = grouped.get(it.category) ?? [];
    list.push(it);
    grouped.set(it.category, list);
  }

  const inspectedDateYmd = inspection
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Makassar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(inspection.inspectedAt)
    : "";

  const checklistForSummary = items.map((i) => ({
    id: i.id,
    label: i.label,
    category: i.category,
  }));

  return (
    <>
      <PageHeader
        title="Edit P2H"
        description="Perbaiki kesalahan centang atau perbarui catatan pemeriksaan."
        action={
          <Link
            href={inspection ? `/inspections/${inspection.id}` : "/inspections"}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Kembali
          </Link>
        }
      />

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {formError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      {!dbError && inspection ? (
        <>
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Mengubah data di sini bersifat <strong>koreksi</strong> P2H — bukan tindakan perbaikan resmi.
            Riwayat tindakan perbaikan tetap disimpan dan dapat dilihat di halaman detail.
          </div>

          <form id="p2h-edit-form" action={updateInspection} className="space-y-8">
            <input type="hidden" name="inspectionId" value={inspection.id} />

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Informasi umum</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <UnitNoVehiclePicker vehicles={vehicles} defaultVehicleId={inspection.vehicleId} />
                <div className="sm:col-span-2 sm:max-w-xs">
                  <label htmlFor="inspectedDate" className="block text-sm font-medium text-slate-700">
                    Tanggal pemeriksaan <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="inspectedDate"
                    name="inspectedDate"
                    type="date"
                    required
                    defaultValue={inspectedDateYmd}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="inspectorName" className="block text-sm font-medium text-slate-700">
                    Nama pemeriksa
                  </label>
                  <input
                    id="inspectorName"
                    name="inspectorName"
                    type="text"
                    readOnly
                    defaultValue={inspection.inspectorName}
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm text-slate-700"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Pemeriksa awal dipertahankan untuk menjaga riwayat siapa yang melakukan P2H.
                  </p>
                </div>
                <div>
                  <label htmlFor="odometerKm" className="block text-sm font-medium text-slate-700">
                    Odometer (km)
                  </label>
                  <input
                    id="odometerKm"
                    name="odometerKm"
                    type="number"
                    min={0}
                    defaultValue={inspection.odometerKm ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="fuelLevel" className="block text-sm font-medium text-slate-700">
                    Level BBM
                  </label>
                  <input
                    id="fuelLevel"
                    name="fuelLevel"
                    placeholder="Mis. penuh, ½, E"
                    defaultValue={inspection.fuelLevel ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="overallNotes" className="block text-sm font-medium text-slate-700">
                    Catatan umum
                  </label>
                  <textarea
                    id="overallNotes"
                    name="overallNotes"
                    rows={3}
                    defaultValue={inspection.overallNotes ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {items.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                P2H ini belum memiliki poin checklist tersimpan.
              </div>
            ) : (
              <div className="grid gap-6 rounded-xl bg-slate-100 p-4 sm:p-6 xl:grid-cols-2">
                {sortChecklistCategoryEntries(Array.from(grouped.entries())).map(([category, list]) => (
                  <section
                    key={category}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-100 px-5 py-4">
                      <ChecklistCategoryHeader category={category} />
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {list.map((item) => (
                        <li key={item.id} className="px-5 py-4">
                          <input type="hidden" name="itemId" value={item.id} />
                          <p className="text-sm font-bold text-slate-900">{item.label}</p>
                          {item.description ? (
                            <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`result_${item.id}`}
                                value="OK"
                                required
                                defaultChecked={item.result === "OK"}
                              />
                              <span>OK</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`result_${item.id}`}
                                value="NOT_OK"
                                defaultChecked={item.result === "NOT_OK"}
                              />
                              <span>{NON_COMPLIANT_LABEL}</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="radio"
                                name={`result_${item.id}`}
                                value="NA"
                                defaultChecked={item.result === "NA"}
                              />
                              <span>Tidak berlaku</span>
                            </label>
                          </div>
                          <label
                            className="mt-2 block text-xs font-medium text-slate-500"
                            htmlFor={`notes_${item.id}`}
                          >
                            Catatan poin
                          </label>
                          <input
                            id={`notes_${item.id}`}
                            name={`notes_${item.id}`}
                            defaultValue={item.notes ?? ""}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {items.length > 0 ? (
              <UnitRoadworthinessSummary formId="p2h-edit-form" checklistItems={checklistForSummary} />
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                name="submit"
                value="0"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Simpan sebagai draf
              </button>
              <button
                type="submit"
                name="submit"
                value="1"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Perbarui &amp; kirim
              </button>
              <Link
                href={`/inspections/${inspection.id}`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </Link>
            </div>
          </form>
        </>
      ) : null}
    </>
  );
}

async function loadInspection(id: string) {
  return prisma.inspection.findUnique({
    where: { id },
    include: {
      lines: {
        include: { item: true },
      },
    },
  });
}
