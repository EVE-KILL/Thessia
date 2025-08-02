import { kubernetesManager } from "../../../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const { podName } = getRouterParams(event);

    try {
        const result = await kubernetesManager.deletePod(podName as string);
        return result;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to delete pod ${podName}`,
            data: error,
        });
    }
});
