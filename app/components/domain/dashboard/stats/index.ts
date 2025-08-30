// Dashboard Stats Components
// These are the individual modular components that can be used
// to build custom dashboard layouts

export { default as DomainDashboardActiveEntitiesBox } from "./DomainDashboardActiveEntitiesBox.vue";
export { default as DomainDashboardISKDestroyedBox } from "./DomainDashboardISKDestroyedBox.vue";
export { default as DomainDashboardStatsGrid } from "./DomainDashboardStatsGrid.vue";
export { default as DomainDashboardTopShipBox } from "./DomainDashboardTopShipBox.vue";
export { default as DomainDashboardTotalKillsBox } from "./DomainDashboardTotalKillsBox.vue";

// Component registry for dynamic imports
export const DASHBOARD_COMPONENTS = {
    // Stats components
    DomainDashboardTotalKillsBox: () =>
        import("./DomainDashboardTotalKillsBox.vue"),
    DomainDashboardISKDestroyedBox: () =>
        import("./DomainDashboardISKDestroyedBox.vue"),
    DomainDashboardTopShipBox: () => import("./DomainDashboardTopShipBox.vue"),
    DomainDashboardActiveEntitiesBox: () =>
        import("./DomainDashboardActiveEntitiesBox.vue"),
    DomainDashboardStatsGrid: () => import("./DomainDashboardStatsGrid.vue"),

    // Section components
    DomainDashboardHeroSection: () =>
        import("../sections/DomainDashboardHeroSection.vue"),
    DomainDashboardTimeRangeSelector: () =>
        import("../sections/DomainDashboardTimeRangeSelector.vue"),
    DomainDashboardTrackingOverview: () =>
        import("../sections/DomainDashboardTrackingOverview.vue"),
    DomainDashboardCampaignsSection: () =>
        import("../sections/DomainDashboardCampaignsSection.vue"),
    DomainDashboardMostValuableSection: () =>
        import("../sections/DomainDashboardMostValuableSection.vue"),
    DomainDashboardShipAnalysisSection: () =>
        import("../sections/DomainDashboardShipAnalysisSection.vue"),
    DomainDashboardRecentActivitySection: () =>
        import("../sections/DomainDashboardRecentActivitySection.vue"),
    DomainDashboardTopBoxesSection: () =>
        import("../sections/DomainDashboardTopBoxesSection.vue"),
} as const;

// Component names for template parsing
export const COMPONENT_NAMES = Object.keys(DASHBOARD_COMPONENTS) as Array<
    keyof typeof DASHBOARD_COMPONENTS
>;
