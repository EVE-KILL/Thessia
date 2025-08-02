import { kubernetesManager } from "../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        const overview = await kubernetesManager.getClusterOverview();
        return overview;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to get cluster overview",
            data: error,
        });
    }
});
