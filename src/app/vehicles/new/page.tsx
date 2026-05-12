import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { canAccessVehicle } from "@/lib/vehicle-access";
import { getVehicleNewFlash } from "@/lib/vehicle-form-flash";
import { NewVehicleForm } from "./NewVehicleForm";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewVehiclePage(props: Props) {
  if (!(await canAccessVehicle("create.vehicles"))) {
    redirect("/vehicles");
  }

  const [flash, { error: errorParam }] = await Promise.all([
    getVehicleNewFlash(),
    props.searchParams,
  ]);
  const initialFormError = flash?.trim() || errorParam?.trim() || null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-6 py-4 min-h-[calc(100dvh-11rem)]">
      <PageHeader
        title="Tambah kendaraan"
        description="Nomor polisi harus unik, kecuali nilai ALAT BERAT untuk banyak unit alat berat (wajib isi Unit No berbeda per unit)."
        action={
          <Link href="/vehicles" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kembali
          </Link>
        }
      />

      <NewVehicleForm initialFormError={initialFormError} />
    </div>
  );
}
