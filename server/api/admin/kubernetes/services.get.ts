import { kubernetesManager } from "../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        const services = await kubernetesManager.getServices();
        return services;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to get services",
            data: error,
        });
    }
});
