import { redirect } from "next/navigation";
import { canAccessSetting } from "@/lib/settings-access";
import { SettingsSubNav } from "./SettingsSubNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  if (!(await canAccessSetting("read.settings"))) {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-600">Kelola pengguna, peran, dan izin akses.</p>
      </div>
      <SettingsSubNav />
      {children}
    </div>
  );
}
