type RepairRow = {
  id: string;
  reporterName: string;
  note: string | null;
  createdAt: Date;
};

type Props = {
  repairs: RepairRow[];
  className?: string;
};

export function RepairHistoryList({ repairs, className = "" }: Props) {
  if (repairs.length === 0) return null;

  const sorted = [...repairs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Riwayat perbaikan</p>
      <ul className="mt-1.5 space-y-2">
        {sorted.map((r) => (
          <li key={r.id} className="text-xs text-slate-700">
            <time dateTime={r.createdAt.toISOString()} className="font-medium text-slate-800">
              {formatRepairTime(r.createdAt)}
            </time>
            <span className="text-slate-500"> · {r.reporterName}</span>
            {r.note ? <p className="mt-0.5 text-slate-600">{r.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRepairTime(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
