import {
    createError,
    defineEventHandler,
    getCookie,
    getRouterParam,
    readRawBody,
} from "h3";
import { CustomDomainService } from "~/server/services";

export default defineEventHandler(async (event) => {
    const method = event.node.req.method;
    const url = event.node.req.url;

    const domain = getRouterParam(event as any, "domain");

    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter is required",
        });
    }

    try {
        if (method === "GET") {
            return handleGetTemplate(domain);
        } else if (method === "POST") {
            return handlePostTemplate(event, domain);
        } else {
            throw createError({
                statusCode: 405,
                statusMessage: "Method not allowed",
            });
        }
    } catch (error: any) {
        // If it's already an HTTP error, re-throw it
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Internal server error",
            message: error.message || "An unexpected error occurred",
        });
    }
});

// GET handler - Load template
async function handleGetTemplate(domain: string) {
    // Default template function - professional dashboard layout
    const getDefaultTemplate = (domain: string) => {
        const template = `<!-- Hero Section -->
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
</div>`;

        const customCss = `/* Dashboard Container */
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
    margin-bottom: 4rem; /* Increased space after metrics grid */
    align-items: stretch; /* Ensure all grid items stretch to same height */
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
    display: flex; /* Use flex to ensure child components fill height */
    width: 100%;
    min-height: 200px; /* Set minimum height for consistency */
}

/* Metric boxes - expand to fill container completely */
.dashboard-container .metric-box,
.dashboard-container .metrics-grid-item > * {
    flex: 1; /* Fill available space */
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 200px; /* Ensure minimum height */
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
    min-width: 0; /* Prevent flex item from overflowing */
}

/* Top boxes section (20% width on large screens) */
.top-boxes-section {
    width: 100%;
    min-width: 0; /* Prevent flex item from overflowing */
}`;

        return {
            template,
            customCss,
            isDefault: true,
        };
    };

    try {
        // Look for domain configuration
        const domainConfig = await CustomDomainService.findByDomainActiveVerified(
            domain.toLowerCase()
        );

        if (
            domainConfig?.dashboard_template?.enabled &&
            domainConfig?.dashboard_template?.html_template
        ) {
            return {
                template: domainConfig.dashboard_template.html_template,
                customCss: domainConfig.dashboard_template.custom_css || "",
                isDefault: false,
            };
        }

        // If no custom template exists, return default template
        return getDefaultTemplate(domain);
    } catch (error) {
        // Return default template on error
        return getDefaultTemplate(domain);
    }
}

// POST handler - Save template
async function handlePostTemplate(event: any, domain: string) {
    try {
        // Parse the request body with error handling
        let body;
        try {
            // Use raw body parsing to avoid h3's comment-sensitive JSON parser
            const rawBody = await readRawBody(event);
            if (!rawBody) {
                throw new Error("Empty request body");
            }

            // Convert to string and parse JSON manually
            const bodyString =
                typeof rawBody === "string"
                    ? rawBody
                    : new TextDecoder().decode(rawBody);
            body = JSON.parse(bodyString);
        } catch (bodyError) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid JSON in request body",
            });
        }

        const { name, template, description, customCss, encoded } = body;

        // Decode base64 content if encoded flag is present
        let decodedTemplate = template;
        let decodedCss = customCss || "";

        if (encoded) {
            try {
                decodedTemplate = atob(template);
                decodedCss = customCss ? atob(customCss) : "";
            } catch (decodeError) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid base64 content",
                });
            }
        } else {
            // Legacy support: decode HTML entities for old requests
            decodedTemplate =
                template
                    ?.replace(/&lt;!--/g, "<!--")
                    ?.replace(/--&gt;/g, "-->") || "";
        }

        if (!name || !decodedTemplate) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Template name and template content are required",
            });
        }

        // Validate template content length
        if (decodedTemplate.length > 50000) {
            throw createError({
                statusCode: 400,
                statusMessage: "Template content too large (max 50KB)",
            });
        }

        // Validate name length
        if (name.length > 100) {
            throw createError({
                statusCode: 400,
                statusMessage: "Template name too long (max 100 characters)",
            });
        }

        // Authentication check
        const eveloginCookie = getCookie(event, "evelogin");
        if (!eveloginCookie) {
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication required",
            });
        }

        // Get user session
        const session = await $fetch("/api/auth/me", {
            headers: {
                cookie: `evelogin=${eveloginCookie}`,
            },
        });

        if (!session || !session.authenticated) {
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
            });
        }

        const user = session.user;

        // Get domain configuration to verify access and ownership
        const domainConfig = await CustomDomainService.findByDomainActiveVerified(
            domain.toLowerCase()
        );

        if (!domainConfig) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found or not active",
            });
        }

        // Check if user owns the domain
        if (domainConfig.owner_character_id !== user?.characterId) {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "You do not have permission to modify this domain's templates",
            });
        }

        const templateData: any = {
            enabled: true,
            html_template: decodedTemplate,
            custom_css: decodedCss || "",
            template_name: name,
            template_description: description || "",
            template_version: "1.0",
            updated_at: new Date(),
        };

        // If this is the first template, set created_at
        if (
            !domainConfig.dashboard_template?.enabled ||
            !domainConfig.dashboard_template?.html_template
        ) {
            templateData.created_at = new Date();
        } else {
            // Keep existing created_at
            templateData.created_at =
                domainConfig.dashboard_template.created_at || new Date();
        }

        // Update the domain with the single template
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
            {
                $set: {
                    dashboard_template: templateData,
                    updated_at: new Date(),
                },
            },
            {
                new: true,
                select: "dashboard_template",
            }
        );

        if (!updatedDomain) {
            throw createError({
                statusCode: 404,
                statusMessage: "Domain not found",
            });
        }

        return {
            success: true,
            template: {
                name: templateData.template_name,
                template: templateData.html_template,
                customCss: templateData.custom_css,
                description: templateData.template_description,
                created_at: templateData.created_at,
                updated_at: templateData.updated_at,
            },
            message:
                domainConfig.dashboard_template?.enabled &&
                domainConfig.dashboard_template?.html_template
                    ? "Template updated successfully"
                    : "Template created successfully",
        };
    } catch (error: any) {
        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Error saving dashboard template",
            message: error.message || "Error saving dashboard template",
        });
    }
}
