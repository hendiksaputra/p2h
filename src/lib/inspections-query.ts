import type { InspectionRoadworthiness, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export function inspectionListWhere(q: string): Prisma.InspectionWhereInput {
  const t = q.trim();
  if (!t) return {};
  return {
    OR: [
      { inspectorName: { contains: t } },
      { vehicle: { is: { plateNumber: { contains: t } } } },
      { vehicle: { is: { unitNo: { contains: t } } } },
      { overallNotes: { contains: t } },
    ],
  };
}

/** P2H terbaru per `vehicleId` (urut `inspectedAt`, lalu `id`). Kendaraan tanpa P2H tidak muncul di map. */
export async function getLatestInspectionSnapshotByVehicleId(
  vehicleIds: string[],
): Promise<Map<string, { id: string; roadworthiness: InspectionRoadworthiness | null }>> {
  if (vehicleIds.length === 0) return new Map();
  const rows = await prisma.inspection.findMany({
    where: { vehicleId: { in: vehicleIds } },
    orderBy: [{ inspectedAt: "desc" }, { id: "desc" }],
    distinct: ["vehicleId"],
    select: { id: true, vehicleId: true, roadworthiness: true },
  });
  return new Map(rows.map((r) => [r.vehicleId, { id: r.id, roadworthiness: r.roadworthiness }]));
}
