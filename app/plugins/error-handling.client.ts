/**
 * Client-side error handling and warning suppression
 */
export default defineNuxtPlugin(() => {
    if (import.meta.dev) {
        // Suppress Vue Suspense experimental warning
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            // Filter out known development warnings that are expected
            const message = args[0];
            if (
                typeof message === "string" &&
                (message.includes("<Suspense> is an experimental feature") ||
                    message.includes("PerformanceEventTiming is undefined") ||
                    message.includes("InstallTrigger is deprecated") ||
                    message.includes("onmozfullscreenchange is deprecated") ||
                    message.includes("onmozfullscreenerror is deprecated") ||
                    message.includes(
                        'Set operation on key "value" failed: target is readonly'
                    ))
            ) {
                // Skip these warnings in development
                return;
            }

            // Log other warnings normally
            originalWarn.apply(console, args);
        };

        // Also suppress Vue warn messages that are logged differently
        const originalError = console.error;
        console.error = (...args: any[]) => {
            const message = args[0];
            if (
                typeof message === "string" &&
                message.includes(
                    '[Vue warn] Set operation on key "value" failed: target is readonly'
                )
            ) {
                // Skip Vue readonly warnings in development
                return;
            }

            // Log other errors normally
            originalError.apply(console, args);
        };

        // Handle Partytown-related errors gracefully
        window.addEventListener("error", (event) => {
            if (
                event.error?.message?.includes(
                    "PerformanceEventTiming is undefined"
                ) ||
                event.error?.message?.includes("partytown") ||
                event.filename?.includes("partytown")
            ) {
                // Prevent these errors from showing in console during development
                event.preventDefault();
                return false;
            }
        });

        // Handle unhandled promise rejections related to third-party scripts
        window.addEventListener("unhandledrejection", (event) => {
            if (
                event.reason?.message?.includes("partytown") ||
                event.reason?.message?.includes("cloudflare-beacon")
            ) {
                event.preventDefault();
                return false;
            }
        });
    }
});
