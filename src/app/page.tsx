import Link from "next/link";
import type { InspectionRoadworthiness } from "@prisma/client";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { canAccessInspection } from "@/lib/inspection-access";
import { getDbErrorMessage } from "@/lib/db-error";
import { ROADWORTHINESS_COPY, roadworthinessPillClass } from "@/lib/inspection-roadworthiness";
import { prisma } from "@/lib/db";

const RECENT_PAGE_SIZE = 6;

type Props = {
  searchParams: Promise<{ recentPage?: string | string[] }>;
};

export default async function HomePage(props: Props) {
  const canCreateP2h = await canAccessInspection("create.p2h");
  const canDetailP2h = await canAccessInspection("detail.p2h");
  const sp = await props.searchParams;
  const rawPage = Array.isArray(sp.recentPage) ? sp.recentPage[0] : sp.recentPage;
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  let recentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let vehicleCount = 0;
  let inspectionCount = 0;
  let recent: {
    id: string;
    inspectedAt: Date;
    inspectorName: string;
    plate: string;
    unitNo: string | null;
    roadworthiness: InspectionRoadworthiness | null;
  }[] = [];
  const statusCounts = { layak: 0, perluPerhatian: 0, tidakAman: 0 };
  let dbError: string | null = null;

  try {
    inspectionCount = await prisma.inspection.count();

    const totalRecentPages = Math.max(1, Math.ceil(inspectionCount / RECENT_PAGE_SIZE));
    if (recentPage > totalRecentPages) recentPage = totalRecentPages;

    const [v, r, grouped] = await Promise.all([
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.inspection.findMany({
        take: RECENT_PAGE_SIZE,
        skip: (recentPage - 1) * RECENT_PAGE_SIZE,
        orderBy: { inspectedAt: "desc" },
        include: { vehicle: { select: { plateNumber: true, unitNo: true } } },
      }),
      prisma.inspection.groupBy({
        by: ["roadworthiness"],
        where: { roadworthiness: { not: null } },
        _count: { _all: true },
      }),
    ]);
    vehicleCount = v;
    recent = r.map((x) => ({
      id: x.id,
      inspectedAt: x.inspectedAt,
      inspectorName: x.inspectorName,
      plate: x.vehicle.plateNumber,
      unitNo: x.vehicle.unitNo,
      roadworthiness: x.roadworthiness,
    }));
    for (const g of grouped) {
      if (g.roadworthiness === "LAYAK_JALAN") statusCounts.layak = g._count._all;
      else if (g.roadworthiness === "RUSAK_RINGAN_PERLU_PERBAIKAN") statusCounts.perluPerhatian = g._count._all;
      else if (g.roadworthiness === "TIDAK_LAYAK_JALAN") statusCounts.tidakAman = g._count._all;
    }
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat ringkasan dari database.";
  }

  const recentTotalPages = Math.max(1, Math.ceil(inspectionCount / RECENT_PAGE_SIZE));

  const knownRoadworthinessTotal =
    statusCounts.layak + statusCounts.perluPerhatian + statusCounts.tidakAman;
  const passRatePct =
    knownRoadworthinessTotal > 0
      ? Math.round((statusCounts.layak / knownRoadworthinessTotal) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Beranda"
        description="Ringkasan unit aktif dan riwayat pemeriksaan harian (P2H)."
      />

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-sm font-medium text-slate-500">Kendaraan aktif</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{vehicleCount}</p>
            <Link
              href="/vehicles"
              className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Kelola kendaraan →
            </Link>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-sm font-medium text-slate-500">Total P2H tercatat</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{inspectionCount}</p>
            {canDetailP2h ? (
              <Link
                href="/inspections"
                className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Lihat riwayat →
              </Link>
            ) : null}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-sm font-medium text-slate-500">Aksi cepat</h2>
            <div className="mt-4 flex flex-col gap-2">
              {canCreateP2h ? (
                <Link
                  href="/inspections/new"
                  className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700"
                >
                  Buat P2H baru
                </Link>
              ) : null}
              <Link
                href="/vehicles/new"
                className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Tambah kendaraan
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {!dbError ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatusCard
            label="Layak Jalan"
            value={statusCounts.layak}
            tone="emerald"
            icon={<IconShieldCheck />}
            footer={
              knownRoadworthinessTotal > 0 ? (
                <span className="text-xs font-medium text-blue-700">{passRatePct}% tingkat lulus</span>
              ) : null
            }
          />
          <StatusCard
            label="Perlu Perhatian"
            value={statusCounts.perluPerhatian}
            tone="amber"
            icon={<IconWarningTriangle />}
          />
          <StatusCard
            label="Tidak Aman"
            value={statusCounts.tidakAman}
            tone="red"
            icon={<IconWarningTriangle />}
          />
        </section>
      ) : null}

      {!dbError && canDetailP2h && inspectionCount > 0 ? (
        <section id="p2h-terbaru" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">P2H terbaru</h2>
            <p className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-medium text-slate-700">
                {recent.length > 0 ? (recentPage - 1) * RECENT_PAGE_SIZE + 1 : 0}
                {recent.length > 0
                  ? `–${(recentPage - 1) * RECENT_PAGE_SIZE + recent.length}`
                  : ""}
              </span>{" "}
              dari <span className="font-medium text-slate-700">{inspectionCount}</span> P2H
            </p>
          </div>

          {recent.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
              {recent.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{row.plate}</p>
                      {row.roadworthiness ? (
                        <span
                          className={[
                            "inline-flex max-w-full shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                            roadworthinessPillClass(row.roadworthiness),
                          ].join(" ")}
                        >
                          {ROADWORTHINESS_COPY[row.roadworthiness].title}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Kelayakan —
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Unit No:</span>{" "}
                      {(row.unitNo ?? "").trim() || "—"} · {row.inspectorName} · {formatDate(row.inspectedAt)}
                    </p>
                  </div>
                  <Link href={`/inspections/${row.id}`} className="text-sm text-blue-700 hover:underline">
                    Detail
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
              Tidak ada data pada halaman ini.
            </p>
          )}

          <RecentPagination page={recentPage} totalPages={recentTotalPages} total={inspectionCount} />
        </section>
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

type StatusTone = "emerald" | "amber" | "red";

const STATUS_TONE: Record<StatusTone, string> = {
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
};

function StatusCard({
  label,
  value,
  tone,
  icon,
  footer,
}: {
  label: string;
  value: number;
  tone: StatusTone;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-slate-900">{value}</p>
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          STATUS_TONE[tone],
        ].join(" ")}
        aria-hidden
      >
        {icon}
      </span>
    </div>
  );
}

function IconShieldCheck() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9V5.25c2.25 0 4.5-.75 9-1.5 4.5.75 6.75 1.5 9 1.5V12Z"
      />
    </svg>
  );
}

function IconWarningTriangle() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

function RecentPagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => (p > 1 ? `/?recentPage=${p}#p2h-terbaru` : `/`);
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row"
      aria-label="Pagination P2H terbaru"
    >
      <p className="text-slate-600">
        Halaman <span className="font-medium text-slate-900">{page}</span> dari{" "}
        <span className="font-medium text-slate-900">{totalPages}</span>
        <span className="text-slate-500"> · {total} P2H</span>
      </p>
      <div className="flex gap-2">
        {prev ? (
          <Link
            href={href(prev)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Sebelumnya
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-400">
            Sebelumnya
          </span>
        )}
        {next ? (
          <Link
            href={href(next)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Berikutnya
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-slate-400">
            Berikutnya
          </span>
        )}
      </div>
    </nav>
  );
}

