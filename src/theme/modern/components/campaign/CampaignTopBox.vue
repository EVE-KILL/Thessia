<script setup lang="ts">
interface Entity {
    id?: number;
    character_id?: number;
    character_name?: string;
    name?: string;
    kills?: number;
    damageDone?: number;
    [key: string]: any;
}

const props = defineProps({
    title: { type: String, required: true },
    entities: { type: Array, default: () => [] },
    countField: { type: String, default: 'kills' },
    countTitle: { type: String, default: '' },
    entityType: { type: String, default: 'character' },
    loading: { type: Boolean, default: false },
    limit: { type: Number, default: 10 },
});

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Get the title for the count column
const countColumnTitle = computed(() => {
    if (props.countTitle) return props.countTitle;

    // Default titles based on countField
    const titleMap = {
        'kills': t('kills'),
        'damageDone': t('damage'),
    };

    return titleMap[props.countField] || t('count');
});

// Format numbers with commas (for kills)
const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(currentLocale.value).format(num);
};

// Format number with abbreviations (for damage)
const formatAbbreviated = (num: number): string => {
    if (num >= 1000000000) {
        return `${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    } else {
        return `${num}`;
    }
};

// Format the count value based on the count field type
const formatCountValue = (value: number): string => {
    if (props.countField === 'damageDone') {
        return formatAbbreviated(value);
    } else {
        return formatNumber(value);
    }
};

// Mapping of entity types to image types for the Image component
const imageTypeMap = {
    character: "character",
    corporation: "corporation",
    alliance: "alliance",
    ship: "type-render",
    solarsystem: "system",
    constellation: "constellation",
    region: "region",
};

const getEntityId = (entity: Entity): number => {
    if (!entity) return 0;

    // Try to get ID based on entity type
    const idFieldMap = {
        character: "character_id",
        corporation: "corporation_id",
        alliance: "alliance_id",
        ship: "type_id",
    };

    const idField = idFieldMap[props.entityType];
    if (idField && entity[idField]) {
        return entity[idField];
    }

    // Fallbacks
    if (entity.id) return entity.id;
    if (entity.character_id) return entity.character_id;

    return 0;
};

const getEntityName = (entity: Entity): string => {
    // Try to get name based on entity type
    const nameFieldMap = {
        character: "character_name",
        corporation: "corporation_name",
        alliance: "alliance_name",
    };

    const nameField = nameFieldMap[props.entityType];
    if (nameField && entity[nameField]) {
        return entity[nameField];
    }

    // Fallbacks
    if (entity.name) return entity.name;
    if (entity.character_name) return entity.character_name;

    return t('unknown');
};

const getEntityCount = (entity: Entity): number | string => {
    return formatCountValue(Number(entity[props.countField] ?? 0));
};

const getUrlPath = (type: string): string => {
    const urlPathMap = {
        solarsystem: "system",
        ship: "item",
    };

    return urlPathMap[type] || type;
};

const generateEntityLink = (item: Entity): string | null => {
    if (!item || props.loading) return null;
    const id = getEntityId(item);
    if (!id) return null;
    return `/${getUrlPath(props.entityType)}/${id}`;
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

// Prepare data for table
const tableItems = computed(() => {
    if (props.loading) return skeletonRows.value;

    return props.entities.slice(0, props.limit).map(entity => ({
        ...entity,
        displayName: getEntityName(entity),
        displayCount: getEntityCount(entity),
        entityId: getEntityId(entity),
        rawCount: entity[props.countField] || 0
    }));
});

// Column definitions with count column title
const tableColumns = [
    {
        id: "entity",
        header: props.title,
        headerClass: "title-header",
        width: "75%",
    },
    {
        id: "count",
        header: countColumnTitle.value,
        headerClass: "count-header",
        width: "25%",
        cellClass: "text-right",
    },
];
</script>

<template>
    <div class="min-h-[240px]">
        <Table :columns="tableColumns" :items="tableItems" :loading="loading" :skeleton-count="limit"
            :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'" :density="'compact'" :striped="false"
            :bordered="true" :special-header="true" background="transparent" :link-fn="generateEntityLink"
            header-class="topbox-header">
            <!-- Style the title header -->
            <template #header-entity>
                <div class="title-text">{{ title }}</div>
            </template>

            <!-- Style the count header -->
            <template #header-count>
                <div class="count-title-text">{{ countColumnTitle }}</div>
            </template>

            <!-- Entity cell template with truncation -->
            <template #cell-entity="{ item }">
                <div class="flex items-center py-1">
                    <Image v-if="!item.isLoading" :type="imageTypeMap[entityType]" :id="item.entityId"
                        :alt="`${entityType}: ${item.displayName}`" class="w-7 flex-shrink-0 mr-2" size="32"
                        format="webp" />
                    <div v-else class="w-7 h-7 flex-shrink-0 mr-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse">
                    </div>

                    <!-- Entity name with truncation -->
                    <div class="text-sm text-left text-black dark:text-white truncate max-w-full">
                        {{ item.displayName }}
                    </div>
                </div>
            </template>

            <!-- Count cell template with right aligned formatted values -->
            <template #cell-count="{ item }">
                <div class="count-value">
                    {{ item.displayCount }}
                </div>
            </template>

            <!-- Custom skeleton -->
            <template #skeleton>
                <div v-for="i in limit" :key="`skeleton-${i}`"
                    class="table-row density-compact bordered bg-transparent skeleton-row">
                    <!-- Entity column skeleton -->
                    <div class="body-cell entity" style="width: 75%; display: flex; align-items: center;">
                        <div class="flex items-center py-1 w-full">
                            <div class="w-7 h-7 flex-shrink-0 mr-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse">
                            </div>
                            <div class="h-4 w-24 max-w-[70%] bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    </div>

                    <!-- Count column skeleton -->
                    <div class="body-cell count"
                        style="width: 25%; display: flex; justify-content: flex-end; align-items: center;">
                        <div class="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2"></div>
                    </div>
                </div>
            </template>
        </Table>
    </div>
</template>

<style scoped>
.topbox-header {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5));
    padding: 0.5rem 1rem;
    border-bottom: none;
}

.title-text {
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: light-dark(#111827, white);
}

/* Style for count column title */
.count-title-text {
    width: 100%;
    text-align: right;
    font-size: 0.75rem;
    font-weight: 600;
    color: light-dark(#111827, white);
    padding-right: 0.5rem;
}

/* Make count header visible */
:deep(.count-header) {
    visibility: visible !important;
    width: 25%;
    text-align: right;
}

:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Animation for skeleton loading */
.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

/* Enhanced right alignment for count values */
:deep(.count-value) {
    text-align: right;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1rem;
    color: var(--background-200);
    padding-right: 0.5rem;
    white-space: nowrap;
    width: 100%;
    display: block;
}

/* Fix entity cell - ensure text truncation works properly */
.body-cell.entity {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Ensure entity name truncation */
:deep(.cell-entity) {
    overflow: hidden;
    max-width: 100%;
}

:deep(.cell-entity > div) {
    overflow: hidden;
    white-space: nowrap;
}

/* Structure the cells properly */
.body-cell.count {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: 0;
}

/* Ensure count values are right-aligned */
:deep(.cell-count) {
    text-align: right !important;
    display: flex !important;
    justify-content: flex-end !important;
    align-items: center !important;
    padding-right: 0 !important;
}

/* Force right alignment for all count cells */
:deep(td[data-v-column="count"]) {
    text-align: right !important;
}

.skeleton-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
}

:deep(.text-sm) {
    font-size: 0.9rem;
    line-height: 1rem;
}
</style>
