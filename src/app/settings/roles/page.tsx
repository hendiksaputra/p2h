import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getDbErrorMessage } from "@/lib/db-error";
import { prisma } from "@/lib/db";
import { INSPECTION_PERMISSION_KEYS } from "@/lib/inspection-permissions";
import { canAccessSetting } from "@/lib/settings-access";
import { SETTINGS_PERMISSION_KEYS } from "@/lib/settings-permissions";
import { VEHICLE_PERMISSION_KEYS } from "@/lib/vehicle-permissions";
import { RolePermissionsForm } from "./RolePermissionsForm";

export default async function SettingsRolesPage() {
  if (!(await canAccessSetting("manage.roles"))) {
    redirect("/settings");
  }

  let permissions: { id: string; key: string; label: string }[] = [];
  let roles: {
    id: string;
    name: string;
    slug: string;
    permissions: { permissionId: string }[];
  }[] = [];
  let dbError: string | null = null;

  try {
    const [permRows, roleRows] = await Promise.all([
      prisma.permission.findMany({ orderBy: { key: "asc" } }),
      prisma.role.findMany({
        orderBy: { name: "asc" },
        include: {
          permissions: { select: { permissionId: true } },
        },
      }),
    ]);
    permissions = permRows;
    roles = roleRows;
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat role dan permission.";
  }

  return (
    <>
      <PageHeader
        title="Roles & permission"
        description="Atur izin per role. User mendapat permission lewat role yang dipilih di halaman Users."
        action={
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kembali
          </Link>
        }
      />

      {dbError ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {dbError}{" "}
          <span className="text-amber-800">
            Pastikan migrasi terbaru sudah dijalankan dan seed RBAC (`npm run db:seed`).
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Daftar permission</h2>
          <p className="mt-1 text-sm text-slate-600">
            Permission dikelompokkan per modul agar lebih mudah dikelola.
          </p>
          {permissions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Belum ada permission di database.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {groupPermissions(permissions).map((group) => (
                <section key={group.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h3>
                  <ul className="mt-2 space-y-2">
                    {group.permissions.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
                      >
                        <code className="text-xs font-semibold text-slate-900">{p.key}</code>
                        <span className="mt-0.5 block text-slate-600">{p.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Role &amp; izin</h2>
          <p className="mt-1 text-sm text-slate-600">
            Centang permission untuk masing-masing role, lalu simpan. User tidak dihubungkan langsung
            ke permission—gunakan halaman Users untuk memilih role.
          </p>
          {roles.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada role. Jalankan <code className="text-xs">npm run db:seed</code>.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {roles.map((r) => (
                <RolePermissionsForm
                  key={r.id}
                  roleId={r.id}
                  roleName={`${r.name} (${r.slug})`}
                  allPermissions={permissions}
                  selectedIds={r.permissions.map((x) => x.permissionId)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function groupPermissions(permissions: { id: string; key: string; label: string }[]) {
  const known = new Set<string>([
    ...VEHICLE_PERMISSION_KEYS,
    ...INSPECTION_PERMISSION_KEYS,
    ...SETTINGS_PERMISSION_KEYS,
  ]);
  const byKey = new Map(permissions.map((p) => [p.key, p]));

  const kendaraan = VEHICLE_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is { id: string; key: string; label: string } => Boolean(p),
  );
  const p2h = INSPECTION_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is { id: string; key: string; label: string } => Boolean(p),
  );
  const pengaturan = SETTINGS_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is { id: string; key: string; label: string } => Boolean(p),
  );
  const lainnya = permissions.filter((p) => !known.has(p.key));

  return [
    { id: "kendaraan", title: "Kendaraan", permissions: kendaraan },
    { id: "p2h", title: "P2H", permissions: p2h },
    { id: "pengaturan", title: "Pengaturan", permissions: pengaturan },
    { id: "lainnya", title: "Lainnya", permissions: lainnya },
  ].filter((g) => g.permissions.length > 0);
}
