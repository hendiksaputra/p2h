"use client";

import { useFormStatus } from "react-dom";
import { recordInspectionLineRepair } from "@/app/actions/inspection-repairs";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : "Selesai perbaikan → OK"}
    </button>
  );
}

type Props = {
  inspectionId: string;
  lineId: string;
};

export function LineRepairForm({ inspectionId, lineId }: Props) {
  return (
    <form action={recordInspectionLineRepair} className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <input type="hidden" name="lineId" value={lineId} />
      <div className="min-w-0 flex-1 sm:max-w-md">
        <label htmlFor={`repair-${lineId}`} className="sr-only">
          Keterangan perbaikan
        </label>
        <textarea
          id={`repair-${lineId}`}
          name="repairNote"
          rows={2}
          placeholder="Keterangan perbaikan (opsional)…"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
