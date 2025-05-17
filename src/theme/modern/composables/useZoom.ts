import { onMounted, readonly, ref, watch } from 'vue';

export interface UseZoomOptions {
    defaultZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    step?: number;
    storageKey?: string;
    transformOrigin?: string;
    targetSelector?: string;
}

/**
 * Composable for managing zoom level in the application
 */
export function useZoom(options: UseZoomOptions = {}) {
    // Default options
    const {
        defaultZoom = 100,
        minZoom = 70,
        maxZoom = 150,
        step = 10,
        storageKey = 'app-zoom-level',
        transformOrigin = 'top left',
        targetSelector = 'html'
    } = options;

    // Current zoom level
    const zoom = ref<number>(defaultZoom);

    // Load zoom from localStorage on mount
    onMounted(() => {
        if (import.meta.client) {
            try {
                const savedZoom = localStorage.getItem(storageKey);
                if (savedZoom) {
                    const parsedZoom = parseInt(savedZoom, 10);
                    if (!isNaN(parsedZoom) && parsedZoom >= minZoom && parsedZoom <= maxZoom) {
                        zoom.value = parsedZoom;
                    }
                }
            } catch (error) {
                console.error('Error loading zoom level from localStorage:', error);
            }
        }
    });

    // Save zoom to localStorage when it changes
    watch(zoom, (newZoom) => {
        if (import.meta.client) {
            try {
                localStorage.setItem(storageKey, newZoom.toString());
                applyZoom();
            } catch (error) {
                console.error('Error saving zoom level to localStorage:', error);
            }
        }
    });

    /**
     * Apply the current zoom level to the DOM
     */
    const applyZoom = () => {
        if (import.meta.client) {
            const target = document.querySelector(targetSelector) as HTMLElement;
            if (target) {
                target.style.setProperty('--app-zoom', `${zoom.value}%`);
                target.style.zoom = `${zoom.value}%`;
                target.style.transformOrigin = transformOrigin;
            }
        }
    };

    /**
     * Increase zoom by step amount
     */
    const zoomIn = () => {
        if (zoom.value < maxZoom) {
            zoom.value = Math.min(zoom.value + step, maxZoom);
        }
    };

    /**
     * Decrease zoom by step amount
     */
    const zoomOut = () => {
        if (zoom.value > minZoom) {
            zoom.value = Math.max(zoom.value - step, minZoom);
        }
    };

    /**
     * Reset zoom to default
     */
    const resetZoom = () => {
        zoom.value = defaultZoom;
    };

    /**
     * Set zoom to a specific level
     */
    const setZoom = (level: number) => {
        if (level >= minZoom && level <= maxZoom) {
            zoom.value = level;
        }
    };

    // Initialize zoom on client-side
    if (import.meta.client) {
        onMounted(() => {
            applyZoom();
        });
    }

    return {
        zoom: readonly(zoom),
        zoomIn,
        zoomOut,
        resetZoom,
        setZoom,
        applyZoom,
        minZoom,
        maxZoom,
        step
    };
}
