"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type Props = {
  initialQ: string;
  initialFrom?: string;
  initialTo?: string;
};

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14" />
    </svg>
  );
}

export function RepairsToolbar({ initialQ, initialFrom = "", initialTo = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [isPending, startTransition] = useTransition();
  const paramsRef = useRef(searchParams);

  paramsRef.current = searchParams;

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);
  useEffect(() => {
    setFrom(initialFrom);
  }, [initialFrom]);
  useEffect(() => {
    setTo(initialTo);
  }, [initialTo]);

  // Sinkronkan state ke URL (debounced) — pencarian + range tanggal.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmedQ = q.trim();
      const trimmedFrom = from.trim();
      const trimmedTo = to.trim();
      const current = new URLSearchParams(paramsRef.current.toString());
      const currentQ = (current.get("q") ?? "").trim();
      const currentFrom = (current.get("from") ?? "").trim();
      const currentTo = (current.get("to") ?? "").trim();

      const next = new URLSearchParams(paramsRef.current.toString());
      if (trimmedQ) next.set("q", trimmedQ);
      else next.delete("q");

      if (trimmedFrom) next.set("from", trimmedFrom);
      else next.delete("from");

      if (trimmedTo) next.set("to", trimmedTo);
      else next.delete("to");

      const filterChanged =
        trimmedQ !== currentQ || trimmedFrom !== currentFrom || trimmedTo !== currentTo;
      if (filterChanged) next.delete("page");

      const nextQs = next.toString();
      if (nextQs === paramsRef.current.toString()) return;

      startTransition(() => {
        router.replace(nextQs ? `/reports/repairs?${nextQs}` : "/reports/repairs");
      });
    }, 320);

    return () => window.clearTimeout(handle);
  }, [q, from, to, router]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    const s = params.toString();
    return s ? `/reports/repairs/export?${s}` : "/reports/repairs/export";
  }, [q, from, to]);

  const dateRangeInvalid = Boolean(
    from.trim() && to.trim() && from.trim() > to.trim(),
  );

  const clearAll = () => {
    setQ("");
    setFrom("");
    setTo("");
  };

  const hasFilter = Boolean(q.trim() || from.trim() || to.trim());

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="relative flex-1">
          <label htmlFor="repairs-search" className="block text-xs font-medium text-slate-500">
            Cari
          </label>
          <input
            id="repairs-search"
            type="search"
            autoComplete="off"
            placeholder="Nomor polisi, Unit No, pemeriksa, kategori…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {isPending ? (
            <span
              className="pointer-events-none absolute right-3 top-9 h-4 w-4 animate-pulse rounded-full border-2 border-slate-200 border-t-blue-600"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div>
            <label htmlFor="repairs-from" className="block text-xs font-medium text-slate-500">
              Dari tanggal
            </label>
            <input
              id="repairs-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="repairs-to" className="block text-xs font-medium text-slate-500">
              Sampai tanggal
            </label>
            <input
              id="repairs-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {hasFilter ? (
            <button
              type="button"
              onClick={clearAll}
              className="h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          ) : null}
          <a
            href={exportHref}
            className={[
              "inline-flex h-[38px] items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-sm transition",
              dateRangeInvalid
                ? "pointer-events-none cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            ].join(" ")}
            aria-disabled={dateRangeInvalid}
            title={
              dateRangeInvalid
                ? "Rentang tanggal tidak valid (Dari tanggal melebihi Sampai tanggal)."
                : "Unduh laporan Excel sesuai filter saat ini"
            }
          >
            <DownloadIcon />
            Unduh Excel
          </a>
        </div>
      </div>
      {dateRangeInvalid ? (
        <p className="text-xs text-rose-700">
          Rentang tanggal tidak valid: <strong>Dari tanggal</strong> tidak boleh setelah{" "}
          <strong>Sampai tanggal</strong>.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Filter live, otomatis memperbarui tabel. Tombol unduh menghasilkan file{" "}
          <code className="rounded bg-slate-100 px-1">.xlsx</code> sesuai filter aktif.
        </p>
      )}
    </div>
  );
}
