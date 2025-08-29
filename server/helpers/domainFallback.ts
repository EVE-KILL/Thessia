/**
 * Domain fallback and error handling system
 * Provides graceful degradation for invalid, expired, or problematic custom domains
 */

export interface FallbackResult {
    shouldFallback: boolean;
    reason?: string;
    redirectTo?: string;
    statusCode?: number;
    context?: IDomainContext;
}

export interface DomainHealthCheck {
    isHealthy: boolean;
    issues: string[];
    lastChecked: Date;
    recommendedAction: "continue" | "warn" | "fallback" | "suspend";
}

class DomainFallbackHandler {
    private readonly healthCheckCache = new Map<string, DomainHealthCheck>();
    private readonly fallbackReasons = {
        DOMAIN_NOT_FOUND: "Domain configuration not found",
        DOMAIN_SUSPENDED: "Domain has been suspended",
        DOMAIN_EXPIRED: "Domain verification has expired",
        DNS_VERIFICATION_FAILED: "DNS verification failed",
        ENTITY_NOT_FOUND: "Associated entity not found",
        RATE_LIMITED: "Domain rate limit exceeded",
        INVALID_CONFIGURATION: "Invalid domain configuration",
        MAINTENANCE_MODE: "Domain in maintenance mode",
        SSL_ERROR: "SSL certificate issues",
        GEOGRAPHIC_RESTRICTION: "Geographic access restriction",
    };

    /**
     * Check if domain should fallback to main site
     */
    async shouldFallbackDomain(
        domain: string,
        context?: IDomainContext
    ): Promise<FallbackResult> {
        try {
            // Quick health check from cache first
            const cachedHealth = this.healthCheckCache.get(domain);
            if (cachedHealth && this.isCacheValid(cachedHealth, 300)) {
                // 5 minute cache
                if (
                    !cachedHealth.isHealthy &&
                    cachedHealth.recommendedAction === "fallback"
                ) {
                    return {
                        shouldFallback: true,
                        reason: cachedHealth.issues.join(", "),
                        statusCode: 503,
                    };
                }
            }

            // If no context provided, try to fetch from cache/database
            if (!context) {
                const cachedContext = await domainCache.getDomain(domain);
                if (!cachedContext) {
                    return {
                        shouldFallback: true,
                        reason: this.fallbackReasons.DOMAIN_NOT_FOUND,
                        statusCode: 404,
                    };
                }
                context = cachedContext;
            }

            // Perform comprehensive health check
            const healthCheck = await this.performHealthCheck(domain, context);
            this.healthCheckCache.set(domain, healthCheck);

            // Determine fallback action
            switch (healthCheck.recommendedAction) {
                case "fallback":
                    return {
                        shouldFallback: true,
                        reason: healthCheck.issues.join(", "),
                        statusCode: this.getStatusCodeForIssues(
                            healthCheck.issues
                        ),
                        context,
                    };

                case "warn":
                    // Continue but log warning
                    console.warn(
                        `Domain ${domain} has issues but continuing:`,
                        healthCheck.issues
                    );
                    return {
                        shouldFallback: false,
                        context,
                    };

                case "suspend":
                    // Suspend domain and fallback
                    await this.suspendDomain(domain, healthCheck.issues);
                    return {
                        shouldFallback: true,
                        reason: "Domain suspended due to critical issues",
                        statusCode: 503,
                        context,
                    };

                default:
                    return {
                        shouldFallback: false,
                        context,
                    };
            }
        } catch (error) {
            console.error(`Domain fallback check failed for ${domain}:`, error);
            return {
                shouldFallback: true,
                reason: "Internal error during domain validation",
                statusCode: 500,
            };
        }
    }

    /**
     * Perform comprehensive health check on domain
     */
    private async performHealthCheck(
        domain: string,
        context: IDomainContext
    ): Promise<DomainHealthCheck> {
        const issues: string[] = [];
        let recommendedAction: DomainHealthCheck["recommendedAction"] =
            "continue";

        // Check domain status (using correct property names from interface)
        if (context.config?.suspended) {
            issues.push(this.fallbackReasons.DOMAIN_SUSPENDED);
            recommendedAction = "fallback";
        }

        // Check verification status
        if (!context.config?.verified) {
            issues.push(this.fallbackReasons.DOMAIN_EXPIRED);
            recommendedAction = "fallback";
        }

        // Check verification expiry (using created_at as proxy for verification date)
        if (context.config?.created_at) {
            const verificationAge =
                Date.now() - new Date(context.config.created_at).getTime();
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            if (verificationAge > maxAge) {
                issues.push("Domain verification expired");
                recommendedAction = "warn"; // Give grace period
            }
        }

        // Check entity existence
        if (context.entity) {
            try {
                // This would check if the entity still exists in the database
                const entityExists = await this.checkEntityExists(
                    context.entityType || "unknown",
                    context.entity.id
                );
                if (!entityExists) {
                    issues.push(this.fallbackReasons.ENTITY_NOT_FOUND);
                    recommendedAction = "fallback";
                }
            } catch (error) {
                issues.push("Failed to verify entity existence");
                recommendedAction = "warn";
            }
        }

        // Check rate limiting (using correct property names from interface)
        if (context.config?.rate_limit) {
            const isRateLimited = await this.checkRateLimit(
                domain,
                context.config.rate_limit
            );
            if (isRateLimited) {
                issues.push(this.fallbackReasons.RATE_LIMITED);
                recommendedAction = "warn"; // Temporary issue
            }
        }

        // Check DNS configuration (async, don't block)
        this.checkDNSConfiguration(domain).catch((error) => {
            console.warn(`DNS check failed for ${domain}:`, error);
        });

        return {
            isHealthy: issues.length === 0,
            issues,
            lastChecked: new Date(),
            recommendedAction,
        };
    }

    /**
     * Check if entity still exists
     */
    private async checkEntityExists(
        entityType: string,
        entityId: number
    ): Promise<boolean> {
        try {
            // This would query your database to check entity existence
            // For now, return true as placeholder
            return true;
        } catch (error) {
            console.error(
                `Failed to check entity existence: ${entityType}/${entityId}`,
                error
            );
            return false;
        }
    }

    /**
     * Check domain rate limiting
     */
    private async checkRateLimit(
        domain: string,
        rateLimitConfig: any
    ): Promise<boolean> {
        try {
            const key = `rate_limit:${domain}`;
            // For now, return false as we don't have Redis storage available
            // This would be implemented with your actual storage solution
            return false;
        } catch (error) {
            console.error(`Rate limit check failed for ${domain}:`, error);
            return false;
        }
    }

    /**
     * Check DNS configuration (async)
     */
    private async checkDNSConfiguration(domain: string): Promise<void> {
        try {
            // This would perform DNS lookup to verify CNAME record
            // Implementation would depend on DNS library
            console.log(`Checking DNS for ${domain}`);
        } catch (error) {
            console.error(`DNS check failed for ${domain}:`, error);
        }
    }

    /**
     * Suspend domain due to critical issues
     */
    private async suspendDomain(
        domain: string,
        reasons: string[]
    ): Promise<void> {
        try {
            // This would update the domain status in database
            console.warn(`Suspending domain ${domain} due to:`, reasons);

            // Invalidate cache
            await domainCache.invalidateDomain(domain);

            // Log suspension event
            await this.logDomainEvent(domain, "suspended", reasons);
        } catch (error) {
            console.error(`Failed to suspend domain ${domain}:`, error);
        }
    }

    /**
     * Log domain events for monitoring
     */
    private async logDomainEvent(
        domain: string,
        event: string,
        details: any[]
    ): Promise<void> {
        try {
            const logEntry = {
                domain,
                event,
                details,
                timestamp: new Date(),
                userAgent: "", // Would get from request headers
                ip: "", // Would get from request
            };

            // Store in monitoring system or database
            console.log("Domain event:", logEntry);
        } catch (error) {
            console.error(`Failed to log domain event:`, error);
        }
    }

    /**
     * Get HTTP status code based on issues
     */
    private getStatusCodeForIssues(issues: string[]): number {
        if (issues.some((issue) => issue.includes("not found"))) {
            return 404;
        }
        if (
            issues.some(
                (issue) =>
                    issue.includes("suspended") || issue.includes("expired")
            )
        ) {
            return 503;
        }
        if (issues.some((issue) => issue.includes("rate limit"))) {
            return 429;
        }
        return 503; // Default service unavailable
    }

    /**
     * Check if health check cache is still valid
     */
    private isCacheValid(
        healthCheck: DomainHealthCheck,
        maxAgeSeconds: number
    ): boolean {
        const age = (Date.now() - healthCheck.lastChecked.getTime()) / 1000;
        return age < maxAgeSeconds;
    }

    /**
     * Generate fallback redirect URL
     */
    generateFallbackUrl(originalUrl: string, context?: IDomainContext): string {
        try {
            const url = new URL(originalUrl);

            // If we have context, redirect to entity page on main site
            if (context?.entity) {
                return `https://eve-kill.com/entity/${context.entityType}/${
                    context.entity.id
                }${url.pathname !== "/" ? url.pathname : ""}${url.search}`;
            }

            // Default fallback to main site
            return `https://eve-kill.com${
                url.pathname !== "/" ? url.pathname : ""
            }${url.search}`;
        } catch (error) {
            console.error("Failed to generate fallback URL:", error);
            return "https://eve-kill.com";
        }
    }

    /**
     * Create fallback error page content
     */
    createFallbackErrorPage(domain: string, reason: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Temporarily Unavailable - ${domain}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .error-container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
            max-width: 500px;
            margin: 1rem;
        }
        .error-title {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        .error-message {
            font-size: 1.1rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .fallback-button {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
        }
        .fallback-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .domain-info {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-title">Service Temporarily Unavailable</h1>
        <p class="error-message">
            The custom domain <strong>${domain}</strong> is currently experiencing issues.
            <br><br>
            <em>${reason}</em>
        </p>
        <a href="https://eve-kill.com" class="fallback-button">
            Continue to EVE-KILL
        </a>
        <div class="domain-info">
            Domain administrators can check their domain settings for more information.
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get health check statistics
     */
    getHealthStats(): {
        totalChecks: number;
        healthyDomains: number;
        issues: Record<string, number>;
    } {
        const stats = {
            totalChecks: this.healthCheckCache.size,
            healthyDomains: 0,
            issues: {} as Record<string, number>,
        };

        for (const [domain, health] of this.healthCheckCache.entries()) {
            if (health.isHealthy) {
                stats.healthyDomains++;
            }

            health.issues.forEach((issue) => {
                stats.issues[issue] = (stats.issues[issue] || 0) + 1;
            });
        }

        return stats;
    }

    /**
     * Clear health check cache
     */
    clearHealthCache(): void {
        this.healthCheckCache.clear();
    }
}

// Export singleton instance
export const domainFallbackHandler = new DomainFallbackHandler();

// Export middleware helper
export const withFallbackCheck = async (
    domain: string,
    context?: IDomainContext
) => {
    const fallbackResult = await domainFallbackHandler.shouldFallbackDomain(
        domain,
        context
    );

    if (fallbackResult.shouldFallback) {
        const redirectUrl = domainFallbackHandler.generateFallbackUrl(
            `https://${domain}`,
            fallbackResult.context
        );

        // You would handle the redirect/error response here based on your framework
        const error = new Error(
            fallbackResult.reason || "Service Unavailable"
        ) as any;
        error.statusCode = fallbackResult.statusCode || 503;
        error.data = {
            redirectTo: redirectUrl,
            domain,
            reason: fallbackResult.reason,
        };
        throw error;
    }

    return fallbackResult.context;
};
