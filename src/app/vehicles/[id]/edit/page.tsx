import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { canAccessVehicle } from "@/lib/vehicle-access";
import { getVehicleEditFlash } from "@/lib/vehicle-form-flash";
import { EditVehicleForm } from "./EditVehicleForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditVehiclePage(props: Props) {
  if (!(await canAccessVehicle("ubah.vehicles"))) {
    redirect("/vehicles");
  }

  const { id } = await props.params;
  const [flash, { error: errorParam }] = await Promise.all([
    getVehicleEditFlash(id),
    props.searchParams,
  ]);
  const initialFormError = flash?.trim() || errorParam?.trim() || null;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } }).catch(() => null);
  if (!vehicle) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-6 py-4 min-h-[calc(100dvh-11rem)]">
      <PageHeader
        title="Ubah kendaraan"
        description={`${vehicle.plateNumber} — perbarui data unit. Nomor polisi unik, kecuali ALAT BERAT (gabung dengan Unit No unik per unit).`}
        action={
          <Link href="/vehicles" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kembali
          </Link>
        }
      />

      <EditVehicleForm
        initialFormError={initialFormError}
        vehicle={{
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          unitNo: vehicle.unitNo ?? "",
          brand: vehicle.brand ?? "",
          model: vehicle.model ?? "",
          vehicleType: vehicle.vehicleType ?? "",
          year: vehicle.year?.toString() ?? "",
          notes: vehicle.notes ?? "",
          isActive: vehicle.isActive,
        }}
      />
    </div>
  );
}
