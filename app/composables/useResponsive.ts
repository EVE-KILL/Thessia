import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * Composable for responsive design detection
 * Combines Nuxt's useDevice with viewport size detection
 */
export const useResponsive = () => {
  // Use Nuxt's built-in device detection
  const nuxtDevice = useDevice();

  // Create reactive refs for viewport sizes
  const viewportWidth = ref(0);
  const viewportHeight = ref(0);

  // Define breakpoints (in pixels)
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  };

  // Create reactive refs for various device types
  const isMobileViewport = ref(false);
  const isTabletViewport = ref(false);
  const isDesktopViewport = ref(false);

  // Combined reactive states
  const isMobile = computed(() => nuxtDevice.isMobile || isMobileViewport.value);
  const isTablet = computed(() => nuxtDevice.isTablet || isTabletViewport.value);
  const isDesktop = computed(() => nuxtDevice.isDesktop || isDesktopViewport.value);

  /**
   * Update viewport dimensions and device type based on window size
   */
  const updateViewport = () => {
    if (import.meta.client) {
      viewportWidth.value = window.innerWidth;
      viewportHeight.value = window.innerHeight;

      // Update device type based on viewport width
      isMobileViewport.value = viewportWidth.value < breakpoints.md;
      isTabletViewport.value =
        viewportWidth.value >= breakpoints.md && viewportWidth.value < breakpoints.lg;
      isDesktopViewport.value = viewportWidth.value >= breakpoints.lg;
    }
  };

  // Get current breakpoint name
  const currentBreakpoint = computed(() => {
    if (viewportWidth.value === 0) return null;
    if (viewportWidth.value < breakpoints.sm) return "xs";
    if (viewportWidth.value < breakpoints.md) return "sm";
    if (viewportWidth.value < breakpoints.lg) return "md";
    if (viewportWidth.value < breakpoints.xl) return "lg";
    if (viewportWidth.value < breakpoints["2xl"]) return "xl";
    return "2xl";
  });

  // Set up event listeners for client-side only
  onMounted(() => {
    if (import.meta.client) {
      updateViewport();
      window.addEventListener("resize", updateViewport);
    }
  });

  // Clean up event listeners
  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener("resize", updateViewport);
    }
  });

  return {
    // Device type detection
    isMobile,
    isTablet,
    isDesktop,

    // Raw viewport measurements
    viewportWidth,
    viewportHeight,

    // Breakpoint utilities
    breakpoints,
    currentBreakpoint,

    // Source properties
    nuxtDevice,
  };
};
