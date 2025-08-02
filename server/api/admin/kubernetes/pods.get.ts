import { kubernetesManager } from "../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        const pods = await kubernetesManager.getPods();
        return pods;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to get pods",
            data: error,
        });
    }
});
