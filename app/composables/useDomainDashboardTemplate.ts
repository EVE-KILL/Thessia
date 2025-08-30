import { computed, ref } from "vue";
import { COMPONENT_NAMES } from "~/components/domain/dashboard/stats";

// Define the type locally instead of importing it (types don't exist at runtime)
type DashboardComponentName = (typeof COMPONENT_NAMES)[number];

/**
 * Template parsing and rendering composable
 * Handles parsing custom HTML templates and extracting component configurations
 */

interface ParsedComponent {
    name: DashboardComponentName;
    props: Record<string, any>;
    slot?: string;
    key: string;
}

interface ParsedTemplate {
    components: ParsedComponent[];
    customHtml: string;
    isValid: boolean;
    errors: string[];
}

interface DashboardTemplateConfig {
    template: string;
    customCss?: string;
    title?: string;
    description?: string;
}

export function useDomainDashboardTemplate() {
    const currentTemplate = ref<string>("");
    const customCss = ref<string>("");
    const templateErrors = ref<string[]>([]);
    const isParsingTemplate = ref(false);

    /**
     * Parse HTML template and extract component configurations
     */
    function parseTemplate(template: string): ParsedTemplate {
        const result: ParsedTemplate = {
            components: [],
            customHtml: template,
            isValid: true,
            errors: [],
        };

        if (!template.trim()) {
            result.isValid = false;
            result.errors.push("Template cannot be empty");
            return result;
        }

        try {
            // SSR-compatible template parsing using regex instead of DOMParser
            if (process.server || typeof window === "undefined") {
                // Server-side: Use regex-based parsing for component extraction
                const componentMatches = [];

                // Create regex pattern for all component names
                const componentPattern = new RegExp(
                    `<(${COMPONENT_NAMES.join(
                        "|"
                    )})([^>]*?)(?:\\s*/>|>(.*?)<\\/\\1>)`,
                    "gis"
                );

                let match;
                let index = 0;
                while ((match = componentPattern.exec(template)) !== null) {
                    const [, tagName, attributesStr, slotContent] = match;

                    // Find the matching component name (case-insensitive)
                    const componentName = COMPONENT_NAMES.find(
                        (name) => name.toLowerCase() === tagName.toLowerCase()
                    );

                    if (!componentName) continue;

                    const props: Record<string, any> = {};

                    // Parse attributes using regex
                    if (attributesStr) {
                        const attrPattern =
                            /(\w+(?:-\w+)*)(?:=["']([^"']*)["']|=([^\s]+))?/g;
                        let attrMatch;

                        while (
                            (attrMatch = attrPattern.exec(attributesStr)) !==
                            null
                        ) {
                            const [, attrName, quotedValue, unquotedValue] =
                                attrMatch;
                            const propName = attrName.replace(/^:/, ""); // Remove Vue binding prefix
                            let propValue: any =
                                quotedValue !== undefined
                                    ? quotedValue
                                    : unquotedValue || true;

                            // Try to parse common prop types
                            if (propValue === "true" || propValue === "false") {
                                propValue = propValue === "true";
                            } else if (
                                typeof propValue === "string" &&
                                !isNaN(Number(propValue)) &&
                                propValue !== ""
                            ) {
                                propValue = Number(propValue);
                            } else if (
                                typeof propValue === "string" &&
                                propValue.startsWith("{") &&
                                propValue.endsWith("}")
                            ) {
                                // Try to parse as JSON for object props
                                try {
                                    propValue = JSON.parse(propValue);
                                } catch {
                                    // Keep as string if parsing fails
                                }
                            }

                            props[propName] = propValue;
                        }
                    }

                    componentMatches.push({
                        name: componentName,
                        props,
                        slot: slotContent?.trim() || undefined,
                        key: `${componentName}-${index}`,
                    });

                    index++;
                }

                result.components = componentMatches;
            } else {
                // Client-side: Use DOMParser when available
                const parser = new DOMParser();
                const doc = parser.parseFromString(
                    `<div>${template}</div>`,
                    "text/html"
                );
                const container = doc.querySelector("div");

                if (!container) {
                    result.isValid = false;
                    result.errors.push("Invalid HTML structure");
                    return result;
                }

                // Find all dashboard components in the template IN DOCUMENT ORDER
                // Create a selector that matches all component names
                const allComponentsSelector = COMPONENT_NAMES.join(", ");
                const allElements = container.querySelectorAll(
                    allComponentsSelector
                );

                // Process elements in document order (querySelectorAll returns elements in document order)
                allElements.forEach((element, index) => {
                    // Determine which component this element represents
                    const componentName = COMPONENT_NAMES.find(
                        (name) =>
                            element.tagName.toLowerCase() === name.toLowerCase()
                    );

                    if (!componentName) return; // Skip if not a valid component

                    const props: Record<string, any> = {};

                    // Extract attributes as props
                    Array.from(element.attributes).forEach((attr) => {
                        const propName = attr.name.replace(/^:/, ""); // Remove Vue binding prefix
                        let propValue: any = attr.value;

                        // Try to parse common prop types
                        if (propValue === "true" || propValue === "false") {
                            propValue = propValue === "true";
                        } else if (
                            !isNaN(Number(propValue)) &&
                            propValue !== ""
                        ) {
                            propValue = Number(propValue);
                        } else if (
                            propValue.startsWith("{") &&
                            propValue.endsWith("}")
                        ) {
                            // Try to parse as JSON for object props
                            try {
                                propValue = JSON.parse(propValue);
                            } catch {
                                // Keep as string if parsing fails
                            }
                        }

                        props[propName] = propValue;
                    });

                    // Get slot content if any
                    const slotContent = element.innerHTML.trim();

                    result.components.push({
                        name: componentName,
                        props,
                        slot: slotContent || undefined,
                        key: `${componentName}-${index}`,
                    });
                });
            }

            // Validate required props for components
            result.components.forEach((comp, index) => {
                // Components that don't require domain prop
                const noDomainRequired = ["DomainDashboardTimeRangeSelector"];

                if (
                    !noDomainRequired.includes(comp.name) &&
                    !comp.props.domain
                ) {
                    result.errors.push(
                        `${comp.name} at position ${
                            index + 1
                        } is missing required 'domain' prop`
                    );
                    result.isValid = false;
                }
            });
        } catch (error) {
            result.isValid = false;
            result.errors.push(
                `Template parsing error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }

        return result;
    }

    /**
     * Generate default template based on existing dashboard layout
     */
    function generateDefaultTemplate(
        domain: string,
        timeRange: string = "7d"
    ): string {
        return `<!-- Hero Section -->
<DomainDashboardHeroSection
  domain="${domain}"
  title="EVE Online Killboard"
  welcome-message="Welcome to our EVE Online killboard"
  secondary-message="Track combat operations, analyze statistics, and monitor space battles across New Eden" />

<!-- Main Dashboard Content -->
<div class="dashboard-container">
  <!-- Time Range Selector -->
  <div class="time-range-section">
    <DomainDashboardTimeRangeSelector v-model="selectedTimeRange" />
  </div>

  <!-- Statistics Grid - 4 Key Metrics in Row -->
  <div class="metrics-grid">
    <div class="metrics-grid-item">
      <DomainDashboardTotalKillsBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Total Kills"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardISKDestroyedBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="ISK Destroyed"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardTopShipBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Most Destroyed"
        count-label="destroyed"
        :show-ship-icon="true"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardActiveEntitiesBox
        domain="${domain}"
        :time-range="selectedTimeRange"
        title="Active Entities"
        entity-type="all"
        size="md"
        class="metric-box" />
    </div>
  </div>

  <!-- Tracking Overview -->
  <div class="dashboard-section">
    <DomainDashboardTrackingOverview
      domain="${domain}"
      :entities="entities"
      :entity-stats="entityStats" />
  </div>

  <!-- Campaigns Section -->
  <div class="dashboard-section">
    <DomainDashboardCampaignsSection
      domain="${domain}"
      :campaigns="campaigns" />
  </div>

  <!-- Most Valuable Kills -->
  <div class="dashboard-section">
    <DomainDashboardMostValuableSection
      domain="${domain}"
      :most-valuable-kills="stats?.mostValuableKills?.slice(0, 7) || []"
      :loading="statsLoading"
      :selected-entity="selectedEntityLabel"
      time-range-label="Recent Activity" />
  </div>

  <!-- Ship Analysis -->
  <div class="dashboard-section">
    <DomainDashboardShipAnalysisSection
      domain="${domain}"
      :stats="stats"
      :loading="statsLoading"
      :selected-entity="selectedEntityLabel"
      time-range-label="Combat Analysis" />
  </div>

  <!-- Bottom Section: Kill List (80%) + Top Boxes (20%) -->
  <div class="bottom-grid">
    <!-- Kill List - 80% width -->
    <div class="kill-list-section">
      <DomainDashboardRecentActivitySection
        domain="${domain}"
        :api-endpoint="killmailsEndpoint"
        :selected-entity="selectedEntityLabel"
        title="Recent Killmails"
        description="Latest combat activity and killmail reports" />
    </div>

    <!-- Top Boxes - 20% width -->
    <div class="top-boxes-section">
      <DomainDashboardTopBoxesSection
        domain="${domain}"
        :top-killers-by-character="stats?.topKillersByCharacter || []"
        :top-killers-by-corporation="stats?.topKillersByCorporation || []"
        :top-killers-by-alliance="stats?.topKillersByAlliance || []"
        :loading="statsLoading"
        :days="selectedTimeRangeDays"
        title="Top Performers"
        show-all-categories="true" />
    </div>
  </div>
</div>`.trim();
    }

    /**
     * Generate component documentation/examples
     */
    function generateComponentDocs(): Record<DashboardComponentName, any> {
        return {
            DomainDashboardTotalKillsBox: {
                description: "Displays total kill count for a time period",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "time-range": {
                        type: "string",
                        default: "7d",
                        description: "Time range (1d, 7d, 14d, 30d)",
                    },
                    title: {
                        type: "string",
                        default: "Total Kills",
                        description: "Box title",
                    },
                    size: {
                        type: "string",
                        default: "md",
                        description: "Size variant (sm, md, lg)",
                    },
                    "show-trend": {
                        type: "boolean",
                        default: false,
                        description: "Show trend indicator",
                    },
                },
                example:
                    '<DomainDashboardTotalKillsBox domain="your-domain" time-range="7d" title="Weekly Kills" />',
            },
            DomainDashboardISKDestroyedBox: {
                description: "Displays ISK destroyed value for a time period",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "time-range": {
                        type: "string",
                        default: "7d",
                        description: "Time range (1d, 7d, 14d, 30d)",
                    },
                    title: {
                        type: "string",
                        default: "ISK Destroyed",
                        description: "Box title",
                    },
                    size: {
                        type: "string",
                        default: "md",
                        description: "Size variant (sm, md, lg)",
                    },
                    "show-raw-number": {
                        type: "boolean",
                        default: false,
                        description: "Show raw number instead of formatted",
                    },
                    currency: {
                        type: "string",
                        default: "ISK",
                        description: "Currency label",
                    },
                },
                example:
                    '<DomainDashboardISKDestroyedBox domain="your-domain" :show-raw-number="true" />',
            },
            DomainDashboardTopShipBox: {
                description: "Displays the top ship by kill count",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "time-range": {
                        type: "string",
                        default: "7d",
                        description: "Time range (1d, 7d, 14d, 30d)",
                    },
                    title: {
                        type: "string",
                        default: "Top Ship",
                        description: "Box title",
                    },
                    "count-label": {
                        type: "string",
                        default: "kills",
                        description: "Label for count display",
                    },
                    "show-ship-icon": {
                        type: "boolean",
                        default: true,
                        description: "Show ship icon",
                    },
                    "show-percentage": {
                        type: "boolean",
                        default: true,
                        description: "Show percentage",
                    },
                    size: {
                        type: "string",
                        default: "md",
                        description: "Size variant (sm, md, lg)",
                    },
                },
                example:
                    '<DomainDashboardTopShipBox domain="your-domain" count-label="losses" :show-percentage="false" />',
            },
            DomainDashboardActiveEntitiesBox: {
                description:
                    "Displays active entity counts (characters, corps, alliances)",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "time-range": {
                        type: "string",
                        default: "7d",
                        description: "Time range (1d, 7d, 14d, 30d)",
                    },
                    title: {
                        type: "string",
                        default: "Active Entities",
                        description: "Box title",
                    },
                    "entity-type": {
                        type: "string",
                        default: "characters",
                        description:
                            "Entity type (characters, corporations, alliances, all)",
                    },
                    "show-breakdown": {
                        type: "boolean",
                        default: false,
                        description: "Show entity type breakdown",
                    },
                    size: {
                        type: "string",
                        default: "md",
                        description: "Size variant (sm, md, lg)",
                    },
                },
                example:
                    '<DomainDashboardActiveEntitiesBox domain="your-domain" entity-type="all" :show-breakdown="true" />',
            },
            DomainDashboardHeroSection: {
                description:
                    "Hero section with title, welcome message, and CTA buttons",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    title: {
                        type: "string",
                        default: "Domain Dashboard",
                        description: "Hero title",
                    },
                    "welcome-message": {
                        type: "string",
                        description: "Primary welcome message",
                    },
                    "secondary-message": {
                        type: "string",
                        description: "Secondary message text",
                    },
                    "cta-buttons": {
                        type: "array",
                        default: "[]",
                        description: "Call-to-action buttons array",
                    },
                },
                example:
                    '<DomainDashboardHeroSection domain="your-domain" title="My Killboard" welcome-message="Welcome to our operations" />',
            },
            DomainDashboardTimeRangeSelector: {
                description:
                    "Time range selector component (no domain prop required)",
                props: {
                    "model-value": {
                        type: "string",
                        default: "7d",
                        description: "Selected time range (1d, 7d, 14d, 30d)",
                    },
                },
                example:
                    '<DomainDashboardTimeRangeSelector v-model="selectedTimeRange" />',
            },
            DomainDashboardTrackingOverview: {
                description: "Entity tracking overview with avatars and stats",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    entities: {
                        type: "array",
                        required: true,
                        description: "Array of tracked entities",
                    },
                    "entity-stats": {
                        type: "object",
                        description: "Statistics for each entity",
                    },
                },
                example:
                    '<DomainDashboardTrackingOverview domain="your-domain" :entities="entities" :entity-stats="stats" />',
            },
            DomainDashboardCampaignsSection: {
                description: "Displays active campaigns grid",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    campaigns: {
                        type: "array",
                        required: true,
                        description: "Array of campaign objects",
                    },
                },
                example:
                    '<DomainDashboardCampaignsSection domain="your-domain" :campaigns="campaigns" />',
            },
            DomainDashboardMostValuableSection: {
                description: "Most valuable kills section",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "most-valuable-kills": {
                        type: "array",
                        description: "Array of valuable killmail objects",
                    },
                    loading: {
                        type: "boolean",
                        default: false,
                        description: "Loading state",
                    },
                    "selected-entity": {
                        type: "string",
                        description: "Selected entity label",
                    },
                    "time-range-label": {
                        type: "string",
                        default: "7 days",
                        description: "Time range label",
                    },
                },
                example:
                    '<DomainDashboardMostValuableSection domain="your-domain" :most-valuable-kills="kills" />',
            },
            DomainDashboardShipAnalysisSection: {
                description: "Ship destruction analysis section",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    stats: {
                        type: "object",
                        required: true,
                        description: "Ship statistics object",
                    },
                    loading: {
                        type: "boolean",
                        default: false,
                        description: "Loading state",
                    },
                    "selected-entity": {
                        type: "string",
                        description: "Selected entity label",
                    },
                    "time-range-label": {
                        type: "string",
                        default: "7 days",
                        description: "Time range label",
                    },
                },
                example:
                    '<DomainDashboardShipAnalysisSection domain="your-domain" :stats="shipStats" />',
            },
            DomainDashboardRecentActivitySection: {
                description: "Recent killmails activity section",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "api-endpoint": {
                        type: "string",
                        required: true,
                        description: "API endpoint for killmails",
                    },
                    limit: {
                        type: "number",
                        default: 100,
                        description: "Number of kills to display",
                    },
                    "selected-entity": {
                        type: "string",
                        description: "Selected entity label",
                    },
                    "refresh-key": {
                        type: "number",
                        default: 0,
                        description: "Refresh key for updates",
                    },
                },
                example:
                    '<DomainDashboardRecentActivitySection domain="your-domain" api-endpoint="/api/kills" />',
            },
            DomainDashboardTopBoxesSection: {
                description: "Top killers sidebar section",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "top-killers-by-character": {
                        type: "array",
                        description: "Top character killers",
                    },
                    "top-killers-by-corporation": {
                        type: "array",
                        description: "Top corporation killers",
                    },
                    "top-killers-by-alliance": {
                        type: "array",
                        description: "Top alliance killers",
                    },
                    loading: {
                        type: "boolean",
                        default: false,
                        description: "Loading state",
                    },
                    days: {
                        type: "number",
                        default: 7,
                        description: "Number of days for the time range",
                    },
                },
                example:
                    '<DomainDashboardTopBoxesSection domain="your-domain" :top-killers-by-character="topKillers" />',
            },
            DomainDashboardStatsGrid: {
                description:
                    "Display complete statistics grid with all four stat cards",
                props: {
                    domain: {
                        type: "string",
                        required: true,
                        description: "Domain identifier",
                    },
                    "time-range": {
                        type: "string",
                        default: "7d",
                        description: "Time range for statistics",
                    },
                    stats: {
                        type: "object",
                        required: false,
                        description: "Statistics data object",
                    },
                    entities: {
                        type: "array",
                        default: [],
                        description: "Domain entities array",
                    },
                    "current-locale": {
                        type: "string",
                        default: "en",
                        description: "Current locale for localization",
                    },
                },
                example:
                    '<DomainDashboardStatsGrid domain="example.com" time-range="7d" :stats="stats" :entities="entities" />',
            },
        };
    }

    /**
     * Validate template and set current template
     */
    function setTemplate(template: string, css?: string) {
        isParsingTemplate.value = true;
        templateErrors.value = [];

        try {
            const parsed = parseTemplate(template);

            if (!parsed.isValid) {
                templateErrors.value = parsed.errors;
                return false;
            }

            currentTemplate.value = template;
            if (css !== undefined) {
                customCss.value = css;
            }

            return true;
        } catch (error) {
            templateErrors.value = [
                `Error setting template: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
            ];
            return false;
        } finally {
            isParsingTemplate.value = false;
        }
    }

    /**
     * Parse current template
     */
    const parsedTemplate = computed(() => {
        if (!currentTemplate.value) {
            return {
                components: [],
                customHtml: "",
                isValid: false,
                errors: ["No template set"],
            };
        }

        return parseTemplate(currentTemplate.value);
    });

    /**
     * Check if current template is valid
     */
    const isTemplateValid = computed(() => parsedTemplate.value.isValid);

    /**
     * Get component documentation
     */
    const componentDocs = computed(() => generateComponentDocs());

    /**
     * Load template from domain context (SSR) or API fallback
     */
    async function loadTemplate(domain: string) {
        try {
            // First try to get template from SSR context (preferred)
            if (process.server || typeof window === "undefined") {
                // During SSR, template should already be available in domain context
                return null; // Let the component handle domain context directly
            }

            // Client-side fallback for cases where domain context isn't available
            const nuxtApp = useNuxtApp();
            const domainContext =
                nuxtApp.ssrContext?.event?.context?.domainContext;

            if (domainContext?.dashboardTemplate) {
                return {
                    template: domainContext.dashboardTemplate.template,
                    customCss: domainContext.dashboardTemplate.customCss || "",
                    isDefault:
                        domainContext.dashboardTemplate.isDefault || false,
                };
            }

            // Final fallback: API call (only when domain context is not available)
            const templateData = await $fetch<any>(
                `/api/domain/${domain}/template`
            );

            // The API returns { template, customCss, isDefault } object
            if (
                templateData &&
                typeof templateData === "object" &&
                templateData.template
            ) {
                return {
                    template: templateData.template,
                    customCss: templateData.customCss || "",
                    isDefault: templateData.isDefault || false,
                };
            }

            // Fallback for old string format (backward compatibility)
            if (templateData && typeof templateData === "string") {
                return {
                    template: templateData,
                    customCss: "",
                    isDefault: templateData.includes(
                        "DEFAULT TEMPLATE LOADED SUCCESSFULLY"
                    ),
                };
            }

            return null;
        } catch (error) {
            console.error("Failed to load template:", error);
            return null;
        }
    }

    /**
     * Save template to API
     */
    async function saveTemplate(
        domain: string,
        template: string,
        css?: string
    ) {
        // Clean the template content first
        const cleanTemplate = template
            .replace(/\\n/g, "\n") // Convert escaped newlines to actual newlines
            .replace(/\\"/g, '"') // Convert escaped quotes to actual quotes
            .replace(/\\041/g, "!") // Convert octal escape sequences
            .replace(/\\\\/g, "\\"); // Fix double-escaped backslashes

        // Encode template and CSS as base64 to avoid JSON parsing issues
        const encodedTemplate = btoa(cleanTemplate);
        const encodedCss = btoa(css || "");

        const requestBody = {
            name: "Custom Dashboard",
            template: encodedTemplate,
            customCss: encodedCss,
            description: "Custom dashboard template",
            // Flag to indicate base64 encoding
            encoded: true,
        };

        const { success } = await $fetch(`/api/domain/${domain}/template`, {
            method: "POST",
            body: requestBody,
        });
        return success;
    }

    /**
     * Load template presets (return hardcoded presets for now)
     */
    async function loadPresets() {
        // Return some built-in template presets
        return [
            {
                id: "default",
                title: "Default Layout",
                description:
                    "Standard dashboard with hero section, stats grid, tracking overview, campaigns, most valuable kills, ship analysis, and recent activity with top boxes",
                template: generateDefaultTemplate("example.domain", "7d"),
                customCss: `/* Dashboard Container */
.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    padding-top: 2rem;
}

/* Time Range Section */
.time-range-section {
    margin-bottom: 2rem;
}

/* Metrics Grid Layout - Force Grid Display */
.dashboard-container .metrics-grid {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 4rem;
    align-items: stretch;
}

/* Responsive grid breakpoints */
@media (min-width: 640px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.5rem;
    }
}

/* Grid items - equal height and proper display */
.dashboard-container .metrics-grid-item {
    display: flex;
    width: 100%;
    min-height: 200px;
}

/* Metric boxes - expand to fill container completely */
.dashboard-container .metric-box,
.dashboard-container .metrics-grid-item > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 200px;
}

/* Dashboard sections spacing */
.dashboard-section {
    margin-bottom: 3rem;
}

/* Bottom section - 80/20 split layout */
.bottom-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

/* Responsive 80/20 split for larger screens */
@media (min-width: 1280px) {
    .bottom-grid {
        grid-template-columns: 4fr 1fr;
        gap: 2rem;
    }
}

/* Kill list section (80% width on large screens) */
.kill-list-section {
    width: 100%;
    min-width: 0;
}

/* Top boxes section (20% width on large screens) */
.top-boxes-section {
    width: 100%;
    min-width: 0;
}`,
            },
            {
                id: "minimal",
                title: "Minimal Layout",
                description:
                    "Clean, minimal dashboard with essential stats only - no hero section or extra sections",
                template: `<!-- Minimal Dashboard -->
<div class="dashboard-container">
  <!-- Time Range Selector -->
  <div class="time-range-section">
    <DomainDashboardTimeRangeSelector v-model="selectedTimeRange" />
  </div>

  <!-- Statistics Grid - 4 Key Metrics in Row -->
  <div class="metrics-grid">
    <div class="metrics-grid-item">
      <DomainDashboardTotalKillsBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Total Kills"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardISKDestroyedBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="ISK Destroyed"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardTopShipBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Most Destroyed"
        count-label="destroyed"
        :show-ship-icon="true"
        size="md"
        class="metric-box" />
    </div>

    <div class="metrics-grid-item">
      <DomainDashboardActiveEntitiesBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Active Entities"
        entity-type="all"
        size="md"
        class="metric-box" />
    </div>
  </div>

  <!-- Recent Activity Section -->
  <div class="dashboard-section">
    <DomainDashboardRecentActivitySection
      domain="example.domain"
      :api-endpoint="killmailsEndpoint"
      :selected-entity="selectedEntityLabel"
      title="Recent Killmails"
      description="Latest combat activity and killmail reports" />
  </div>
</div>`,
                customCss: `/* Minimal styling */
.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    padding-top: 2rem;
}

.time-range-section {
    margin-bottom: 2rem;
}

.dashboard-container .metrics-grid {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 3rem;
    align-items: stretch;
}

@media (min-width: 640px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.5rem;
    }
}

.dashboard-container .metrics-grid-item {
    display: flex;
    width: 100%;
    min-height: 180px;
}

.dashboard-container .metric-box,
.dashboard-container .metrics-grid-item > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 180px;
}

.dashboard-section {
    margin-bottom: 2rem;
}`,
            },
            {
                id: "compact",
                title: "Compact Layout",
                description:
                    "Space-efficient dashboard perfect for smaller screens with condensed components",
                template: `<!-- Compact Dashboard -->
<div class="dashboard-container compact">
  <!-- Statistics Grid - Condensed -->
  <div class="compact-metrics-grid">
    <div class="compact-metric-item">
      <DomainDashboardTotalKillsBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Kills"
        size="sm"
        class="compact-metric-box" />
    </div>

    <div class="compact-metric-item">
      <DomainDashboardISKDestroyedBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="ISK Lost"
        size="sm"
        class="compact-metric-box" />
    </div>

    <div class="compact-metric-item">
      <DomainDashboardTopShipBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Top Ship"
        size="sm"
        class="compact-metric-box" />
    </div>

    <div class="compact-metric-item">
      <DomainDashboardActiveEntitiesBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Active"
        entity-type="all"
        size="sm"
        class="compact-metric-box" />
    </div>
  </div>

  <!-- Recent Activity - Compact -->
  <div class="compact-section">
    <DomainDashboardRecentActivitySection
      domain="example.domain"
      :api-endpoint="killmailsEndpoint"
      :selected-entity="selectedEntityLabel"
      title="Recent Activity"
      description="Latest killmails" />
  </div>
</div>`,
                customCss: `/* Compact styling */
.dashboard-container.compact {
    max-width: 100%;
    margin: 0 auto;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.compact-metrics-grid {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    align-items: stretch;
}

@media (min-width: 768px) {
    .compact-metrics-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1rem;
    }
}

.compact-metric-item {
    display: flex;
    width: 100%;
    min-height: 120px;
}

.compact-metric-box,
.compact-metric-item > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 120px;
    padding: 0.75rem;
}

.compact-section {
    margin-bottom: 1rem;
}`,
            },
            {
                id: "stats-only",
                title: "Stats Only",
                description:
                    "Dashboard showing only the four main statistics boxes - perfect for embedding or minimal displays",
                template: `<!-- Stats Only Dashboard -->
<div class="stats-only-container">
  <!-- Statistics Grid Only -->
  <div class="stats-only-grid">
    <div class="stats-only-item">
      <DomainDashboardTotalKillsBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Total Kills"
        size="lg"
        class="stats-only-box" />
    </div>

    <div class="stats-only-item">
      <DomainDashboardISKDestroyedBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="ISK Destroyed"
        size="lg"
        class="stats-only-box" />
    </div>

    <div class="stats-only-item">
      <DomainDashboardTopShipBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Most Destroyed"
        count-label="destroyed"
        :show-ship-icon="true"
        size="lg"
        class="stats-only-box" />
    </div>

    <div class="stats-only-item">
      <DomainDashboardActiveEntitiesBox
        domain="example.domain"
        :time-range="selectedTimeRange"
        title="Active Entities"
        entity-type="all"
        size="lg"
        class="stats-only-box" />
    </div>
  </div>
</div>`,
                customCss: `/* Stats Only styling */
.stats-only-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

.stats-only-grid {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: stretch;
}

@media (min-width: 640px) {
    .stats-only-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 2rem;
    }
}

@media (min-width: 1024px) {
    .stats-only-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 2rem;
    }
}

.stats-only-item {
    display: flex;
    width: 100%;
    min-height: 250px;
}

.stats-only-box,
.stats-only-item > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 250px;
    padding: 2rem;
    background: rgba(31, 41, 55, 0.8);
    border: 1px solid rgba(75, 85, 99, 0.3);
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}`,
            }
        ];
    }

    return {
        // State - make these writable for the customizer component
        currentTemplate,
        customCss,
        templateErrors,
        isParsingTemplate,

        // Computed
        parsedTemplate,
        isTemplateValid,
        componentDocs,

        // Methods
        parseTemplate,
        generateDefaultTemplate,
        setTemplate,
        generateComponentDocs,
        loadTemplate,
        saveTemplate,
        loadPresets,
    };
}
