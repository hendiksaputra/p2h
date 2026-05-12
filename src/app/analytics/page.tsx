import Link from "next/link";
import { redirect } from "next/navigation";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getSessionUser } from "@/lib/auth-session";
import { getDbErrorMessage } from "@/lib/db-error";
import { ANALYTICS_COLORS, getAnalyticsData, type AnalyticsData } from "@/lib/analytics";
import {
  IconCheckCircle,
  IconDownload,
  IconTrendUp,
  IconWarningTriangle,
  IconXCircle,
  StatCard,
} from "./StatCard";
import { BarChartMonthly } from "./BarChartMonthly";
import { LineChartPercent } from "./LineChartPercent";
import { DonutChart } from "./DonutChart";

const MONTHS_BACK = 6;

export default async function AnalyticsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/analytics");

  let data: AnalyticsData | null = null;
  let dbError: string | null = null;

  try {
    data = await getAnalyticsData(MONTHS_BACK);
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat data analitik.";
  }

  return (
    <>
      <PageHeader
        title="Analitik Inspeksi"
        description={`Tren dan statistik inspeksi kendaraan selama ${MONTHS_BACK} bulan terakhir`}
        action={
          <Link
            href="/analytics/download"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <IconDownload />
            Unduh Laporan
          </Link>
        }
      />

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError && data ? (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Inspeksi"
              value={data.totals.total}
              tone="blue"
              icon={<IconTrendUp />}
            />
            <StatCard
              label="Layak Jalan"
              value={data.totals.layak}
              tone="emerald"
              icon={<IconCheckCircle />}
            />
            <StatCard
              label="Perlu Perhatian"
              value={data.totals.perluPerhatian}
              tone="amber"
              icon={<IconWarningTriangle />}
            />
            <StatCard
              label="Tidak Aman"
              value={data.totals.tidakAman}
              tone="red"
              icon={<IconXCircle />}
            />
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Jumlah Inspeksi Bulanan</h2>
            <div className="mt-4">
              <BarChartMonthly monthly={data.monthly} />
            </div>
          </section>

          <section className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Tren Tingkat Lulus (%)</h2>
              <div className="mt-4">
                <LineChartPercent
                  labels={data.monthly.map((m) => m.monthLabel)}
                  values={data.monthly.map((m) =>
                    m.total > 0 ? (m.layak / m.total) * 100 : 0,
                  )}
                  color={ANALYTICS_COLORS.pass}
                  ariaLabel="Tren tingkat lulus per bulan"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">% Kendaraan Perlu Perbaikan</h2>
              <div className="mt-4">
                <LineChartPercent
                  labels={data.monthly.map((m) => m.monthLabel)}
                  values={data.monthly.map((m) =>
                    m.total > 0 ? ((m.perluPerhatian + m.tidakAman) / m.total) * 100 : 0,
                  )}
                  color={ANALYTICS_COLORS.repair}
                  ariaLabel="Persentase kendaraan perlu perbaikan per bulan"
                />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Distribusi Status Kendaraan (Keseluruhan)
            </h2>
            <p className="mt-1 text-xs text-slate-500">Total inspeksi pada rentang yang sama.</p>
            <div className="mt-4">
              <DonutChart
                segments={[
                  { label: "Layak Jalan", value: data.totals.layak, color: ANALYTICS_COLORS.layak },
                  {
                    label: "Perlu Perhatian",
                    value: data.totals.perluPerhatian,
                    color: ANALYTICS_COLORS.perluPerhatian,
                  },
                  { label: "Tidak Aman", value: data.totals.tidakAman, color: ANALYTICS_COLORS.tidakAman },
                ]}
              />
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
