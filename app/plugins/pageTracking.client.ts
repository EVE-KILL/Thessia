// Client-side page tracking plugin
export default defineNuxtPlugin(() => {
    // Only run on client-side
    if (process.server) return;

    // Configuration
    const TRACKING_CONFIG = {
        bufferSize: 10, // Buffer up to 10 page views
        flushInterval: 5000, // Flush every 5 seconds
        apiEndpoint: "/api/tracking/pageview",
        maxRetries: 2,
    };

    // Generate session ID (persisted for session duration)
    const getSessionId = (): string => {
        let sessionId = sessionStorage.getItem("tracking-session-id");
        if (!sessionId) {
            sessionId = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 15)}`;
            sessionStorage.setItem("tracking-session-id", sessionId);
        }
        return sessionId;
    };

    // Page view buffer
    let pageViewBuffer: Array<{
        url: string;
        referrer?: string;
        sessionId: string;
        timestamp: string;
    }> = [];

    let flushTimer: number | null = null;
    let isFlushInProgress = false;

    // Add page view to buffer
    const addPageView = (url: string, referrer?: string) => {
        pageViewBuffer.push({
            url,
            referrer,
            sessionId: getSessionId(),
            timestamp: new Date().toISOString(),
        });

        // Schedule flush if buffer is getting full
        if (pageViewBuffer.length >= TRACKING_CONFIG.bufferSize) {
            scheduleFlush();
        } else {
            // Also schedule a regular flush if this is the first item
            if (pageViewBuffer.length === 1) {
                scheduleFlush();
            }
        }
    };

    // Schedule buffer flush
    const scheduleFlush = () => {
        if (flushTimer) {
            clearTimeout(flushTimer);
        }
        flushTimer = window.setTimeout(() => {
            flushBuffer();
        }, TRACKING_CONFIG.flushInterval);
    };

    // Flush buffer to server
    const flushBuffer = async () => {
        if (isFlushInProgress || pageViewBuffer.length === 0) return;

        isFlushInProgress = true;

        try {
            // Copy buffer and clear it immediately
            const viewsToSend = [...pageViewBuffer];
            pageViewBuffer.length = 0;

            // Send each page view (they're lightweight)
            const promises = viewsToSend.map(async (view) => {
                let retries = 0;
                while (retries < TRACKING_CONFIG.maxRetries) {
                    try {
                        await $fetch(TRACKING_CONFIG.apiEndpoint, {
                            method: "POST",
                            body: view,
                        });
                        break; // Success, exit retry loop
                    } catch (error) {
                        retries++;
                        if (retries >= TRACKING_CONFIG.maxRetries) {
                            // Silent fail - don't impact user experience
                            console.debug(
                                "Failed to send page view after retries"
                            );
                        }
                    }
                }
            });

            await Promise.allSettled(promises);
        } catch (error) {
            // Silent fail - don't impact user experience
            console.debug("Error flushing page view buffer:", error);
        } finally {
            isFlushInProgress = false;
            flushTimer = null;
        }
    };

    // Setup periodic flush
    const flushInterval = setInterval(
        flushBuffer,
        TRACKING_CONFIG.flushInterval
    );

    // Track initial page load
    if (process.client) {
        nextTick(() => {
            addPageView(
                window.location.pathname + window.location.search,
                document.referrer
            );
        });
    }

    // Track route changes
    const router = useRouter();
    router.afterEach((to, from) => {
        // Only track if the route actually changed
        if (to.fullPath !== from.fullPath) {
            addPageView(to.fullPath, from.fullPath);
        }
    });

    // Flush remaining page views before page unload
    if (process.client) {
        const beforeUnloadHandler = () => {
            // Use sendBeacon for reliability during page unload
            if (pageViewBuffer.length > 0 && navigator.sendBeacon) {
                const viewsToSend = [...pageViewBuffer];
                pageViewBuffer.length = 0;

                // Send each page view via beacon
                viewsToSend.forEach((view) => {
                    const blob = new Blob([JSON.stringify(view)], {
                        type: "application/json",
                    });
                    navigator.sendBeacon(TRACKING_CONFIG.apiEndpoint, blob);
                });
            }
        };

        window.addEventListener("beforeunload", beforeUnloadHandler);
        window.addEventListener("pagehide", beforeUnloadHandler);

        // Cleanup on unmount
        onBeforeUnmount(() => {
            clearInterval(flushInterval);
            if (flushTimer) clearTimeout(flushTimer);
            window.removeEventListener("beforeunload", beforeUnloadHandler);
            window.removeEventListener("pagehide", beforeUnloadHandler);
        });
    }
});
