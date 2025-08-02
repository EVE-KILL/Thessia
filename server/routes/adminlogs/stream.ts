import { kubernetesManager } from "../../utils/kubernetes";

interface LogStreamParams {
    pods?: string;
}

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

    const query = getQuery<LogStreamParams>(event);
    const selectedPods = query.pods || "all";

    // Create the event stream
    const eventStream = createEventStream(event);

    // Set up variables for cleanup
    let logStreams: any[] = [];

    // Start the setup asynchronously after the connection is established
    const setupLogStreaming = async () => {
        try {
            // Get all pods first
            const pods = await kubernetesManager.getPods();

            // Filter to only running pods and exclude system pods
            const allRunningPods = pods.filter(
                (pod: any) =>
                    pod.status?.phase === "Running" &&
                    pod.metadata?.name &&
                    !pod.metadata.name.startsWith("kube-") &&
                    !pod.metadata.name.includes("traefik") &&
                    !pod.metadata.name.includes("coredns") &&
                    !pod.metadata.name.startsWith("cron-") && // Exclude cron jobs
                    !pod.metadata.name.match(/^[a-z-]+-\d{8}-[a-z0-9]{5}$/) // Exclude job pods pattern
            );

            if (!allRunningPods || allRunningPods.length === 0) {
                await eventStream.push(
                    `data: ${JSON.stringify({
                        type: "error",
                        message:
                            "No running pods found in the eve-kill namespace",
                    })}\n\n`
                );
                return;
            }

            // Filter pods based on selection
            let targetPods = allRunningPods;
            if (selectedPods && selectedPods !== "all") {
                const podNames = selectedPods
                    .split(",")
                    .map((name) => name.trim())
                    .filter((name) => name);
                if (podNames.length > 0) {
                    targetPods = targetPods.filter((pod: any) =>
                        podNames.includes(pod.metadata?.name || "")
                    );
                }
            }

            if (targetPods.length === 0) {
                await eventStream.push(
                    `data: ${JSON.stringify({
                        type: "error",
                        message:
                            "No matching pods found for the selected criteria",
                    })}\n\n`
                );
                return;
            }

            // Send pod info - removed, Vue component gets this from separate endpoint

            // Create log streams for each target pod and container
            const streamPromises: Promise<any>[] = [];

            targetPods.forEach((pod: any) => {
                const podName = pod.metadata?.name || "";
                const containers = pod.spec?.containers || [];

                // Create a stream for each container in the pod
                containers.forEach((container: any) => {
                    const containerName = container.name;

                    streamPromises.push(
                        (async () => {
                            try {
                                const logStream =
                                    await kubernetesManager.watchPodLogs(
                                        podName,
                                        undefined,
                                        {
                                            follow: true,
                                            tailLines: 10,
                                            timestamps: true,
                                            container: containerName,
                                        }
                                    );

                                // Set up event handlers for this stream
                                logStream.on("data", async (chunk: Buffer) => {
                                    try {
                                        const logText = chunk.toString();
                                        const lines = logText
                                            .split("\n")
                                            .filter((line) => line.trim());

                                        for (const line of lines) {
                                            // Extract deployment name from pod name (remove replica set hash and random suffix)
                                            const podName =
                                                pod.metadata?.name || "";
                                            const deploymentName =
                                                podName.replace(
                                                    /-[a-z0-9]{8,10}-[a-z0-9]{5}$/,
                                                    ""
                                                );

                                            // Create prefix - show just deployment name if container name is the same
                                            const prefix =
                                                deploymentName ===
                                                container.name
                                                    ? deploymentName
                                                    : `${deploymentName}/${container.name}`;
                                            const logWithPrefix = `${prefix} | ${line}`;
                                            await eventStream.push(
                                                `${logWithPrefix}\n\n`
                                            );
                                        }
                                    } catch (error) {
                                        // Silently handle log processing errors
                                    }
                                });

                                logStream.on("error", async (error: Error) => {
                                    // Only log non-404 errors (404 means pod disappeared, which is normal for jobs)
                                    if (
                                        !error.message.includes("404") &&
                                        !error.message.includes("not found")
                                    ) {
                                        console.error(
                                            "SSE: Kubernetes log stream error for",
                                            podName,
                                            containerName,
                                            ":",
                                            error
                                        );
                                    }
                                    // Don't send 404 errors to client as they're expected for cron jobs
                                });

                                return { podName, containerName, logStream };
                            } catch (error) {
                                // Only log non-404 errors (404 means pod disappeared, which is normal for jobs)
                                const errorMessage =
                                    error instanceof Error
                                        ? error.message
                                        : String(error);
                                if (
                                    !errorMessage.includes("404") &&
                                    !errorMessage.includes("not found")
                                ) {
                                    console.error(
                                        "SSE: Failed to create stream for",
                                        podName,
                                        containerName,
                                        ":",
                                        error
                                    );
                                }
                                return null;
                            }
                        })()
                    );
                });
            });

            // Wait for all streams to be created
            const results = await Promise.allSettled(streamPromises);
            logStreams = results
                .filter(
                    (result) =>
                        result.status === "fulfilled" && result.value !== null
                )
                .map((result) => (result as PromiseFulfilledResult<any>).value);

            // Send ready signal - removed, just start streaming logs directly
        } catch (error) {
            console.error("SSE: Error setting up log streaming:", error);
            await eventStream.push(
                `data: ${JSON.stringify({
                    type: "error",
                    message: `Failed to set up log streaming: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                })}\n\n`
            );
        }
    };

    // Handle cleanup on close
    eventStream.onClosed(async () => {
        logStreams.forEach(({ logStream }) => {
            if (
                logStream &&
                typeof logStream.removeAllListeners === "function"
            ) {
                logStream.removeAllListeners();
            }
        });

        await eventStream.close();
    });

    // Start the Kubernetes log streaming setup asynchronously
    setupLogStreaming();

    return eventStream.send();
});
