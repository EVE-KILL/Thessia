import { kubernetesManager } from "../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    try {
        const deployments = await kubernetesManager.getDeployments();
        return deployments;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to get deployments",
            data: error,
        });
    }
});
