import Link from "next/link";
import { Suspense } from "react";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getDbErrorMessage } from "@/lib/db-error";
import { prisma } from "@/lib/db";
import { canAccessVehicle } from "@/lib/vehicle-access";
import { getVehicleListSuccessFlash } from "@/lib/vehicle-form-flash";
import {
  parseVehiclesPage,
  vehicleListWhere,
  VEHICLES_PAGE_SIZE,
} from "@/lib/vehicles-query";
import { VehiclesPagination } from "./VehiclesPagination";
import { VehiclesToolbar } from "./VehiclesToolbar";

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function VehiclesPage(props: Props) {
  const [canRead, canCreate, canUpdate] = await Promise.all([
    canAccessVehicle("read.vehicles"),
    canAccessVehicle("create.vehicles"),
    canAccessVehicle("ubah.vehicles"),
  ]);
  if (!canRead) {
    return (
      <DbUnavailable message="Anda tidak punya izin membaca data kendaraan (`read.vehicles`)." />
    );
  }

  const [{ q: qRaw = "", page: pageRaw }, successMessage] = await Promise.all([
    props.searchParams,
    getVehicleListSuccessFlash(),
  ]);
  const q = typeof qRaw === "string" ? qRaw : "";
  const pageRequested = parseVehiclesPage(typeof pageRaw === "string" ? pageRaw : undefined);
  const where = vehicleListWhere(q);

  const successTrimmed = successMessage?.trim() || null;

  let vehicles: {
    id: string;
    plateNumber: string;
    unitNo: string | null;
    brand: string | null;
    model: string | null;
    vehicleType: string | null;
    isActive: boolean;
  }[] = [];
  let total = 0;
  let page = pageRequested;
  let dbError: string | null = null;

  try {
    total = await prisma.vehicle.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / VEHICLES_PAGE_SIZE));
    page = Math.min(Math.max(1, pageRequested), totalPages);
    const skip = (page - 1) * VEHICLES_PAGE_SIZE;

    vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { plateNumber: "asc" },
      skip,
      take: VEHICLES_PAGE_SIZE,
    });
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat daftar kendaraan.";
    vehicles = [];
    total = 0;
    page = 1;
  }

  const rowOffset = (page - 1) * VEHICLES_PAGE_SIZE;

  return (
    <>
      <PageHeader
        title="Kendaraan"
        description="Master unit yang akan diperiksa dalam P2H harian."
        action={canCreate ? (
          <Link
            href="/vehicles/new"
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            Tambah kendaraan
          </Link>
        ) : null}
      />

      {successTrimmed ? (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {successTrimmed}
        </div>
      ) : null}

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError ? (
        <Suspense
          fallback={
            <div className="mb-4 h-10 max-w-md animate-pulse rounded-lg bg-slate-200" aria-hidden />
          }
        >
          <VehiclesToolbar initialQ={q} />
        </Suspense>
      ) : null}

      {!dbError && total === 0 && !q.trim() ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Belum ada kendaraan.
          {canCreate ? (
            <>
              {" "}
              <Link href="/vehicles/new" className="font-medium text-blue-700 hover:underline">
                Tambah unit pertama
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : null}

      {!dbError && total === 0 && q.trim() ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Tidak ada kendaraan yang cocok dengan &quot;{q.trim()}&quot;. Ubah kata kunci pencarian.
        </p>
      ) : null}

      {!dbError && vehicles.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3">Polisi</th>
                  <th className="px-4 py-3">Unit No</th>
                  <th className="px-4 py-3">Merek / model</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  {canUpdate ? <th className="px-4 py-3 text-right">Aksi</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                      {rowOffset + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{v.plateNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{v.unitNo ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {[v.brand, v.model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.vehicleType ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          v.isActive
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        }
                      >
                        {v.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    {canUpdate ? (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/vehicles/${v.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`Ubah data kendaraan ${v.plateNumber}${v.unitNo ? ` — ${v.unitNo}` : ""}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-4 w-4"
                          >
                            <path
                              fill="currentColor"
                              d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm14.71-9.46a1.003 1.003 0 0 0 0-1.42L17.63 5.29a1.003 1.003 0 0 0-1.42 0L14.34 7.16l2.75 2.75 1.62-1.62z"
                            />
                          </svg>
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <VehiclesPagination
            page={page}
            pageSize={VEHICLES_PAGE_SIZE}
            total={total}
            q={q}
          />
        </>
      ) : null}
    </>
  );
}
