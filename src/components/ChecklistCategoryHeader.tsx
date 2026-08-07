import { HEAVY_INSPECTION_CATEGORY_HEADER } from "@/lib/heavy-equipment-inspection";
import { CRANE_INSPECTION_CATEGORY_HEADER } from "@/lib/crane-inspection";
import { LIGHT_VEHICLE_INSPECTION_CATEGORY_HEADER } from "@/lib/light-vehicle-inspection";

type Props = { category: string };

/** Ikon kendaraan (Heroicons outline, truck). */
function IconCar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 014.513 7.5h12.974c.576 0 1.059.435 1.119 1.007l1.114 12a1.125 1.125 0 01-1.12 1.243H18.75m-9 0v-4.5m0 4.5h12.75"
      />
    </svg>
  );
}

function IconBulb({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.176 7.176 0 10-6.616 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  );
}

function IconWrench({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655-5.653a2.548 2.548 0 010-3.586L9.88 4.1c.94-.94 2.48-.94 3.42 0l2.22 2.22M9.88 4.1L15.53 9.75"
      />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

const ICON_CLASS = "h-6 w-6 shrink-0 text-blue-600";

function iconForCategory(category: string) {
  switch (category) {
    case "UNDERCARRIAGE":
    case "ATTACHMENT":
    case "CYLINDER":
    case "VESSEL":
      return <IconWrench className={ICON_CLASS} />;
    case "LIGHT VEHICLE":
    case "CRANE":
      return <IconCar className={ICON_CLASS} />;
    case "Eksterior":
      return <IconCar className={ICON_CLASS} />;
    case "Lampu & Sinyal":
      return <IconBulb className={ICON_CLASS} />;
    case "Mekanikal":
      return <IconWrench className={ICON_CLASS} />;
    case "Keselamatan & Interior":
      return <IconShield className={ICON_CLASS} />;
    default:
      return <IconCar className={ICON_CLASS} />;
  }
}

/** Urutan kategori seperti referensi UI (mobile). */
export const CHECKLIST_CATEGORY_ORDER = [
  "Eksterior",
  "Lampu & Sinyal",
  "Mekanikal",
  "Keselamatan & Interior",
] as const;

export function sortChecklistCategoryEntries<T>(
  entries: [string, T][],
  orderList: readonly string[] = CHECKLIST_CATEGORY_ORDER,
): [string, T][] {
  const rank = new Map<string, number>(orderList.map((c, i) => [c, i]));
  return [...entries].sort((a, b) => {
    const ra = rank.get(a[0]);
    const rb = rank.get(b[0]);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a[0].localeCompare(b[0]);
  });
}

export function ChecklistCategoryHeader({ category }: Props) {
  const heavy = HEAVY_INSPECTION_CATEGORY_HEADER[category];
  const light = LIGHT_VEHICLE_INSPECTION_CATEGORY_HEADER[category];
  const crane = CRANE_INSPECTION_CATEGORY_HEADER[category];
  const special = heavy ?? light ?? crane;
  return (
    <div className="flex items-start gap-3">
      {iconForCategory(category)}
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-900">
          {special ? (
            <>
              <span className="font-semibold text-slate-600">{special.index}.</span> {special.title}
            </>
          ) : (
            category
          )}
        </h2>
        {special ? <p className="mt-1 text-sm font-normal text-slate-600">{special.subtitle}</p> : null}
      </div>
    </div>
  );
}
