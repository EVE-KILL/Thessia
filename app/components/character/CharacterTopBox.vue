<script setup lang="ts">

interface ITopEntity {
    id: number;
    name: string | object;
    count: number;
    type_id?: number;
    character_id?: number;
    corporation_id?: number;
    alliance_id?: number;
    system_id?: number;
    constellation_id?: number;
    region_id?: number;
    [key: string]: any;
}

const props = defineProps({
    dataType: { type: String, default: "ships" },
    limit: { type: Number, default: 10 },
    days: { type: Number, default: 7 },
    title: { type: String, default: "" },
    apiUrl: { type: String, required: true },
    icon: { type: String, default: "" },
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

const displayTitle = computed(() => {
    if (props.title) return props.title;

    const dataTypeMap: Record<string, string> = {
        characters: t("topBox.characters"),
        corporations: t("topBox.corporations"),
        alliances: t("topBox.alliances"),
        ships: t("topBox.ships"),
        systems: t("topBox.systems"),
        constellations: t("topBox.constellations"),
        regions: t("topBox.regions"),
    };

    return `${t("topBox.top")} ${props.limit} ${dataTypeMap[props.dataType] || props.dataType}`;
});

const queryParams = computed(() => ({
    dataType: props.dataType,
    limit: props.limit,
    days: props.days,
}));

const {
    data: entities,
    pending,
    error,
} = useFetch<ITopEntity[]>(props.apiUrl, {
    query: queryParams,
    key: `entity-top-${props.dataType}-${props.limit}-${props.days}-${props.apiUrl}`,
});

const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[locale] || obj.en || "";
};

// Entity-specific mappings for character/corporation/alliance APIs
const entityImageTypeMap: Record<string, string> = {
    ships: "item",
    systems: "system",
    constellations: "constellation",
    regions: "region",
    characters: "character",
    corporations: "corporation",
    alliances: "alliance",
};

const entityUrlPathMap: Record<string, string> = {
    ships: "item",
    systems: "system",
    constellations: "constellation",
    regions: "region",
    characters: "character",
    corporations: "corporation",
    alliances: "alliance",
};

const getEntityDisplayName = (entity: ITopEntity): string => {
    if ((props.dataType === "ships" || props.dataType === "regions") && typeof entity.name === "object") {
        return getLocalizedString(entity.name, currentLocale.value);
    }
    return getLocalizedString(entity.name, currentLocale.value);
};

const getEntityId = (entity: ITopEntity): number => {
    if (!entity) return 0;

    // Entity APIs return different field names based on dataType
    const idFieldMap: Record<string, string> = {
        ships: "type_id",
        systems: "system_id",
        constellations: "constellation_id",
        regions: "region_id",
        characters: "character_id",
        corporations: "corporation_id",
        alliances: "alliance_id",
    };

    const idField = idFieldMap[props.dataType];
    const entityId = idField && entity[idField];

    // Fallback to id field if specific field not found
    if (!entityId && entity.id) {
        return entity.id;
    }

    return entityId || 0;
};

const generateSkeletonRows = (count: number) => {
    return Array(count)
        .fill(0)
        .map((_, index) => ({
            id: `skeleton-${index}`,
            isLoading: true,
        }));
};

const skeletonRows = computed(() => generateSkeletonRows(props.limit));

// Generate entity link for navigation
const generateEntityLink = (item: any): string | null => {
    if (item.isLoading) return null;
    const urlPath = entityUrlPathMap[props.dataType] || props.dataType;
    return `/${urlPath}/${getEntityId(item)}`;
};

// Simplified table columns
const tableColumns = [
    {
        id: "entity",
        header: displayTitle.value,
        headerClass: "title-header",
        width: "80%",
    },
    {
        id: "count",
        header: "",
        headerClass: "count-header",
        width: "20%",
        cellClass: "text-right",
    },
];
</script>

<template>
    <div class="topbox-container">
        <Table :columns="tableColumns" :items="pending ? skeletonRows : (entities || [])" :loading="pending"
            :skeleton-count="props.limit" :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'"
            :density="'compact'" :striped="false" :bordered="true" :special-header="true" background="transparent"
            :link-fn="generateEntityLink" header-class="topbox-header">

            <template #header-entity>
                <div class="title-text">{{ displayTitle }}</div>
            </template>

            <template #cell-entity="{ item }">
                <div class="entity-cell">
                    <Image v-if="!(item as any).isLoading" :type="entityImageTypeMap[props.dataType]"
                        :id="getEntityId(item as ITopEntity)"
                        :alt="`${props.dataType}: ${getEntityDisplayName(item as ITopEntity)}`" class="entity-image"
                        size="32" />
                    <div v-else class="entity-skeleton">
                    </div>

                    <div class="entity-name">
                        {{ getEntityDisplayName(item as ITopEntity) }}
                    </div>
                </div>
            </template>

            <template #cell-count="{ item }">
                <div class="count-cell">
                    {{ (item as any).count }}
                </div>
            </template>

            <template #mobile-row="{ item }">
                <div class="mobile-row">
                    <div class="mobile-entity">
                        <Image v-if="!(item as any).isLoading" :type="entityImageTypeMap[props.dataType]"
                            :id="getEntityId(item as ITopEntity)"
                            :alt="`${props.dataType}: ${getEntityDisplayName(item as ITopEntity)}`" class="entity-image"
                            size="32" />
                        <div v-else class="entity-skeleton">
                        </div>

                        <div class="entity-name">
                            {{ getEntityDisplayName(item as ITopEntity) }}
                        </div>
                    </div>

                    <div class="mobile-count">
                        {{ (item as any).count }}
                    </div>
                </div>
            </template>
        </Table>

        <div v-if="error" class="error-message">
            {{ t('common.error') }}: {{ error.message }}
        </div>

        <div class="time-period">
            ({{ props.days === 0 ? t('allTime') : t('killsOverLastXDays', { days: props.days }) }})
        </div>
    </div>
</template>

<style scoped>
/* Container */
.topbox-container {
    padding-bottom: var(--space-5);
    min-height: 485px;
}

/* Table styling */
:deep(.topbox-header) {
    background-color: var(--color-surface-alpha) !important;
    padding: var(--space-2) var(--space-4) !important;
    border-bottom: none !important;
}

:deep(.title-header) {
    font-size: var(--text-sm) !important;
    color: var(--color-text-primary) !important;
    text-align: center !important;
}

:deep(.title-text) {
    width: 100%;
    text-align: center;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
}

:deep(.count-header) {
    visibility: hidden;
    width: 20%;
}

:deep(tbody tr + tr) {
    border-top: 1px solid var(--color-border-default) !important;
}

:deep(tbody tr):hover {
    background: var(--color-surface-hover);
}

/* Entity cell styling */
.entity-cell {
    display: flex;
    align-items: center;
    padding: var(--space-1) 0;
}

.entity-image {
    width: var(--space-7);
    flex-shrink: 0;
    margin-right: var(--space-2);
}

.entity-skeleton {
    width: var(--space-7);
    height: var(--space-7);
    flex-shrink: 0;
    margin-right: var(--space-2);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface-tertiary);
    animation: pulse var(--duration-slow) ease-in-out infinite;
}

.entity-name {
    font-size: var(--text-sm);
    text-align: left;
    color: var(--color-text-primary);
    truncate: true;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Count cell styling */
.count-cell {
    font-size: var(--text-sm);
    text-align: right;
    color: var(--color-text-secondary);
    padding-right: var(--space-2);
    white-space: nowrap;
}

/* Mobile row styling */
.mobile-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2);
    width: 100%;
}

.mobile-entity {
    display: flex;
    align-items: center;
    padding: var(--space-1) 0;
    flex: 1;
    min-width: 0;
}

.mobile-count {
    font-size: var(--text-sm);
    text-align: right;
    color: var(--color-text-secondary);
    white-space: nowrap;
    margin-left: var(--space-4);
}

/* Error message */
.error-message {
    text-align: center;
    padding: var(--space-4);
    color: var(--color-error-500);
}

/* Time period */
.time-period {
    font-size: var(--text-sm);
    text-align: center;
    color: var(--color-text-tertiary);
    padding: var(--space-1);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

/* Animations */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: var(--opacity-50);
    }
}
</style>
