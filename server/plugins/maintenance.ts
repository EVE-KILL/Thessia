import type { IMaintenanceState } from "../interfaces/IMaintenanceState";
import { Config } from "../models/Config";

// Global maintenance state cache
let maintenanceState: IMaintenanceState = {
    isEnabled: false,
    message: "",
    lastChecked: new Date(0), // Start with epoch time to force initial check
};

// Check interval in milliseconds (60 seconds)
const CHECK_INTERVAL = 60 * 1000;

/**
 * Fetch maintenance configuration from database
 */
async function fetchMaintenanceConfig(): Promise<void> {
    try {
        const [modeConfig, messageConfig] = await Promise.all([
            Config.findOne({ key: "maintenance_mode" }),
            Config.findOne({ key: "maintenance_message" }),
        ]);

        maintenanceState.isEnabled =
            (modeConfig as any)?.value === "true" || false;
        maintenanceState.message = (messageConfig as any)?.value || "";
        maintenanceState.lastChecked = new Date();

        if (maintenanceState.isEnabled) {
            console.log(`[Maintenance] Status updated: ENABLED`);
        }
    } catch (error) {
        console.error("[Maintenance] Error fetching config:", error);
        // On error, keep previous state but update timestamp to avoid constant retries
        maintenanceState.lastChecked = new Date();
    }
}

/**
 * Get current maintenance state (with lazy loading)
 */
export function getMaintenanceState(): IMaintenanceState {
    const now = new Date();
    const timeSinceLastCheck =
        now.getTime() - maintenanceState.lastChecked.getTime();

    // If it's been more than CHECK_INTERVAL since last check, trigger async update
    if (timeSinceLastCheck > CHECK_INTERVAL) {
        // Don't await - let it update in background
        fetchMaintenanceConfig().catch(console.error);
    }

    return { ...maintenanceState }; // Return a copy to prevent external modification
}

export default defineNitroPlugin(async () => {
    // Perform initial check
    await fetchMaintenanceConfig();

    // Set up periodic checks
    setInterval(() => {
        fetchMaintenanceConfig().catch(console.error);
    }, CHECK_INTERVAL);
});
