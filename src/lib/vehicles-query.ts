import type { Prisma } from "@prisma/client";

export const VEHICLES_PAGE_SIZE = 10;

export function parseVehiclesPage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function vehicleListWhere(qRaw: string): Prisma.VehicleWhereInput {
  const q = qRaw.trim();
  if (!q) return {};
  return {
    OR: [
      { plateNumber: { contains: q } },
      { unitNo: { contains: q } },
      { brand: { contains: q } },
      { model: { contains: q } },
      { vehicleType: { contains: q } },
    ],
  };
}
