import { getMaintenanceState } from "../../plugins/maintenance";
import type { IMaintenanceState } from "../../interfaces/IMaintenance";

export default defineEventHandler(async (): Promise<IMaintenanceState> => {
  const maintenanceState = getMaintenanceState();
  
  return {
    isEnabled: maintenanceState.isEnabled,
    message: maintenanceState.message,
    lastChecked: maintenanceState.lastChecked,
  };
});
