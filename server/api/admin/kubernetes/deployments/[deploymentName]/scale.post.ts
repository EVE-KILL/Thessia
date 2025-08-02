import { kubernetesManager } from "../../../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const { deploymentName } = getRouterParams(event);
    const body = await readBody(event);
    const { replicas } = body;

    if (replicas === undefined || replicas < 0) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid replicas value",
        });
    }

    try {
        const result = await kubernetesManager.scaleDeployment(
            deploymentName as string,
            Number(replicas)
        );
        return result;
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to scale deployment ${deploymentName}`,
            data: error,
        });
    }
});
