"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth-login";
import type { AppSessionUser } from "@/lib/auth-session";

type Props = {
  children: React.ReactNode;
  user: AppSessionUser | null;
  canReadSettings: boolean;
  canAccessP2h: boolean;
};

export function AppShellClient({ children, user, canReadSettings, canAccessP2h }: Props) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const nav = [
    { href: "/", label: "Beranda" },
    { href: "/vehicles", label: "Kendaraan" },
    ...(canAccessP2h ? [{ href: "/inspections", label: "P2H" }] : []),
    { href: "/analytics", label: "Analitik" },
    { href: "/reports/repairs", label: "Laporan" },
    ...(canReadSettings ? [{ href: "/settings", label: "Pengaturan" }] : []),
  ];
  const year = new Date().getFullYear();

  if (isLogin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 text-slate-900">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
              P2H Kendaraan
            </Link>
            <p className="text-xs text-slate-500">
              Pemeriksaan &amp; pemeliharaan harian unit
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <nav className="flex flex-wrap gap-2" aria-label="Menu utama">
              {nav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{user.fullname}</span>
                  <span className="ml-1.5 text-slate-500">({user.username})</span>
                </span>
                <form action={logoutAction} className="inline">
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Keluar
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs text-slate-500">
            © {year} P2H Kendaraan — untuk penggunaan operasional internal.
          </p>
        </div>
      </footer>
    </div>
  );
}
