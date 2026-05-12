"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateUserAction } from "@/app/actions/users";

type Props = {
  user: {
    id: string;
    username: string;
    nik: string;
    fullname: string;
    position: string;
  };
};

export function EditUserForm({ user }: Props) {
  const [state, formAction, isPending] = useActionState(updateUserAction, {});

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="id" value={user.id} />

      {state.formError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <Field
        label="Username"
        name="username"
        defaultValue={user.username}
        placeholder="mis. admin.p2h"
        error={state.errors?.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="Kosongkan jika tidak diubah"
        helpText="Minimal 8 karakter. Kosongkan jika tidak ingin mengganti password."
        error={state.errors?.password}
      />
      <Field
        label="NIK"
        name="nik"
        defaultValue={user.nik}
        placeholder="5 digit"
        error={state.errors?.nik}
      />
      <Field
        label="Nama lengkap"
        name="fullname"
        defaultValue={user.fullname}
        placeholder="Nama user"
        error={state.errors?.fullname}
      />
      <Field
        label="Posisi"
        name="position"
        defaultValue={user.position}
        placeholder="Contoh: Mekanik / Supervisor"
        error={state.errors?.position}
      />

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Perbarui User"}
        </button>
        <Link
          href="/settings/users"
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  helpText,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  helpText?: string;
  error?: string;
}) {
  const invalid = Boolean(error);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={type === "password" ? "new-password" : "off"}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : helpText ? `${name}-help` : undefined}
        className={[
          "mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
          invalid
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
        ].join(" ")}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p id={`${name}-help`} className="mt-1.5 text-xs text-slate-500">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
