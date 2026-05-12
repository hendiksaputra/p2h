"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  vehicleId: string;
  setVehicleId: (id: string) => void;
  inspectedTodayIds: string[];
  /** vehicleId → inspectionId P2H terakhir yang statusnya tidak layak jalan */
  notRoadworthyLastInspectionIdByVehicle: Record<string, string>;
};

const InspectionNewVehicleContext = createContext<Ctx | null>(null);

export function InspectionNewVehicleProvider({
  children,
  inspectedTodayIds,
  notRoadworthyLastInspectionIdByVehicle,
}: {
  children: ReactNode;
  inspectedTodayIds: string[];
  notRoadworthyLastInspectionIdByVehicle: Record<string, string>;
}) {
  const [vehicleId, setVehicleIdState] = useState("");
  const setVehicleId = useCallback((id: string) => {
    setVehicleIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      vehicleId,
      setVehicleId,
      inspectedTodayIds,
      notRoadworthyLastInspectionIdByVehicle,
    }),
    [vehicleId, setVehicleId, inspectedTodayIds, notRoadworthyLastInspectionIdByVehicle],
  );

  return <InspectionNewVehicleContext.Provider value={value}>{children}</InspectionNewVehicleContext.Provider>;
}

export function useInspectionNewVehicleOptional(): Ctx | null {
  return useContext(InspectionNewVehicleContext);
}

export function useInspectionNewVehicle(): Ctx {
  const v = useContext(InspectionNewVehicleContext);
  if (!v) throw new Error("useInspectionNewVehicle harus dipakai di dalam InspectionNewVehicleProvider.");
  return v;
}
