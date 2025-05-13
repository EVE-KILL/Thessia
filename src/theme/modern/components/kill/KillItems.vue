<template>
    <Table :columns="columns" :items="data" :loading="!killmail" :row-class="getRowClasses" :bordered="true"
        :striped="false" :hover="true" :density="'compact'" :show-header="true" :special-header="true"
        :empty-icon="'lucide:package'" :empty-text="t('noItems')" background="transparent" :link-fn="generateItemLink"
        class="kill-items-table">
        <!-- Image cell with connector lines for container items -->
        <template #cell-image="{ item }">
            <div class="image-cell" :class="{ 'indented-image': item.isNested }">
                <template v-if="item.isNested">
                    <div class="connector-line">
                        <Icon name="lucide:corner-down-right" class="connector-icon" />
                    </div>
                </template>

                <!-- Show collapse icon for headers if collapsible -->
                <Icon v-if="item.type === 'header' && isCollapsible(item.itemName)"
                    :name="isSectionCollapsed(item.itemName) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                    class="collapse-icon" :class="{ 'rotate-icon': !isSectionCollapsed(item.itemName) }"
                    @click.stop="toggleSectionCollapse(item.itemName)" />

                <!-- Show image only when not a skin -->
                <Image
                    v-if="(item.type === 'item' || item.type === 'container-item') && item.itemId && !isSkin(item.itemName || '')"
                    :type="isBlueprint(item.itemName || '') ? 'blueprint-copy' : 'item'" :id="item.itemId" size="24"
                    class="w-6 h-6 rounded-md" :alt="item.itemName || ''" />

            </div>
        </template>

        <!-- Name cell -->
        <template #cell-name="{ item }">
            <div v-if="item.type === 'header'" class="font-bold text-sm uppercase"
                @click.stop="isCollapsible(item.itemName) && toggleSectionCollapse(item.itemName)">
                {{ item.itemName }}
                <span v-if="isCollapsible(item.itemName)" class="section-count">
                    ({{ getSectionItemCount(item.itemName) }})
                </span>
            </div>
            <div v-else-if="item.type === 'item' || item.type === 'container-item'" class="font-medium">
                {{ item.itemName }}
            </div>
            <div v-else-if="item.type === 'value'" class="font-medium">{{ item.itemName }}</div>
        </template>

        <!-- Quantity cell with badges -->
        <template #cell-quantity="{ item }">
            <template v-if="item.type === 'header' && sectionItemCounts[item.sectionName] > 1">
                <div class="sort-column-header" @click.stop="handleHeaderClick('quantity', item.sectionName)">
                    <span v-if="currentSortColumn === 'quantity' && currentSortSection === item.sectionName"
                        class="sort-active">
                        {{ currentSortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                    <span v-else class="sort-hint">{{ t('clickToSort', 'Sort') }}</span>
                </div>
            </template>
            <template v-else-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'">
                <div class="quantity-badges">
                    <!-- Dropped badge -->
                    <UBadge v-if="item.dropped > 0" variant="solid" color="success" class="item-badge">
                        <span class="badge-text">{{ item.dropped }}</span>
                    </UBadge>

                    <!-- Destroyed badge -->
                    <UBadge v-if="item.destroyed > 0" variant="solid" color="error" class="item-badge">
                        <span class="badge-text">{{ item.destroyed }}</span>
                    </UBadge>
                </div>
            </template>
        </template>

        <!-- Value cell -->
        <template #cell-value="{ item }: { item: Item }">
            <template v-if="item.type === 'header' && sectionItemCounts[item.sectionName] > 1">
                <div class="sort-column-header" @click.stop="handleHeaderClick('value', item.sectionName)">
                    <span v-if="currentSortColumn === 'value' && currentSortSection === item.sectionName"
                        class="sort-active">
                        {{ currentSortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                    <span v-else class="sort-hint">{{ t('clickToSort', 'Sort') }}</span>
                </div>
            </template>
            <template v-else-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'">
                <div v-if="item.value" class="text-right font-medium">
                    {{ formatIsk(item.value) }}
                </div>
                <div v-else class="text-right">-</div>
            </template>
        </template>

        <!-- Mobile view template -->
        <template #mobile-content="{ item }: { item: Item }">
            <div class="mobile-container">
                <!-- Image cell -->
                <div class="mobile-image-cell" :class="{ 'indented-mobile-image': item.isNested }">
                    <template v-if="item.isNested">
                        <div class="mobile-connector-line">
                            <Icon name="lucide:corner-down-right" class="connector-icon-mobile" />
                        </div>
                    </template>

                    <Icon v-if="item.type === 'header' && isCollapsible(item.itemName)"
                        :name="isSectionCollapsed(item.itemName) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                        class="collapse-icon-mobile" @click.stop="toggleSectionCollapse(item.itemName)" />

                    <!-- Show image only when not a skin -->
                    <Image
                        v-if="(item.type === 'item' || item.type === 'container-item') && item.itemId && !isSkin(item.itemName || '')"
                        type="item" :id="item.itemId" size="24" class="w-6 h-6 rounded-md" :alt="item.itemName || ''" />
                </div>

                <!-- Mobile content -->
                <div class="mobile-content">
                    <!-- Name -->
                    <div class="mobile-header">
                        <div v-if="item.type === 'header'" class="font-bold text-sm uppercase mobile-title"
                            @click.stop="isCollapsible(item.itemName) && toggleSectionCollapse(item.itemName)">
                            {{ item.itemName }}
                            <span v-if="isCollapsible(item.itemName)" class="section-count">
                                ({{ getSectionItemCount(item.itemName) }})
                            </span>
                        </div>
                        <div v-else-if="item.type === 'item' || item.type === 'container-item'"
                            class="font-medium mobile-title">
                            {{ item.itemName }}
                        </div>
                        <div v-else-if="item.type === 'value'" class="font-medium mobile-title">{{ item.itemName }}
                        </div>
                    </div>

                    <!-- Mobile details - badges and value -->
                    <div v-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'"
                        class="mobile-details">
                        <div class="mobile-badges-wrapper">
                            <!-- Dropped badge -->
                            <UBadge v-if="item.dropped > 0" variant="solid" color="success"
                                class="item-badge item-badge-mobile">
                                <span class="badge-text">{{ item.dropped }}</span>
                            </UBadge>

                            <!-- Destroyed badge -->
                            <UBadge v-if="item.destroyed > 0" variant="solid" color="error"
                                class="item-badge item-badge-mobile">
                                <span class="badge-text">{{ item.destroyed }}</span>
                            </UBadge>
                        </div>

                        <div v-if="item.value" class="mobile-value">
                            {{ formatIsk(item.value) }}
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Table>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from "vue";

// Helper function to parse human-readable ISK strings (e.g., "1.4b", "79m", "1,500.5k")
const parseHumanReadableIsk = (val: any): number => {
    if (typeof val === 'number') {
        return val;
    }
    if (val === null || val === undefined) {
        return 0;
    }

    let s = String(val).toLowerCase().trim();
    s = s.replace(/,/g, ''); // Remove commas

    let multiplier = 1;
    if (s.endsWith('k')) {
        multiplier = 1000;
        s = s.slice(0, -1);
    } else if (s.endsWith('m')) {
        multiplier = 1000000;
        s = s.slice(0, -1);
    } else if (s.endsWith('b')) {
        multiplier = 1000000000;
        s = s.slice(0, -1);
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num * multiplier;
};

import type { IKillmail } from "~/server/interfaces/IKillmail";
import type { TableColumn } from "../common/Table.vue";

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

const props = defineProps<{
    killmail: IKillmail | null;
}>();

// Sorting state
const currentSortColumn = ref<string | null>(null);
const currentSortDirection = ref<'asc' | 'desc'>('desc');
const currentSortSection = ref<string | null>(null);

// Define table columns with proper width and alignment
const columns = ref<TableColumn[]>([
    {
        id: "image",
        width: "80px",
        cellClass: "image-cell-container",
    },
    {
        id: "name",
        header: computed(() => t("item")),
        cellClass: "name-cell-container", // Add flex-1 to make this column expand
    },
    {
        id: "quantity",
        header: computed(() => {
            const label = t("quantity");
            if (currentSortColumn.value === 'quantity') {
                return `${label} ${currentSortDirection.value === 'asc' ? '↑' : '↓'}`;
            }
            return label;
        }),
        width: "120px",
        cellClass: "quantity-cell-container", // Add justify-end for right alignment
        sortable: true,
    },
    {
        id: "value",
        header: computed(() => {
            const label = t("value");
            if (currentSortColumn.value === 'value') {
                return `${label} ${currentSortDirection.value === 'asc' ? '↑' : '↓'}`;
            }
            return label;
        }),
        width: "120px",
        cellClass: "value-cell-container justify-end", // Add justify-end for right alignment
        headerClass: "text-right", // Right align the header text
        sortable: true,
    },
]);

const groupedItems = ref();
const data = ref<Item[]>();

// Combined slot type configuration with collapsible settings and localized labels
const slotTypeConfig = {
    highSlot: {
        flags: [27, 28, 29, 30, 31, 32, 33, 34],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.highSlot"),
    },
    mediumSlot: {
        flags: [19, 20, 21, 22, 23, 24, 25, 26],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.mediumSlot"),
    },
    lowSlot: {
        flags: [11, 12, 13, 14, 15, 16, 17, 18],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.lowSlot"),
    },
    rigSlot: {
        flags: [92, 93, 94, 95, 96, 97, 98, 99],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.rigSlot"),
    },
    subsystem: {
        flags: [125, 126, 127, 128, 129, 130, 131, 132],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.subsystem"),
    },
    droneBay: {
        flags: [87],
        collapsible: true,
        defaultCollapsed: false,
        label: () => t("slots.droneBay"),
    },
    cargoBay: {
        flags: [5],
        collapsible: true,
        defaultCollapsed: false,
        label: () => t("slots.cargoBay"),
    },
    fuelBay: {
        flags: [133],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fuelBay"),
    },
    fleetHangar: {
        flags: [155],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fleetHangar"),
    },
    fighterBay: {
        flags: [158],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fighterBay"),
    },
    fighterLaunchTubes: {
        flags: [159, 160, 161, 162, 163],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fighterLaunchTubes"),
    },
    shipHangar: {
        flags: [90],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.shipHangar"),
    },
    oreHold: {
        flags: [134],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.oreHold"),
    },
    gasHold: {
        flags: [135],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.gasHold"),
    },
    mineralHold: {
        flags: [136],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.mineralHold"),
    },
    salvageHold: {
        flags: [137],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.salvageHold"),
    },
    shipHold: {
        flags: [138],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.shipHold"),
    },
    smallShipHold: {
        flags: [139],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.smallShipHold"),
    },
    mediumShipHold: {
        flags: [140],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.mediumShipHold"),
    },
    largeShipHold: {
        flags: [141],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.largeShipHold"),
    },
    industrialShipHold: {
        flags: [142],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.industrialShipHold"),
    },
    ammoHold: {
        flags: [143],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.ammoHold"),
    },
    quafeBay: {
        flags: [154],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.quafeBay"),
    },
    structureServices: {
        flags: [164, 165, 166, 167, 168, 169, 170, 171],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.structureServices"),
    },
    structureFuel: {
        flags: [172],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.structureFuel"),
    },
    implants: {
        flags: [89],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.implants"),
    },
    infrastructureHangar: {
        flags: [185],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.infrastructureHangar"),
    },
    coreRoom: {
        flags: [180],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.coreRoom"),
    },
    moonMaterialBay: {
        flags: [186],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.moonMaterialBay"),
    },
};

// Track which sections are collapsed
const collapsedSections = ref<Record<string, boolean>>({});
const isInitialized = ref(false);

// Store section item counts and values separately to show when collapsed
const sectionItemCounts = ref<Record<string, number>>({});
const sectionValues = ref<Record<string, number>>({});

// Initialize collapsed state based on default settings
function initializeCollapsedState() {
    // Only initialize if not already initialized
    if (isInitialized.value) return;

    // Create a fresh object with default states
    const initialState: Record<string, boolean> = {};

    Object.entries(slotTypeConfig).forEach(([key, config]) => {
        // Use the label function to get the translated name
        const translatedKey = config.label();
        if (config.collapsible) {
            initialState[translatedKey] = config.defaultCollapsed;
        }
    });

    // Set the initial collapsed state
    collapsedSections.value = initialState;
    isInitialized.value = true;
}

// Check if a section is collapsible
function isCollapsible(sectionName: string): boolean {
    // Try to find the section in our config by translated name
    for (const [key, config] of Object.entries(slotTypeConfig)) {
        const translatedKey = config.label();
        if (translatedKey === sectionName) {
            return config.collapsible;
        }
    }
    return false;
}

// Check if a section is currently collapsed
function isSectionCollapsed(sectionName: string): boolean {
    return collapsedSections.value[sectionName] || false;
}

// Toggle collapsed state for a section with animation support
function toggleSectionCollapse(sectionName: string) {
    if (isCollapsible(sectionName)) {
        // Add a small delay to ensure the icon animation shows properly
        // Set timeout to make the transition work better
        collapsedSections.value[sectionName] = !collapsedSections.value[sectionName];

        // Reprocess the data structure to update what's shown
        if (props.killmail) {
            processKillmailData(props.killmail);
        }
    }
}

// Get CSS classes for each row
function getRowClasses(item: Item) {
    const classes = [];

    // Add class based on row type
    if (item.type) {
        classes.push(item.type);
    }

    // Add clickable class for items or container-items with itemId
    if ((item.type === "item" || item.type === "container-item") && item.itemId) {
        classes.push("cursor-pointer");
    }

    // Add header click indicator for collapsible headers
    if (item.type === "header" && isCollapsible(item.itemName)) {
        classes.push("cursor-pointer");
    }

    // Add nested item class
    if (item.isNested) {
        classes.push("container-item-row");
    }

    // Add section header class
    if (item.type === "header") {
        classes.push("section-header-row");
    }

    // Add section total class
    if (item.type === "value" && item.itemName !== t("total")) {
        classes.push("section-total-row");
    }

    return classes.join(" ");
}

// Get the count of items in a section for display
function getSectionItemCount(sectionName: string): number {
    // Return from our stored counts instead of calculating from the visible items
    return sectionItemCounts.value[sectionName] || 0;
}

/**
 * Gets the localized string from a translation object using the current locale
 */
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
};

/**
 * Determines if an item is a blueprint based on its name
 */
function isBlueprint(itemName: string): boolean {
    if (!itemName) return false;
    return itemName.includes("Blueprint");
}

/**
 * Determines if an item is a skin (no image available)
 */
function isSkin(itemName: string): boolean {
    return !!itemName && itemName.toLowerCase().includes('skin');
}

// Watch for locale changes and reprocess data when language changes
watch(
    currentLocale,
    () => {
        if (props.killmail) {
            // Re-process data with new locale
            processKillmailData(props.killmail);
        }
    },
    { immediate: false },
);

// Watch for changes to the killmail and process data
watch(
    () => props.killmail,
    (killmail: IKillmail | null) => {
        // Initialize collapsed state before first data processing
        if (!isInitialized.value) {
            initializeCollapsedState();
        }

        if (killmail) {
            processKillmailData(killmail);
        }
    },
    { immediate: true },
);

/**
 * Handle column header click for sorting
 * @param columnId The ID of the column to sort by
 * @param sectionName The name of the section to sort
 */
function handleHeaderClick(columnId: string, sectionName: string) {
    // Only enable sorting for sections with more than 1 item
    if (!columnId || !sectionName || sectionItemCounts.value[sectionName] <= 1) {
        return;
    }

    // If clicking the same column in the same section, toggle direction
    if (currentSortColumn.value === columnId && currentSortSection.value === sectionName) {
        currentSortDirection.value = currentSortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
        // New column or section, set defaults
        currentSortColumn.value = columnId;
        currentSortDirection.value = 'desc'; // Default to descending
        currentSortSection.value = sectionName;
    }

    // Reprocess data to apply the sort
    if (props.killmail) {
        processKillmailData(props.killmail);
    }
}

/**
 * Sort items within a section based on current sort settings
 */
function sortSectionItems(items: any[], sectionName: string) {
    // Only sort if this is the section being sorted and it has more than 1 item
    if (currentSortSection.value !== sectionName || !currentSortColumn.value || items.length <= 1) {
        return items;
    }

    return [...items].sort((a, b) => {
        let valueA, valueB;

        if (currentSortColumn.value === 'quantity') {
            // Sort by total quantity (dropped + destroyed)
            valueA = (a.qty_dropped || 0) + (a.qty_destroyed || 0);
            valueB = (b.qty_dropped || 0) + (b.qty_destroyed || 0);
        } else if (currentSortColumn.value === 'value') {
            // Sort by total value, ensuring numerical inputs by parsing potentially human-readable ISK strings
            const unitPriceA = parseHumanReadableIsk(a.value);
            const unitPriceB = parseHumanReadableIsk(b.value);

            const quantityA = (Number(a.qty_dropped) || 0) + (Number(a.qty_destroyed) || 0);
            const quantityB = (Number(b.qty_dropped) || 0) + (Number(b.qty_destroyed) || 0);

            valueA = unitPriceA * quantityA;
            valueB = unitPriceB * quantityB;

            // Add container items value, also ensuring it's numerical by parsing
            valueA += parseHumanReadableIsk(a.containerItemsValue);
            valueB += parseHumanReadableIsk(b.containerItemsValue);
        } else {
            return 0;
        }

        // Apply sort direction
        return currentSortDirection.value === 'asc'
            ? valueA - valueB
            : valueB - valueA;
    });
}

// Extract killmail data processing into a separate function for reusability
function processKillmailData(killmail: IKillmail) {
    if (!killmail) return;

    // Clear section data
    sectionItemCounts.value = {};
    sectionValues.value = {};

    const allItems = [];

    // Process each item to identify containers and their contents
    killmail.items?.forEach((item) => {
        const containerItemsValue = item.items
            ? item.items.reduce(
                (sum, containerItem) =>
                    sum + containerItem.value * (containerItem.qty_dropped + containerItem.qty_destroyed),
                0,
            )
            : 0;
        allItems.push({
            ...item,
            isContainer: !!item.items,
            items: item.items || [],
            containerItemsValue,
        });
    });

    // Group items by slot type using the combined config
    groupedItems.value = Object.entries(slotTypeConfig)
        .map(([slotType, config]) => ({
            slotType,
            items: groupByQty(allItems.filter((item) => config.flags.includes(item.flag))),
        }))
        .filter((group) => group.items.length > 0);

    // Start building the display data
    data.value = [];
    let totalValue = killmail.ship_value || 0;

    // Add hull section
    data.value?.push({
        type: "header",
        itemName: t("hull"),
        dropped: null,
        destroyed: null,
        value: null,
    });

    // Add ship item (always visible)
    data.value?.push({
        type: "item",
        itemName: getLocalizedString(killmail.victim.ship_name, currentLocale.value),
        dropped: 0,
        destroyed: 1,
        value: killmail.ship_value,
        itemId: killmail.victim.ship_id,
    });

    // Process each slot group
    groupedItems.value.forEach((group) => {
        const items = group.items;
        // Use the label function directly from config to get the translated name
        const sectionName = slotTypeConfig[group.slotType].label();

        // Skip empty sections
        if (items.length === 0) return;

        // Calculate and store the count for this section (regardless of collapsed state)
        let itemCount = 0;
        // Count both regular items and their container contents
        items.forEach((item) => {
            itemCount++; // Count the item itself
            if (item.isContainer && item.items && item.items.length > 0) {
                itemCount += item.items.length; // Count container items
            }
        });
        sectionItemCounts.value[sectionName] = itemCount;

        // Add group header with localized slot type name
        data.value?.push({
            type: "header",
            itemName: sectionName,
            dropped: null,
            destroyed: null,
            value: null,
            sectionName: sectionName,
        });

        let innerValue = 0;
        const sectionCollapsed = isSectionCollapsed(sectionName);

        // Process each item in the group - hide if section is collapsed
        if (!sectionCollapsed) {
            // Sort items if needed
            const processedItems = sortSectionItems(items, sectionName);

            processedItems.forEach((item) => {
                // Add the main item
                data.value?.push({
                    type: "item",
                    itemName: getLocalizedString(item.name, currentLocale.value),
                    dropped: item.qty_dropped,
                    destroyed: item.qty_destroyed,
                    value: item.value * (item.qty_dropped + item.qty_destroyed),
                    itemId: item.type_id,
                    sectionName: sectionName,
                });

                // If this is a container with items, add all contained items with indentation
                if (item.isContainer && item.items && item.items.length > 0) {
                    item.items.forEach((containerItem) => {
                        const itemName = containerItem.type_name || containerItem.name || "";
                        data.value?.push({
                            type: "container-item",
                            itemName: getLocalizedString(itemName, currentLocale.value),
                            dropped: containerItem.qty_dropped,
                            destroyed: containerItem.qty_destroyed,
                            value:
                                containerItem.value * (containerItem.qty_dropped + containerItem.qty_destroyed),
                            itemId: containerItem.type_id,
                            isNested: true,
                            sectionName: sectionName,
                        });
                    });
                }

                // Calculate value including container items
                const itemValue = (item.value || 0) * ((item.qty_destroyed || 0) + (item.qty_dropped || 0));
                const containerValue = item.containerItemsValue || 0;
                innerValue += itemValue + containerValue;
            });
        } else {
            // Even if collapsed, calculate the section value
            items.forEach((item) => {
                const itemValue = (item.value || 0) * ((item.qty_destroyed || 0) + (item.qty_dropped || 0));
                const containerValue = item.containerItemsValue || 0;
                innerValue += itemValue + containerValue;
            });
        }

        // Store the section value for reference
        sectionValues.value[sectionName] = innerValue;

        // Add group total (always visible)
        data.value?.push({
            type: "value",
            itemName: t("subTotal"),
            dropped: items.reduce((sum, item) => sum + (item.qty_dropped || 0), 0),
            destroyed: items.reduce((sum, item) => sum + (item.qty_destroyed || 0), 0),
            value: innerValue,
            sectionName: sectionName,
        });

        totalValue += innerValue;
    });

    // Add grand total
    data.value?.push({
        type: "value",
        itemName: t("total"),
        dropped: null,
        destroyed: null,
        value: props.killmail?.total_value ?? totalValue, // Use killmail.total_value if available, otherwise fallback to calculated
    });
}

// Initialize collapsed state BEFORE processing killmail data
onMounted(() => {
    initializeCollapsedState();
});

// Also initialize when locale changes
watch(locale, () => {
    // Do NOT reset collapsedSections here
    // Only reprocess data with new translations
    if (props.killmail) {
        processKillmailData(props.killmail);
    }
});

const UBadge = resolveComponent("UBadge");

type Item = {
    type: "header" | "value" | "item" | "container-item";
    itemName: string | null;
    dropped: number | null;
    destroyed: number | null;
    value: number | null;
    itemId?: number | null;
    isNested?: boolean;
    sectionName?: string;
};

/**
 * Groups similar items together
 */
function groupByQty(items: any[]) {
    const grouped = items.reduce((acc, item) => {
        let key;
        if (item.type_id === 3468) {
            key = `${item.Itemid}_${item.type_id}_${Math.random()}`;
        } else {
            key = `${item.type_id}_${item.qty_dropped || 0}_${item.qty_destroyed || 0}`;
        }

        if (!acc[key]) {
            acc[key] = {
                ...item,
                qty_dropped: 0,
                qty_destroyed: 0,
                items: [],
                containerItemsValue: 0,
            };
        }

        acc[key].qty_dropped += item.qty_dropped || 0;
        acc[key].qty_destroyed += item.qty_destroyed || 0;

        if (item.isContainer) {
            acc[key].items = item.items;
            acc[key].containerItemsValue = item.containerItemsValue;
        }

        return acc;
    }, {});

    return Object.values(grouped);
}

/**
 * Generates a link URL for an item if it should be clickable
 */
function generateItemLink(item: Item): string | null {
    // Only certain row types with itemId are clickable
    if ((item.type === "item" || item.type === "container-item") && item.itemId) {
        return `/item/${item.itemId}`;
    }

    // For headers that are collapsible, return null but let the click handler handle them
    if (item.type === "header" && isCollapsible(item.itemName)) {
        return null;
    }

    return null;
}
</script>

<style scoped>
/* Add override styles for the Table component */
:deep(.kill-items-table) {
    --table-border-color: light-dark(#e5e7eb, rgb(40, 40, 40));
    overflow: hidden;
    /* Prevent overflow during animations */
    /* Add solid background matching the body background to prevent any transparency issues */
    background-color: light-dark(var(--color-background), var(--color-background));
}

/* Section headers */
:deep(.section-header-row) {
    position: relative;
    cursor: pointer;
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.5));
    color: light-dark(#111827, white);
    margin-top: 0.5rem !important;
    border-top: 1px solid light-dark(#d1d5db, rgb(40, 40, 40)) !important;
}

:deep(.section-header-row:first-child) {
    margin-top: 0 !important;
    border-top: none !important;
}

:deep(.section-header-row:hover) {
    background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(40, 40, 40, 0.4));
}

/* Section total rows - prevent animations */
:deep(.section-total-row) {
    background-color: light-dark(rgba(243, 244, 246, 0.2), rgba(40, 40, 40, 0.2));
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    position: relative;
    z-index: 2;
}

/* Same for the total row */
:deep(.table-row.value) {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    position: relative;
    z-index: 2;
}

/* Image cell styling */
.image-cell {
    display: flex;
    align-items: center;
    position: relative;
}

/* Hover effect for container items */
:deep(.container-item-row:hover) {
    background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(50, 50, 50, 0.4)) !important;
}

/* Styling for container items */
:deep(.container-item-row) {
    position: relative;
    border-left: 1px dashed rgba(100, 100, 100, 0.2);
    background-color: light-dark(rgba(250, 250, 250, 0.1), rgba(40, 40, 40, 0.15));
    animation: simpleSlideDown 0.25s ease-in-out;
    /* Modified animation with no bounce */
    /* Ensure edges are covered during animation */
    box-shadow: 0 0 0 2px light-dark(rgba(250, 250, 250, 0.1), rgba(40, 40, 40, 0.15));
    z-index: 1;
}

/* Adjust container items indentation */
.indented-image {
    padding-left: 35px !important;
}

/* Connector line styling */
.connector-line {
    position: absolute;
    left: 5px;
    display: flex;
    align-items: center;
}

.connector-icon {
    width: 12px;
    height: 12px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 2px;
}

/* Collapse icon styling */
.collapse-icon {
    width: 16px;
    height: 16px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 4px;
    transition: transform 0.3s ease;
}

.rotate-icon {
    transform: rotate(0deg);
}

.section-count {
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
    margin-left: 0.5rem;
}

/* Quantity badges styling */
.quantity-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Custom badge styling */
.item-badge {
    border: none;
}

.badge-text {
    color: #000000 !important;
    /* Force black text for both light and dark modes */
    font-weight: 600;
}

:deep(.u-badge.bg-success),
:deep(.u-badge.bg-error) {
    color: #000000 !important;
}

/* Compact styling for badges */
:deep(.u-badge) {
    padding: 0.1rem 0.4rem;
    font-size: 0.7rem;
}

/* Mobile view styling */
.mobile-container {
    display: flex;
    width: 100%;
    gap: 0.75rem;
}

.mobile-image-cell {
    position: relative;
    display: flex;
    align-items: center;
    width: 30px;
}

.indented-mobile-image {
    padding-left: 25px;
}

.mobile-connector-line {
    position: absolute;
    left: 2px;
    display: flex;
    align-items: center;
}

.connector-icon-mobile {
    width: 10px;
    height: 10px;
    color: light-dark(#6b7280, #9ca3af);
}

.collapse-icon-mobile {
    width: 14px;
    height: 14px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 2px;
}

.mobile-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
}

.mobile-title {
    font-weight: 500;
    font-size: 0.875rem;
    color: light-dark(#111827, white);
}

.mobile-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-badges-wrapper {
    display: flex;
    gap: 0.25rem;
}

.item-badge-mobile {
    padding: 0.05rem 0.3rem;
    font-size: 0.65rem;
}

.mobile-value {
    font-size: 0.8rem;
    font-weight: 500;
}

/* Add cursor pointer for clickable rows */
:deep(.cursor-pointer) {
    cursor: pointer;
}

/* Ensure rows are properly spaced */
:deep(.table-row) {
    margin-bottom: 0.25rem;
    transition: background-color 0.3s ease;
    /* Only transition background color, not position or size */
    position: relative;
    /* Thicker box shadow to prevent any gaps between rows */
    box-shadow: 0 0 0 2px light-dark(rgba(255, 255, 255, 0.25), rgba(26, 26, 26, 0.25));
}

/* Regular item rows have simple fade animation without transforms */
:deep(.table-row.item) {
    animation: simpleFadeIn 0.25s ease-in-out;
}

/* Ensure columns are distributed properly */
:deep(.table-row),
:deep(.table-header) {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px;
    width: 100%;
}

/* Fix cell alignments */
:deep(.quantity-cell-container),
:deep(.value-cell-container) {
    text-align: right;
}

/* Simplified animation keyframes - no transform on Y axis to prevent bouncing */
@keyframes simpleFadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes simpleSlideDown {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Improved table rendering */
:deep(.table-body) {
    width: 100%;
    position: relative;
    /* Create stacking context for proper z-index behavior */
    isolation: isolate;
    overflow: hidden;
    /* Ensure table body has solid background to prevent leaks */
    background-color: light-dark(var(--color-background), var(--color-background));
}

/* Collapsible section hover effect */
:deep(.section-header-row:hover) {
    background-color: light-dark(rgba(229, 231, 235, 0.9), rgba(40, 40, 40, 0.6));
    transition: background-color 0.2s ease;
}

/* Ensure cell backgrounds are transparent */
:deep(.body-cell) {
    background-color: transparent;
    position: relative;
}

/* Add overlap between rows to prevent white gaps */
:deep(.table-row) {
    margin-bottom: 0;
    /* Remove margin to prevent gaps */
    padding-top: 0.125rem;
    /* Add padding instead */
    padding-bottom: 0.125rem;
    /* Add outline to reinforce edges */
    outline: 2px solid light-dark(rgba(255, 255, 255, 0.25), rgba(26, 26, 26, 0.25));
    outline-offset: -1px;
}

/* Add a solid backdrop during animation to prevent any transparency issues */
:deep(.table-row)::before {
    content: "";
    position: absolute;
    inset: -1px;
    /* Slightly larger than the row itself */
    background-color: inherit;
    z-index: -1;
}

/* Special fix for Safari */
@supports (-webkit-overflow-scrolling: touch) {

    :deep(.table-row),
    :deep(.container-item-row) {
        transform: translate3d(0, 0, 0);
        /* Force GPU rendering */
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }
}

/* Sorting styles */
.sort-indicator {
    font-size: 0.7rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
    margin-left: 0.5rem;
}

.sort-active {
    color: light-dark(#4b5563, #d1d5db);
}

.sort-hint {
    opacity: 0.6;
}

/* Only show sort hint on hover */
/* Sort column header styling */
.sort-column-header {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    height: 100%;
    padding: 0.25rem;
    border-radius: 0.25rem;
}

.sort-column-header:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(45, 45, 45, 0.5));
}

/* Sort hint is always visible but subtle */
.sort-hint {
    opacity: 0.6;
    font-size: 0.75rem;
}

.sort-active {
    font-size: 0.875rem;
    font-weight: bold;
}

.sort-column-header:hover .sort-hint {
    opacity: 0.9;
}
</style>
