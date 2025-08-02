import { kubernetesManager } from "../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        const ingresses = await kubernetesManager.getIngresses();
        return ingresses;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to get ingresses",
            data: error,
        });
    }
});
