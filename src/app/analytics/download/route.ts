import { getSessionUser } from "@/lib/auth-session";
import { getAnalyticsData } from "@/lib/analytics";

const MONTHS_BACK = 6;

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return new Response("Tidak diizinkan.", { status: 401 });
  }

  let data;
  try {
    data = await getAnalyticsData(MONTHS_BACK);
  } catch {
    return new Response("Gagal memuat data analitik.", { status: 500 });
  }

  const lines: string[] = [];
  lines.push(["Bulan", "Total", "Layak Jalan", "Perlu Perhatian", "Tidak Aman", "% Lulus"].join(","));
  for (const m of data.monthly) {
    const passPct = m.total > 0 ? (m.layak / m.total) * 100 : 0;
    lines.push(
      [
        csvEscape(m.monthLabel),
        m.total,
        m.layak,
        m.perluPerhatian,
        m.tidakAman,
        passPct.toFixed(1),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("Keseluruhan");
  lines.push(["", data.totals.total, data.totals.layak, data.totals.perluPerhatian, data.totals.tidakAman].join(","));

  const filenameDate = new Date().toISOString().slice(0, 10);
  const csv = "\uFEFF" + lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analitik-p2h-${filenameDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
