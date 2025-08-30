import type { IDomainContext } from "../../server/interfaces/ICustomDomain";

// Domain context composable using useState for proper SSR/client state sharing
export const useDomainContext = () => {
    // Use useState for domain context - automatically shared between SSR and client
    const domainContext = useState<IDomainContext | null>(
        "domain-context",
        () => {
            // During SSR, initialize from event context
            if (process.server) {
                const event = useRequestEvent();
                return event?.context?.domainContext || null;
            }
            // On client, this will be hydrated from server state
            return null;
        }
    );

    // Computed properties for easy access to domain context data
    const isCustomDomain = computed(
        () => domainContext.value?.isCustomDomain || false
    );
    const domain = computed(() => domainContext.value?.domain || "");
    const entities = computed(() => domainContext.value?.entities || []);
    const primaryEntity = computed(
        () => domainContext.value?.primaryEntity || null
    );
    const dashboardTemplate = computed(
        () => domainContext.value?.dashboardTemplate || null
    );
    const domainError = computed(() => domainContext.value?.error || null);

    // Navigation from domain config
    const navigation = computed(
        () => domainContext.value?.config?.navigation || null
    );

    // Entity URL helper for custom domains
    const entityUrl = computed(() => {
        if (!isCustomDomain.value || !primaryEntity.value) {
            return "";
        }
        // Return appropriate URL based on entity type
        const entity = primaryEntity.value;
        if (entity.entity_type === "character") {
            return `/character/${entity.character_id}`;
        } else if (entity.entity_type === "corporation") {
            return `/corporation/${entity.corporation_id}`;
        } else if (entity.entity_type === "alliance") {
            return `/alliance/${entity.alliance_id}`;
        }
        return "";
    });

    return {
        domainContext: readonly(domainContext),
        isCustomDomain,
        domain,
        entities,
        primaryEntity,
        dashboardTemplate,
        domainError,
        navigation,
        entityUrl,
    };
};
