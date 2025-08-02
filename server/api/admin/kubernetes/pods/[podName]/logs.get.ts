import { kubernetesManager } from "../../../../../utils/kubernetes";

export default defineEventHandler(async (event) => {
    // Get authentication cookie
    const cookieName = "evelogin";
    const cookie = getCookie(event, cookieName);

    if (!cookie) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentication required",
        });
    }

    // Find user by cookie value
    const user = await Users.findOne({ uniqueIdentifier: cookie });
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session",
        });
    }

    // Check if user is administrator
    if (!user.administrator) {
        throw createError({
            statusCode: 403,
            statusMessage: "Administrator access required",
        });
    }

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
