import type { InspectionRoadworthiness, InspectionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { inspectionListWhere } from "@/lib/inspections-query";

export const INSPECTIONS_LIST_PAGE_SIZE = 15;

export type InspectionListRow = {
  id: string;
  inspectedAt: Date;
  inspectorName: string;
  status: InspectionStatus;
  unitNo: string | null;
  plateNumber: string;
  odometerKm: number | null;
  roadworthiness: InspectionRoadworthiness | null;
};

export function parseInspectionListPage(raw: string | undefined): number {
  if (!raw || !Number.isFinite(Number(raw))) return 1;
  return Math.max(1, Math.floor(Number(raw)));
}

export async function fetchInspectionListPage(params: {
  q: string;
  page: number;
  pageSize?: number;
}): Promise<{
  rows: InspectionListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const pageSize = params.pageSize ?? INSPECTIONS_LIST_PAGE_SIZE;
  const where = inspectionListWhere(params.q);
  const total = await prisma.inspection.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const skip = (page - 1) * pageSize;

  const list = await prisma.inspection.findMany({
    where,
    orderBy: { inspectedAt: "desc" },
    skip,
    take: pageSize,
    include: { vehicle: { select: { plateNumber: true, unitNo: true } } },
  });

  const rows: InspectionListRow[] = list.map((x) => ({
    id: x.id,
    inspectedAt: x.inspectedAt,
    inspectorName: x.inspectorName,
    status: x.status,
    unitNo: x.vehicle.unitNo,
    plateNumber: x.vehicle.plateNumber,
    odometerKm: x.odometerKm,
    roadworthiness: x.roadworthiness,
  }));

  return { rows, total, page, pageSize, totalPages };
}

/** Unit No, nomor polisi, dan odometer terakhir dari P2H terbaru (untuk form / API unit). */
export async function fetchInspectionVehicleContext(vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isActive: true },
    select: { id: true, unitNo: true, plateNumber: true },
  });
  if (!vehicle) return null;

  const lastInspection = await prisma.inspection.findFirst({
    where: { vehicleId },
    orderBy: [{ inspectedAt: "desc" }, { id: "desc" }],
    select: { odometerKm: true, inspectedAt: true },
  });

  return {
    vehicleId: vehicle.id,
    unitNo: vehicle.unitNo,
    plateNumber: vehicle.plateNumber,
    lastOdometerKm: lastInspection?.odometerKm ?? null,
    lastOdometerAt: lastInspection?.inspectedAt ?? null,
  };
}
