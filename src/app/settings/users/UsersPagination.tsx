import Link from "next/link";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
};

export function UsersPagination({ page, pageSize, total, q }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/settings/users?${s}` : "/settings/users";
  };

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row"
      aria-label="Pagination users"
    >
      <p className="text-slate-600">
        Halaman <span className="font-medium text-slate-900">{page}</span> dari{" "}
        <span className="font-medium text-slate-900">{totalPages}</span>
        <span className="text-slate-500"> · {total} user</span>
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

