"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  initialQ: string;
};

export function UsersToolbar({ initialQ }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQ);
  const [isPending, startTransition] = useTransition();
  const paramsRef = useRef(searchParams);

  paramsRef.current = searchParams;

  useEffect(() => {
    setValue(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = value.trim();
      const current = new URLSearchParams(paramsRef.current.toString());
      const currentQ = (current.get("q") ?? "").trim();

      const next = new URLSearchParams(paramsRef.current.toString());
      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }

      if (trimmed !== currentQ) {
        next.delete("page");
      }

      const nextQs = next.toString();
      if (nextQs === paramsRef.current.toString()) {
        return;
      }

      startTransition(() => {
        router.replace(nextQs ? `/settings/users?${nextQs}` : "/settings/users");
      });
    }, 320);

    return () => window.clearTimeout(handle);
  }, [value, router]);

  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <label htmlFor="users-search" className="sr-only">
          Cari user
        </label>
        <input
          id="users-search"
          type="search"
          autoComplete="off"
          placeholder="Cari username, NIK, nama lengkap, posisi…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {isPending ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-pulse rounded-full border-2 border-slate-200 border-t-blue-600"
            aria-hidden
          />
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        Pencarian live, otomatis memperbarui daftar users dan mengulang ke halaman pertama.
      </p>
    </div>
  );
}

