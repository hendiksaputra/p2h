"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createVehicleAction, type VehicleFormState } from "@/app/actions/vehicles";

type Props = {
  initialFormError?: string | null;
};

export function NewVehicleForm({ initialFormError }: Props) {
  const [state, formAction, isPending] = useActionState(createVehicleAction, {
    formError: initialFormError?.trim() || undefined,
  });

  return (
    <form
      action={formAction}
      noValidate
      className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      {state.formError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nomor polisi"
          name="plateNumber"
          placeholder="B 1234 XY atau ALAT BERAT"
          error={state.errors?.plateNumber}
        />
        <Field label="Unit No" name="unitNo" placeholder="Mis. U-001" error={state.errors?.unitNo} />
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Untuk alat berat tanpa nomor polisi resmi, isi <span className="font-medium text-slate-700">ALAT BERAT</span>{" "}
        lalu isi <span className="font-medium text-slate-700">Unit No</span> yang berbeda untuk setiap unit (Unit No
        tidak boleh sama antar kendaraan bertanda ALAT BERAT).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Merek" name="brand" placeholder="Mis. Hino" error={state.errors?.brand} />
        <Field label="Model" name="model" placeholder="Mis. Dutro" error={state.errors?.model} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Jenis kendaraan"
          name="vehicleType"
          placeholder="LIGHT VEHICLE / OVER HEAD CRANE / GANTRY CRANE"
          error={state.errors?.vehicleType}
        />
        <Field
          label="Tahun"
          name="year"
          type="number"
          placeholder="2022"
          min={1980}
          max={2100}
          error={state.errors?.year}
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Catatan
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          aria-invalid={Boolean(state.errors?.notes)}
          className={textareaClass(Boolean(state.errors?.notes))}
        />
        {state.errors?.notes ? <FieldError message={state.errors.notes} /> : null}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link
          href="/vehicles"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
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
  error,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  min?: number;
  max?: number;
}) {
  const invalid = Boolean(error);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {name === "plateNumber" ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : undefined}
        className={inputClass(invalid)}
      />
      {error ? <FieldError id={`${name}-error`} message={error} /> : null}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}

function inputClass(invalid: boolean) {
  return [
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
  ].join(" ");
}

function textareaClass(invalid: boolean) {
  return [
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
  ].join(" ");
}
