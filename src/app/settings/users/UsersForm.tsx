"use client";

import { useActionState } from "react";
import { createUserAction } from "@/app/actions/users";

type Props = {
  initialFormError?: string | null;
};

export function UsersForm({ initialFormError }: Props) {
  const [state, formAction, isPending] = useActionState(createUserAction, {
    formError: initialFormError?.trim() || undefined,
  });

  return (
    <form action={formAction} noValidate className="space-y-4">
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
        placeholder="mis. admin.p2h"
        error={state.errors?.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        placeholder="Minimal 8 karakter"
        error={state.errors?.password}
      />
      <Field label="NIK" name="nik" placeholder="5 digit" error={state.errors?.nik} />
      <Field
        label="Nama lengkap"
        name="fullname"
        placeholder="Nama user"
        error={state.errors?.fullname}
      />
      <Field
        label="Posisi"
        name="position"
        placeholder="Contoh: Mekanik / Supervisor"
        error={state.errors?.position}
      />

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan User"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
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
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : undefined}
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
      ) : null}
    </div>
  );
}
