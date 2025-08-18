/**
 * Composable to pause/resume GIFs based on viewport visibility
 * Saves bandwidth and improves performance by pausing off-screen GIFs
 */
export const useGifPause = () => {
    const observer = ref<IntersectionObserver | null>(null);
    const observedGifs = new Map<
        HTMLImageElement,
        { originalSrc: string; staticSrc: string }
    >();

    /**
     * Convert a GIF URL to a static version
     */
    const getStaticVersion = (gifUrl: string): string => {
        // For Giphy URLs, we can get a static version by modifying the URL
        if (gifUrl.includes("giphy.com") || gifUrl.includes("i.giphy.com")) {
            // Replace /giphy.gif with /200_s.gif for a static version
            return gifUrl.replace("/giphy.gif", "/200_s.gif");
        }

        // For Tenor URLs, we can get a static version
        if (
            gifUrl.includes("tenor.com") ||
            gifUrl.includes("media.tenor.com")
        ) {
            // For Tenor, we can try to get a static version by modifying the URL
            return gifUrl.replace("/tenor.gif", "/tenor.gif?static=true");
        }

        // For regular .gif files, we can't easily create a static version
        // but we can try some common patterns or just return the same URL
        if (
            gifUrl.toLowerCase().endsWith(".gif") ||
            gifUrl.toLowerCase().endsWith(".gifv")
        ) {
            // For now, we'll return the same URL since we can't easily pause regular GIFs
            // In the future, we could implement canvas-based pausing or server-side static generation
            return gifUrl;
        }

        // For other GIFs, we'll just use the same URL (can't pause them easily)
        return gifUrl;
    };

    /**
     * Initialize the intersection observer
     */
    const initObserver = () => {
        if (import.meta.server || observer.value) return;

        observer.value = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const img = entry.target as HTMLImageElement;
                    const gifData = observedGifs.get(img);

                    if (!gifData) return;

                    if (entry.isIntersecting) {
                        // GIF is visible - show animated version
                        if (img.src !== gifData.originalSrc) {
                            img.src = gifData.originalSrc;
                        }
                    } else {
                        // GIF is not visible - show static version
                        if (img.src !== gifData.staticSrc) {
                            img.src = gifData.staticSrc;
                        }
                    }
                });
            },
            {
                // Trigger when 10% of the image is visible
                threshold: 0.1,
                // Add some margin to start loading before fully visible
                rootMargin: "50px 0px",
            }
        );
    };

    /**
     * Start observing GIF images for viewport visibility
     */
    const observeGifs = (container: HTMLElement) => {
        if (import.meta.server) return;

        // Initialize observer if not already done
        if (!observer.value) {
            initObserver();
        }

        if (!observer.value) return;

        // Find all GIF images in the container
        const gifImages = container.querySelectorAll(
            'img[src*=".gif"], img[src*=".gifv"], img[src*="giphy.com"], img[src*="tenor.com"]'
        ) as NodeListOf<HTMLImageElement>;

        gifImages.forEach((img) => {
            const originalSrc = img.src;
            const staticSrc = getStaticVersion(originalSrc);

            // Only observe if we have a different static version
            if (staticSrc !== originalSrc) {
                observedGifs.set(img, { originalSrc, staticSrc });
                observer.value!.observe(img);
            }
        });
    };

    /**
     * Stop observing GIF images
     */
    const stopObserving = (container?: HTMLElement) => {
        if (!observer.value) return;

        if (container) {
            // Stop observing GIFs in specific container
            const gifImages = container.querySelectorAll(
                'img[src*=".gif"], img[src*=".gifv"], img[src*="giphy.com"], img[src*="tenor.com"]'
            ) as NodeListOf<HTMLImageElement>;
            gifImages.forEach((img) => {
                observer.value!.unobserve(img);
                observedGifs.delete(img);
            });
        } else {
            // Stop observing all GIFs
            observedGifs.forEach((_, img) => {
                observer.value!.unobserve(img);
            });
            observedGifs.clear();
        }
    };

    /**
     * Cleanup observer
     */
    const cleanup = () => {
        if (observer.value) {
            observer.value.disconnect();
            observer.value = null;
        }
        observedGifs.clear();
    };

    // Cleanup on unmount
    onUnmounted(() => {
        cleanup();
    });

    return {
        observeGifs,
        stopObserving,
        cleanup,
    };
};
