"use client";

import { useCallback, useEffect, useState } from "react";
import type { CheckResult, InspectionRoadworthiness } from "@prisma/client";
import {
  NON_COMPLIANT_LABEL,
  ROADWORTHINESS_COPY,
  computeRoadworthinessFromResults,
  roadworthinessCardClass,
} from "@/lib/inspection-roadworthiness";

export type ChecklistRowRef = {
  id: string;
  label: string;
  category: string;
};

type Props = {
  formId: string;
  checklistItems: ChecklistRowRef[];
};

const RESULTS = new Set<string>(["OK", "NOT_OK", "NA"]);

function collectResults(form: HTMLFormElement, checklistItems: ChecklistRowRef[]): CheckResult[] | null {
  const out: CheckResult[] = [];
  for (const row of checklistItems) {
    const el = form.querySelector(`input[name="result_${row.id}"]:checked`) as HTMLInputElement | null;
    if (!el?.value || !RESULTS.has(el.value)) return null;
    out.push(el.value as CheckResult);
  }
  return out;
}

type CompleteState = {
  readiness: InspectionRoadworthiness;
  nonCompliant: { id: string; category: string; label: string }[];
};

export function UnitRoadworthinessSummary({ formId, checklistItems }: Props) {
  const [state, setState] = useState<CompleteState | "incomplete">("incomplete");

  const refresh = useCallback(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      setState("incomplete");
      return;
    }
    const results = collectResults(form, checklistItems);
    if (!results || results.length !== checklistItems.length) {
      setState("incomplete");
      return;
    }
    const nonCompliant = checklistItems
      .filter((_, i) => results[i] === "NOT_OK")
      .map((row) => ({ id: row.id, category: row.category, label: row.label }));
    setState({
      readiness: computeRoadworthinessFromResults(results),
      nonCompliant,
    });
  }, [formId, checklistItems]);

  useEffect(() => {
    refresh();
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    form.addEventListener("change", refresh);
    form.addEventListener("input", refresh);
    return () => {
      form.removeEventListener("change", refresh);
      form.removeEventListener("input", refresh);
    };
  }, [formId, refresh]);

  if (checklistItems.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-live="polite"
    >
      <h2 className="text-sm font-semibold text-slate-900">Status kelayakan unit</h2>
      <p className="mt-1 text-xs text-slate-500">
        Dihitung otomatis setelah semua poin checklist memiliki pilihan (OK / {NON_COMPLIANT_LABEL} / Tidak
        berlaku).
      </p>
      {state === "incomplete" ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Lengkapi semua poin checklist untuk menampilkan penilaian.
        </p>
      ) : (
        <div className={`mt-4 rounded-lg border px-4 py-3 ${roadworthinessCardClass(state.readiness)}`}>
          <p className="text-sm font-bold">{ROADWORTHINESS_COPY[state.readiness].title}</p>
          <p className="mt-1 text-sm opacity-90">{ROADWORTHINESS_COPY[state.readiness].subtitle}</p>
          {state.nonCompliant.length > 0 ? (
            <div className="mt-3 border-t border-current/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Poin dengan temuan ({NON_COMPLIANT_LABEL})
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm">
                {state.nonCompliant.map((row) => (
                  <li key={row.id}>
                    <span className="font-medium">{row.category}</span>
                    <span className="opacity-70"> — </span>
                    <span>{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
