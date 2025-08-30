import {
    createError,
    defineEventHandler,
    getCookie,
    getQuery,
    getRouterParam,
    readBody,
} from "h3";

export default defineEventHandler(async (event) => {
    const method = event.node.req.method;

    const domain = getRouterParam(event as any, "domain");
    if (!domain) {
        throw createError({
            statusCode: 400,
            statusMessage: "Domain parameter is required",
        });
    }

    if (method === "GET") {
        return handleGetTemplate(domain);
    } else if (method === "POST") {
        return handlePostTemplate(event, domain);
    } else if (method === "DELETE") {
        return handleDeleteTemplate(event, domain);
    } else {
        throw createError({
            statusCode: 405,
            statusMessage: "Method not allowed",
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

/* Metrics Grid Layout */
.metrics-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 3rem;
    align-items: stretch;
}

/* Responsive grid breakpoints */
@media (min-width: 640px) {
    .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .metrics-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
    }
}

/* Grid items - equal height */
.metrics-grid-item {
    width: 100%;
    height: 100%;
    display: flex;
}

/* Metric boxes - expand to fill */
.metric-box {
    flex: 1;
    display: flex;
    flex-direction: column;
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
        const domainConfig = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
            active: true,
            verified: true,
        }).select("dashboard_templates");

        if (domainConfig?.dashboard_templates?.length) {
            // Look for a template named "default" first
            const defaultTemplate = domainConfig.dashboard_templates.find(
                (t: any) => t.name === "default"
            );
            const template =
                defaultTemplate || domainConfig.dashboard_templates[0];

            if (template?.template) {
                return {
                    template: template.template,
                    customCss:
                        (template as any).customCss ||
                        (template as any).custom_css ||
                        "",
                    isDefault: false,
                };
            }
        }

        // If no custom template exists, return default template
        return getDefaultTemplate(domain);
    } catch (error) {
        console.error(
            "[Template GET] Error loading dashboard template:",
            error
        );

        // Return default template on error
        return getDefaultTemplate(domain);
    }
}

// POST handler - Save template
async function handlePostTemplate(event: any, domain: string) {
    try {
        // Parse the request body
        const body = await readBody(event);
        const { name, template, description, customCss } = body;
        if (!name || !template) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Template name and template content are required",
            });
        }

        // Validate template content length
        if (template.length > 50000) {
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
        const domainConfig = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
            active: true,
            verified: true,
        });

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

        // Check if template with this name already exists
        const existingTemplates = domainConfig.dashboard_templates || [];
        const existingTemplate = existingTemplates.find((t) => t.name === name);

        const templateData = {
            name,
            template,
            description: description || "",
            customCss: customCss || "",
            created_at: new Date(),
            updated_at: new Date(),
        };

        if (existingTemplate) {
            // Update existing template
            const templateIndex = existingTemplates.findIndex(
                (t) => t.name === name
            );
            existingTemplates[templateIndex] = {
                ...templateData,
                created_at: existingTemplate.created_at, // Keep original creation date
            };
        } else {
            // Check template limit
            if (existingTemplates.length >= 20) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Maximum 20 templates per domain",
                });
            }

            // Add new template
            existingTemplates.push(templateData);
        }

        // Update the domain with new/updated template
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
            {
                $set: {
                    dashboard_templates: existingTemplates,
                    updated_at: new Date(),
                },
            },
            {
                new: true,
                select: "dashboard_templates",
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
            template: templateData,
            message: existingTemplate
                ? "Template updated successfully"
                : "Template created successfully",
        };
    } catch (error: any) {
        console.error("Error saving dashboard template:", error);

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

// DELETE handler - Delete template
async function handleDeleteTemplate(event: any, domain: string) {
    try {
        // Get query parameters
        const query = getQuery(event);
        const templateName = query.name as string;

        if (!templateName) {
            throw createError({
                statusCode: 400,
                statusMessage: "Template name is required",
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
        const domainConfig = await CustomDomains.findOne({
            domain: domain.toLowerCase(),
            active: true,
            verified: true,
        });

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

        // Check if template exists
        const existingTemplates = domainConfig.dashboard_templates || [];
        const templateIndex = existingTemplates.findIndex(
            (t) => t.name === templateName
        );

        if (templateIndex === -1) {
            throw createError({
                statusCode: 404,
                statusMessage: "Template not found",
            });
        }

        // Remove the template
        const updatedTemplates = existingTemplates.filter(
            (t) => t.name !== templateName
        );

        // Update the domain without the deleted template
        const updatedDomain = await CustomDomains.findOneAndUpdate(
            {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
            {
                $set: {
                    dashboard_templates: updatedTemplates,
                    updated_at: new Date(),
                },
            },
            {
                new: true,
                select: "dashboard_templates",
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
            message: "Template deleted successfully",
            deletedTemplate: templateName,
        };
    } catch (error: any) {
        console.error("Error deleting dashboard template:", error);

        // Forward HTTP errors
        if (error.statusCode) {
            throw error;
        }

        // Otherwise, create a generic error
        throw createError({
            statusCode: 500,
            statusMessage: "Error deleting dashboard template",
            message: error.message || "Error deleting dashboard template",
        });
    }
}
