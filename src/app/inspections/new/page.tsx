import Link from "next/link";
import { redirect } from "next/navigation";
import { createInspection } from "@/app/actions/inspections";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/auth-session";
import { getDbErrorMessage } from "@/lib/db-error";
import { isHeavyEquipmentInspectionCategory } from "@/lib/heavy-equipment-inspection";
import { canAccessInspection } from "@/lib/inspection-access";
import { getLatestInspectionSnapshotByVehicleId } from "@/lib/inspections-query";
import { prisma } from "@/lib/db";
import { InspectionNewChecklistBody } from "./InspectionNewChecklistBody";
import { InspectionNewSubmitRow } from "./InspectionNewSubmitRow";
import { InspectionNewVehicleProvider } from "./InspectionNewVehicleContext";
import { UnitNoVehiclePicker } from "./UnitNoVehiclePicker";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewInspectionPage(props: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?next=/inspections/new");
  if (!(await canAccessInspection("create.p2h"))) redirect("/inspections");

  const { error: errorParam } = await props.searchParams;
  const formError = errorParam?.trim() || null;
  let vehicles: { id: string; plateNumber: string; unitNo: string | null }[] = [];
  let items: { id: string; category: string; label: string; description: string | null; sortOrder: number }[] =
    [];
  let inspectedTodayIds: string[] = [];
  /** vehicleId → id P2H terakhir yang statusnya tidak layak jalan */
  const notRoadworthyLastInspectionIdByVehicle: Record<string, string> = {};
  let dbError: string | null = null;

  const defaultInspectedDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const todayStart = new Date(`${defaultInspectedDate}T00:00:00+08:00`);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  try {
    const [v, c, todayInspections] = await Promise.all([
      prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { plateNumber: "asc" },
        select: { id: true, plateNumber: true, unitNo: true },
      }),
      prisma.checklistItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.inspection.findMany({
        where: { inspectedAt: { gte: todayStart, lt: todayEnd } },
        select: { vehicleId: true },
        distinct: ["vehicleId"],
      }),
    ]);
    vehicles = v;
    items = c;
    inspectedTodayIds = todayInspections.map((i) => i.vehicleId);
    const latestByVehicle = await getLatestInspectionSnapshotByVehicleId(v.map((x) => x.id));
    for (const [vehicleId, snap] of latestByVehicle) {
      if (snap.roadworthiness === "TIDAK_LAYAK_JALAN") {
        notRoadworthyLastInspectionIdByVehicle[vehicleId] = snap.id;
      }
    }
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat data untuk formulir P2H.";
  }

  const roadItems = items.filter((i) => !isHeavyEquipmentInspectionCategory(i.category));
  const heavyItems = items.filter((i) => isHeavyEquipmentInspectionCategory(i.category));
  const hasAnyChecklist = roadItems.length > 0 || heavyItems.length > 0;

  return (
    <>
      <PageHeader
        title="Form P2H baru"
        description="Pilih unit, lalu isi checklist. Untuk nomor polisi ALAT BERAT, ditampilkan kategori standar (Eksterior, Lampu & Sinyal, dll.) dan kategori khusus alat berat."
        action={
          <Link href="/inspections" className="text-sm font-medium text-slate-600 hover:text-slate-900">
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

      {!dbError && vehicles.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Belum ada kendaraan aktif.{" "}
          <Link href="/vehicles/new" className="font-medium text-amber-950 underline">
            Tambah kendaraan
          </Link>{" "}
          terlebih dahulu.
        </div>
      ) : null}

      {!dbError && vehicles.length > 0 && !hasAnyChecklist ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Master checklist kosong. Jalankan{" "}
          <code className="rounded bg-amber-100 px-1">npm run db:seed</code> setelah migrasi.
        </div>
      ) : null}

      {!dbError && vehicles.length > 0 && hasAnyChecklist ? (
        <InspectionNewVehicleProvider
          inspectedTodayIds={inspectedTodayIds}
          notRoadworthyLastInspectionIdByVehicle={notRoadworthyLastInspectionIdByVehicle}
        >
          <form id="p2h-new-form" action={createInspection} className="space-y-8">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Informasi umum</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <UnitNoVehiclePicker
                vehicles={vehicles}
                inspectedTodayIds={inspectedTodayIds}
                notRoadworthyLastInspectionIdByVehicle={notRoadworthyLastInspectionIdByVehicle}
              />
              <div className="sm:col-span-2 sm:max-w-xs">
                <label htmlFor="inspectedDate" className="block text-sm font-medium text-slate-700">
                  Tanggal pemeriksaan <span className="text-red-600">*</span>
                </label>
                <input
                  id="inspectedDate"
                  name="inspectedDate"
                  type="date"
                  required
                  defaultValue={defaultInspectedDate}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="inspectorName" className="block text-sm font-medium text-slate-700">
                  Nama pemeriksa <span className="text-red-600">*</span>
                </label>
                <input
                  id="inspectorName"
                  name="inspectorName"
                  type="text"
                  readOnly
                  defaultValue={sessionUser.fullname}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm text-slate-700"
                />
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <InspectionNewChecklistBody
            formId="p2h-new-form"
            vehicles={vehicles}
            roadItems={roadItems}
            heavyItems={heavyItems}
          />

          <InspectionNewSubmitRow />
          </form>
        </InspectionNewVehicleProvider>
      ) : null}
    </>
  );
}
