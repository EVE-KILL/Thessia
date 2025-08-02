import { kubernetesManager } from "../../../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Authenticate and verify admin privileges
    await requireAdminAuth(event);

    const { podName } = getRouterParams(event);
    const { lines = 100, follow = false, container } = getQuery(event);

    try {
        const logs = await kubernetesManager.getPodLogs(
            podName as string,
            Number(lines),
            Boolean(follow),
            container as string | undefined
        );
        return { logs };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to get logs for pod ${podName}`,
            data: error,
        });
    }
});
