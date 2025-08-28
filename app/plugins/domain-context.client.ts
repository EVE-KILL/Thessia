interface DomainDetectionResponse {
    success: boolean;
    domainConfig?: {
        domain: string;
        entity_type: string;
        entity: any;
        [key: string]: any;
    };
}

interface IDomainContext {
    isCustomDomain: boolean;
    domain?: string;
    config?: any;
    entity?: any;
    entityType?: "character" | "corporation" | "alliance";
}

/**
 * Client-side domain context plugin
 * Detects custom domains and initializes domain context on the client
 */
export default defineNuxtPlugin(async () => {
    // Only run on client side
    if (process.server) return;

    // Get the domain context state
    const domainContextState = useState<IDomainContext>("domainContext");

    // Skip if we're already on the main domain
    const hostname = window.location.hostname;
    const isMainDomain =
        hostname === "eve-kill.com" ||
        hostname === "www.eve-kill.com" ||
        hostname === "localhost" ||
        hostname === "127.0.0.1";

    if (isMainDomain) {
        // Clear any existing domain context
        domainContextState.value = { isCustomDomain: false };
        return;
    }

    // Skip if domain context is already set and matches current domain
    if (
        domainContextState.value &&
        "domain" in domainContextState.value &&
        domainContextState.value.domain === hostname
    ) {
        return;
    }

    // Check for custom domain
    try {
        // Check if this is a custom domain by calling our detection API
        const response = await $fetch<DomainDetectionResponse>(
            "/api/domain-detection",
            {
                method: "POST",
                body: { host: hostname },
            }
        );

        if (response.success && response.domainConfig) {
            // Set domain context with proper structure
            domainContextState.value = {
                isCustomDomain: true,
                domain: response.domainConfig.domain,
                entityType: response.domainConfig.entity_type as
                    | "character"
                    | "corporation"
                    | "alliance",
                entity: response.domainConfig.entity,
                config: response.domainConfig,
            };

            console.log(
                "Custom domain detected:",
                response.domainConfig.domain
            );
        } else {
            // Clear domain context if no valid custom domain
            domainContextState.value = { isCustomDomain: false };
        }
    } catch (error) {
        console.error("Failed to detect custom domain:", error);
        // Clear domain context on error
        domainContextState.value = { isCustomDomain: false };
    }
});
