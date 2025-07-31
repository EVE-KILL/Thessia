<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

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

    const dataTypeMap = {
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
const entityImageTypeMap = {
    ships: "item",
    systems: "system",
    constellations: "constellation",
    regions: "region",
    characters: "character",
    corporations: "corporation",
    alliances: "alliance",
};

const entityUrlPathMap = {
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
    const idFieldMap = {
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
        header: displayTitle,
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
    <div class="pb-5 min-h-[485px]">
        <Table :columns="tableColumns" :items="pending ? skeletonRows : (entities || [])" :loading="pending"
            :skeleton-count="props.limit" :empty-text="t('noData')" :empty-icon="'i-lucide-file-text'"
            :density="'compact'" :striped="false" :bordered="true" :special-header="true" background="transparent"
            :link-fn="generateEntityLink" header-class="topbox-header">

            <template #header-entity>
                <div class="title-text">{{ displayTitle }}</div>
            </template>

            <template #cell-entity="{ item }">
                <div class="flex items-center py-1">
                    <Image v-if="!item.isLoading" :type="entityImageTypeMap[props.dataType]" :id="getEntityId(item)"
                        :alt="`${props.dataType}: ${getEntityDisplayName(item)}`" class="w-7 flex-shrink-0 mr-2"
                        size="32" />
                    <div v-else class="w-7 h-7 flex-shrink-0 mr-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse">
                    </div>

                    <div class="text-sm text-left text-black dark:text-white truncate min-w-0 overflow-hidden">
                        {{ getEntityDisplayName(item) }}
                    </div>
                </div>
            </template>

            <template #cell-count="{ item }">
                <div class="text-sm text-right text-background-200 pr-2 whitespace-nowrap">
                    {{ item.count }}
                </div>
            </template>

            <template #mobile-row="{ item }">
                <div class="flex items-center justify-between p-2 w-full">
                    <div class="flex items-center py-1 flex-1 min-w-0">
                        <Image v-if="!item.isLoading" :type="entityImageTypeMap[props.dataType]" :id="getEntityId(item)"
                            :alt="`${props.dataType}: ${getEntityDisplayName(item)}`" class="w-7 flex-shrink-0 mr-2"
                            size="32" />
                        <div v-else
                            class="w-7 h-7 flex-shrink-0 mr-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse">
                        </div>

                        <div class="text-sm text-left text-black dark:text-white truncate min-w-0 overflow-hidden">
                            {{ getEntityDisplayName(item) }}
                        </div>
                    </div>

                    <div class="text-sm text-right text-background-200 whitespace-nowrap ml-4">
                        {{ item.count }}
                    </div>
                </div>
            </template>
        </Table>

        <div v-if="error" class="text-center py-4 text-red-400">
            {{ t('common.error') }}: {{ error.message }}
        </div>

        <div class="text-sm text-center text-background-300 py-1 rounded-br-lg rounded-bl-lg">
            ({{ props.days === 0 ? t('allTime') : t('killsOverLastXDays', { days: props.days }) }})
        </div>
    </div>
</template>

<style scoped>
:deep(.topbox-header) {
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.5)) !important;
    padding: 0.5rem 1rem !important;
    border-bottom: none !important;
}

:deep(.title-header) {
    font-size: 0.875rem !important;
    color: light-dark(#111827, white) !important;
    text-align: center !important;
}

:deep(.title-text) {
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
}

:deep(.count-header) {
    visibility: hidden;
    width: 20%;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
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

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}
</style>
