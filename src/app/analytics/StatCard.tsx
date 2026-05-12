type Tone = "blue" | "emerald" | "amber" | "red";

type Props = {
  label: string;
  value: number;
  tone: Tone;
  icon: React.ReactNode;
};

const TONE_CLASS: Record<Tone, { card: string; iconWrap: string; value: string }> = {
  blue: {
    card: "bg-white",
    iconWrap: "bg-blue-50 text-blue-600",
    value: "text-slate-900",
  },
  emerald: {
    card: "bg-white",
    iconWrap: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
  },
  amber: {
    card: "bg-white",
    iconWrap: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
  },
  red: {
    card: "bg-white",
    iconWrap: "bg-red-50 text-red-600",
    value: "text-red-700",
  },
};

export function StatCard({ label, value, tone, icon }: Props) {
  const t = TONE_CLASS[tone];
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-slate-200 ${t.card} px-4 py-4 shadow-sm`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.iconWrap}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${t.value}`}>{value}</p>
      </div>
    </div>
  );
}

export function IconTrendUp() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

export function IconCheckCircle() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function IconWarningTriangle() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

export function IconXCircle() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
