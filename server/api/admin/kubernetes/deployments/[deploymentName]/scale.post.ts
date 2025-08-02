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
