"use client";

import { useActionState, useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRolePermissionsAction, type RbacFormState } from "@/app/actions/rbac";

export type RoleWithPermissions = {
  id: string;
  name: string;
  slug: string;
  permissions: { key: string; label: string }[];
};

export type VehiclePermissionOption = {
  id: string;
  key: string;
  label: string;
};

export type SettingsPermissionOption = {
  id: string;
  key: string;
  label: string;
};

export type InspectionPermissionOption = {
  id: string;
  key: string;
  label: string;
};

type Props = {
  userId: string;
  displayName: string;
  roles: RoleWithPermissions[];
  currentRoleId: string | null;
  vehiclePermissions: VehiclePermissionOption[];
  inspectionPermissions: InspectionPermissionOption[];
  settingsPermissions: SettingsPermissionOption[];
  /** Permission tercentang saat modal dibuka (langsung dari DB atau turunan role). */
  initialPermissionIds: string[];
};

const initial: RbacFormState = {};

function permissionIdsForRole(
  roleId: string,
  roles: RoleWithPermissions[],
  allPermissions: Array<{ id: string; key: string }>,
): Set<string> {
  if (roleId === "") return new Set();
  const r = roles.find((x) => x.id === roleId);
  if (!r) return new Set();
  const keys = new Set(r.permissions.map((p) => p.key));
  return new Set(allPermissions.filter((p) => keys.has(p.key)).map((p) => p.id));
}

function ModalForm({
  userId,
  displayName,
  roles,
  currentRoleId,
  vehiclePermissions,
  inspectionPermissions,
  settingsPermissions,
  initialPermissionIds,
  onClose,
  titleId,
}: Props & { onClose: () => void; titleId: string }) {
  const router = useRouter();
  const allPermissions = [...vehiclePermissions, ...inspectionPermissions, ...settingsPermissions];
  const [selectedRoleId, setSelectedRoleId] = useState<string>(currentRoleId ?? "");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(initialPermissionIds));
  const [state, formAction, isPending] = useActionState(updateUserRolePermissionsAction, initial);

  useEffect(() => {
    if (state.ok) {
      onClose();
      router.refresh();
    }
  }, [state.ok, onClose, router]);

  const onRoleChange = (newRoleId: string) => {
    setSelectedRoleId(newRoleId);
    setCheckedIds(permissionIdsForRole(newRoleId, roles, allPermissions));
  };

  const togglePermission = (permissionId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  return (
    <div
      className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[min(90vh,34rem)] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 id={titleId} className="text-base font-semibold text-slate-900">
        Role &amp; izin — {displayName}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Pilih role, lalu centang izin untuk user ini. Mengganti role mengisi ulang centang sesuai
        template role (Anda bisa ubah sebelum simpan).
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="userId" value={userId} />
        <div>
          <label htmlFor={`role-select-${userId}`} className="block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id={`role-select-${userId}`}
            name="roleId"
            value={selectedRoleId}
            onChange={(e) => onRoleChange(e.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="">— Tanpa role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="rounded-lg border border-slate-100 bg-slate-50/90 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Izin kendaraan
          </legend>
          <p className="mb-3 text-xs text-slate-600">
            <code className="text-slate-800">create.vehicles</code> (buat),{" "}
            <code className="text-slate-800">ubah.vehicles</code> (update),{" "}
            <code className="text-slate-800">read.vehicles</code> (baca).
          </p>
          <ul className="space-y-3">
            {vehiclePermissions.length === 0 ? (
              <li className="text-sm text-amber-800">
                Permission kendaraan belum ada di database. Jalankan migrasi +{" "}
                <code className="text-xs">npm run db:seed</code>.
              </li>
            ) : null}
            {vehiclePermissions.map((p) => {
              const isUpdate = p.key === "ubah.vehicles";
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      name="permissionId"
                      value={p.id}
                      checked={checkedIds.has(p.id)}
                      onChange={() => togglePermission(p.id)}
                      disabled={isPending}
                      className="mt-1 rounded border-slate-300"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        {p.label}
                        {isUpdate ? (
                          <span className="ml-1 font-normal text-slate-500">(update)</span>
                        ) : null}
                      </span>
                      <code className="mt-0.5 block text-xs text-slate-600">{p.key}</code>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-100 bg-slate-50/90 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Izin P2H
          </legend>
          <p className="mb-3 text-xs text-slate-600">
            <code className="text-slate-800">create.p2h</code> (buat),{" "}
            <code className="text-slate-800">detail.p2h</code> (detail),{" "}
            <code className="text-slate-800">edit.p2h</code> (edit),{" "}
            <code className="text-slate-800">delete.p2h</code> (hapus),{" "}
            <code className="text-slate-800">repair.p2h</code> (tindakan perbaikan).
          </p>
          <ul className="space-y-3">
            {inspectionPermissions.length === 0 ? (
              <li className="text-sm text-amber-800">
                Permission P2H belum ada di database. Jalankan{" "}
                <code className="text-xs">npm run db:seed</code>.
              </li>
            ) : null}
            {inspectionPermissions.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    name="permissionId"
                    value={p.id}
                    checked={checkedIds.has(p.id)}
                    onChange={() => togglePermission(p.id)}
                    disabled={isPending}
                    className="mt-1 rounded border-slate-300"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-slate-900">{p.label}</span>
                    <code className="mt-0.5 block text-xs text-slate-600">{p.key}</code>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-100 bg-slate-50/90 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Izin pengaturan
          </legend>
          <p className="mb-3 text-xs text-slate-600">
            <code className="text-slate-800">read.settings</code>,{" "}
            <code className="text-slate-800">manage.users</code>,{" "}
            <code className="text-slate-800">manage.roles</code>.
          </p>
          <ul className="space-y-3">
            {settingsPermissions.length === 0 ? (
              <li className="text-sm text-amber-800">
                Permission pengaturan belum ada di database. Jalankan{" "}
                <code className="text-xs">npm run db:seed</code>.
              </li>
            ) : null}
            {settingsPermissions.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    name="permissionId"
                    value={p.id}
                    checked={checkedIds.has(p.id)}
                    onChange={() => togglePermission(p.id)}
                    disabled={isPending}
                    className="mt-1 rounded border-slate-300"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-slate-900">{p.label}</span>
                    <code className="mt-0.5 block text-xs text-slate-600">{p.key}</code>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {state.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function UserRoleModal({
  userId,
  displayName,
  roles,
  currentRoleId,
  vehiclePermissions,
  inspectionPermissions,
  settingsPermissions,
  initialPermissionIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const titleId = useId();
  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeModal]);

  const current = roles.find((r) => r.id === currentRoleId);
  const label = current?.name ?? "Tanpa role";

  if (roles.length === 0) {
    return (
      <span className="text-xs text-slate-500">Tidak ada role. Jalankan seed / migrasi.</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNonce((n) => n + 1);
          setOpen(true);
        }}
        className="inline-flex max-w-full flex-col items-start gap-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-500">Klik untuk role &amp; permission</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-16 sm:pt-24"
          role="presentation"
          onClick={closeModal}
        >
          <ModalForm
            key={nonce}
            userId={userId}
            displayName={displayName}
            roles={roles}
            currentRoleId={currentRoleId}
            vehiclePermissions={vehiclePermissions}
            inspectionPermissions={inspectionPermissions}
            settingsPermissions={settingsPermissions}
            initialPermissionIds={initialPermissionIds}
            onClose={closeModal}
            titleId={titleId}
          />
        </div>
      ) : null}
    </>
  );
}
