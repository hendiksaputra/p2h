"use client";

import { useActionState, useState } from "react";
import { updateRolePermissionsAction, type RbacFormState } from "@/app/actions/rbac";
import { INSPECTION_PERMISSION_KEYS } from "@/lib/inspection-permissions";
import { SETTINGS_PERMISSION_KEYS } from "@/lib/settings-permissions";
import { VEHICLE_PERMISSION_KEYS } from "@/lib/vehicle-permissions";

type PermissionRow = { id: string; key: string; label: string };

type Props = {
  roleId: string;
  roleName: string;
  allPermissions: PermissionRow[];
  selectedIds: string[];
};

const initial: RbacFormState = {};

export function RolePermissionsForm({ roleId, roleName, allPermissions, selectedIds }: Props) {
  const [state, formAction, isPending] = useActionState(updateRolePermissionsAction, initial);
  const groups = groupPermissions(allPermissions);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(selectedIds));

  const togglePermission = (permissionId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  return (
    <form action={formAction} className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-3">
      <input type="hidden" name="roleId" value={roleId} />
      <p className="text-sm font-medium text-slate-900">{roleName}</p>
      <div className="space-y-3">
        {groups.map((group) => (
          <fieldset key={group.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span>{group.title}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {group.permissions.filter((p) => checkedIds.has(p.id)).length}/{group.permissions.length}
                </span>
              </span>
            </legend>
            <ul className="space-y-2">
              {group.permissions.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`${roleId}-${p.id}`}
                    name="permissionId"
                    value={p.id}
                    checked={checkedIds.has(p.id)}
                    onChange={() => togglePermission(p.id)}
                    disabled={isPending}
                    className="mt-1 rounded border-slate-300"
                  />
                  <label htmlFor={`${roleId}-${p.id}`} className="text-sm text-slate-700 cursor-pointer">
                    <code className="text-xs font-semibold text-slate-900">{p.key}</code>
                    <span className="block text-slate-600">{p.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Menyimpan…" : "Simpan izin role"}
      </button>
      {state.error ? (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-xs text-emerald-700" role="status">
          Izin role diperbarui.
        </p>
      ) : null}
    </form>
  );
}

function groupPermissions(allPermissions: PermissionRow[]) {
  const known = new Set<string>([
    ...VEHICLE_PERMISSION_KEYS,
    ...INSPECTION_PERMISSION_KEYS,
    ...SETTINGS_PERMISSION_KEYS,
  ]);
  const byKey = new Map(allPermissions.map((p) => [p.key, p]));

  const kendaraan = VEHICLE_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is PermissionRow => Boolean(p),
  );
  const p2h = INSPECTION_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is PermissionRow => Boolean(p),
  );
  const pengaturan = SETTINGS_PERMISSION_KEYS.map((k) => byKey.get(k)).filter(
    (p): p is PermissionRow => Boolean(p),
  );
  const lainnya = allPermissions.filter((p) => !known.has(p.key));

  return [
    { id: "kendaraan", title: "Kendaraan", permissions: kendaraan },
    { id: "p2h", title: "P2H", permissions: p2h },
    { id: "pengaturan", title: "Pengaturan", permissions: pengaturan },
    { id: "lainnya", title: "Lainnya", permissions: lainnya },
  ].filter((g) => g.permissions.length > 0);
}
