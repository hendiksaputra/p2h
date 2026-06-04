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

const vehicleContextSelect = { id: true, unitNo: true, plateNumber: true } as const;

/** Cari kendaraan aktif by ID (cuid) atau Unit No (tepat, case-sensitive di DB). */
export async function resolveActiveVehicleForContext(params: {
  vehicleId?: string;
  unitNo?: string;
}): Promise<{ id: string; unitNo: string | null; plateNumber: string } | "ambiguous" | null> {
  const idParam = params.vehicleId?.trim();
  const unitParam = params.unitNo?.trim();

  if (idParam) {
    const byId = await prisma.vehicle.findFirst({
      where: { id: idParam, isActive: true },
      select: vehicleContextSelect,
    });
    if (byId) return byId;
  }

  /** Unit No eksplisit, atau fallback: nilai vehicleId yang bukan cuid (mis. VA 055). */
  const unit = unitParam || idParam || "";
  if (!unit) return null;

  const byUnit = await prisma.vehicle.findMany({
    where: { unitNo: unit, isActive: true },
    select: vehicleContextSelect,
    take: 2,
  });
  if (byUnit.length === 1) return byUnit[0]!;
  if (byUnit.length > 1) return "ambiguous";
  return null;
}

/** Unit No, nomor polisi, dan odometer terakhir dari P2H terbaru (untuk form / API unit). */
export async function fetchInspectionVehicleContext(vehicleId: string) {
  const vehicle = await resolveActiveVehicleForContext({ vehicleId });
  if (!vehicle || vehicle === "ambiguous") return null;

  const lastInspection = await prisma.inspection.findFirst({
    where: { vehicleId: vehicle.id },
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

export type VehicleOdometerRow = {
  vehicleId: string;
  unitNo: string | null;
  plateNumber: string;
  lastOdometerKm: number | null;
  lastOdometerAt: Date | null;
};

/** JSON API: odometerKm = nilai utama (dari P2H terakhir); lastOdometerKm alias kompatibilitas. */
export function serializeVehicleOdometer(row: VehicleOdometerRow) {
  const km = row.lastOdometerKm;
  const at = row.lastOdometerAt?.toISOString() ?? null;
  return {
    vehicleId: row.vehicleId,
    unitNo: (row.unitNo ?? "").trim() || null,
    plateNumber: row.plateNumber,
    odometerKm: km,
    lastOdometerKm: km,
    odometerRecordedAt: at,
    lastOdometerAt: at,
  };
}

/** Odometer terakhir (dari P2H terbaru) untuk semua kendaraan aktif. */
export async function fetchAllVehiclesOdometer(q = ""): Promise<VehicleOdometerRow[]> {
  const t = q.trim();
  const vehicles = await prisma.vehicle.findMany({
    where: {
      isActive: true,
      ...(t
        ? {
            OR: [{ unitNo: { contains: t } }, { plateNumber: { contains: t } }],
          }
        : {}),
    },
    orderBy: [{ unitNo: "asc" }, { plateNumber: "asc" }],
    select: {
      id: true,
      unitNo: true,
      plateNumber: true,
      inspections: {
        orderBy: [{ inspectedAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { odometerKm: true, inspectedAt: true },
      },
    },
  });

  return vehicles.map((v) => {
    const last = v.inspections[0];
    return {
      vehicleId: v.id,
      unitNo: v.unitNo,
      plateNumber: v.plateNumber,
      lastOdometerKm: last?.odometerKm ?? null,
      lastOdometerAt: last?.inspectedAt ?? null,
    };
  });
}
