import Link from "next/link";
import { redirect } from "next/navigation";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { getDbErrorMessage } from "@/lib/db-error";
import { prisma } from "@/lib/db";
import { canAccessSetting } from "@/lib/settings-access";
import { INSPECTION_PERMISSION_KEYS } from "@/lib/inspection-permissions";
import { SETTINGS_PERMISSION_KEYS } from "@/lib/settings-permissions";
import { getUsersListSuccessFlash } from "@/lib/users-form-flash";
import { VEHICLE_PERMISSION_KEYS } from "@/lib/vehicle-permissions";
import { UserRoleModal } from "./UserRoleModal";
import { UsersForm } from "./UsersForm";
import { UsersToolbar } from "./UsersToolbar";
import { UsersPagination } from "./UsersPagination";

const USERS_PAGE_SIZE = 5;

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

function EditIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

export default async function SettingsUsersPage(props: Props) {
  if (!(await canAccessSetting("manage.users"))) {
    redirect("/settings");
  }

  const { q: qRaw = "", page: pageRaw } = await props.searchParams;
  const q = typeof qRaw === "string" ? qRaw : "";
  const pageRequested = Number.isFinite(Number(pageRaw)) ? Math.max(1, Number(pageRaw)) : 1;

  const successMessage = (await getUsersListSuccessFlash())?.trim() || null;
  let vehiclePermissions: { id: string; key: string; label: string }[] = [];
  let inspectionPermissions: { id: string; key: string; label: string }[] = [];
  let settingsPermissions: { id: string; key: string; label: string }[] = [];
  let users: {
    id: string;
    username: string;
    nik: string;
    fullname: string;
    position: string;
    roleId: string | null;
    permissions: { permissionId: string }[];
    role: {
      permissions: { permission: { id: string; key: string } }[];
    } | null;
  }[] = [];
  let roles: {
    id: string;
    name: string;
    slug: string;
    permissions: { key: string; label: string }[];
  }[] = [];
  let total = 0;
  let page = pageRequested;
  let dbError: string | null = null;

  try {
    const permissionRows = await prisma.permission.findMany({
      where: {
        key: { in: [...VEHICLE_PERMISSION_KEYS, ...INSPECTION_PERMISSION_KEYS, ...SETTINGS_PERMISSION_KEYS] },
      },
    });
    const byKey = Object.fromEntries(permissionRows.map((r) => [r.key, r])) as Record<
      string,
      { id: string; key: string; label: string }
    >;
    vehiclePermissions = VEHICLE_PERMISSION_KEYS.map((k) => byKey[k]).filter(Boolean);
    inspectionPermissions = INSPECTION_PERMISSION_KEYS.map((k) => byKey[k]).filter(Boolean);
    settingsPermissions = SETTINGS_PERMISSION_KEYS.map((k) => byKey[k]).filter(Boolean);

    const where =
      q.trim() === ""
        ? {}
        : {
            OR: [
              { username: { contains: q.trim(), mode: "insensitive" } },
              { fullname: { contains: q.trim(), mode: "insensitive" } },
              { nik: { contains: q.trim(), mode: "insensitive" } },
              { position: { contains: q.trim(), mode: "insensitive" } },
            ],
          };

    const [userRows, roleRows, count] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ fullname: "asc" }, { username: "asc" }],
        select: {
          id: true,
          username: true,
          nik: true,
          fullname: true,
          position: true,
          roleId: true,
          permissions: { select: { permissionId: true } },
          role: {
            select: {
              permissions: {
                select: { permission: { select: { id: true, key: true } } },
              },
            },
          },
        },
        skip: (pageRequested - 1) * USERS_PAGE_SIZE,
        take: USERS_PAGE_SIZE,
      }),
      prisma.role.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          permissions: {
            select: {
              permission: { select: { key: true, label: true } },
            },
          },
        },
      }).then((rows) =>
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          permissions: r.permissions.map((rp) => ({
            key: rp.permission.key,
            label: rp.permission.label,
          })),
        })),
      ),
      prisma.user.count({ where }),
    ]);
    users = userRows;
    roles = roleRows;
    total = count;
    const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
    page = Math.min(Math.max(1, pageRequested), totalPages);
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat data users.";
  }

  const userModalPermissions = [...vehiclePermissions, ...inspectionPermissions, ...settingsPermissions];
  const modalPermissionIdSet = new Set(userModalPermissions.map((p) => p.id));
  function initialModalPermissionIds(u: (typeof users)[number]): string[] {
    const direct = u.permissions.map((x) => x.permissionId).filter((id) => modalPermissionIdSet.has(id));
    if (direct.length > 0) return direct;
    const fromRole =
      u.role?.permissions
        .map((rp) => rp.permission)
        .filter((perm) => modalPermissionIdSet.has(perm.id))
        .map((perm) => perm.id) ?? [];
    return fromRole;
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Input dan daftar pengguna. Role + izin (kendaraan, P2H, dan pengaturan) per user diatur lewat modal (checkbox). Template role global ada di Roles & permission."
        action={
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kembali
          </Link>
        }
      />

      {successMessage ? (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {successMessage}
        </div>
      ) : null}

      {dbError ? <DbUnavailable message={dbError} /> : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Input User</h2>
          <UsersForm initialFormError={dbError ? "Database belum siap untuk simpan user." : null} />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Daftar User</h2>
          </div>
          <div className="px-4 pt-3">
            <UsersToolbar initialQ={q} />
          </div>
          {users.length === 0 ? (
            <p className="px-4 pb-6 text-center text-sm text-slate-600">
              {q.trim()
                ? `Tidak ada user yang cocok dengan "${q.trim()}". Ubah kata kunci pencarian.`
                : "Belum ada user."}
            </p>
          ) : (
            <>
              <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">NIK</th>
                  <th className="px-4 py-3">Nama lengkap</th>
                  <th className="px-4 py-3">Posisi</th>
                  <th className="min-w-[12rem] px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                      {(page - 1) * USERS_PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                    <td className="px-4 py-3 text-slate-600">{u.nik}</td>
                    <td className="px-4 py-3 text-slate-600">{u.fullname}</td>
                    <td className="px-4 py-3 text-slate-600">{u.position}</td>
                    <td className="px-4 py-3 align-top">
                      {roles.length === 0 ? (
                        <span className="text-xs text-slate-500">
                          Tidak ada role. Jalankan seed / migrasi.
                        </span>
                      ) : (
                        <UserRoleModal
                          userId={u.id}
                          displayName={u.fullname}
                          roles={roles}
                          currentRoleId={u.roleId}
                          vehiclePermissions={vehiclePermissions}
                          inspectionPermissions={inspectionPermissions}
                          settingsPermissions={settingsPermissions}
                          initialPermissionIds={initialModalPermissionIds(u)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/settings/users/${u.id}/edit`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        title={`Edit ${u.username}`}
                        aria-label={`Edit user ${u.username}`}
                      >
                        <EditIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
              <UsersPagination page={page} pageSize={USERS_PAGE_SIZE} total={total} q={q} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
