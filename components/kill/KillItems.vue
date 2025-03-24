<template>
    <div class="custom-table" :class="{ 'mobile-view': isMobile }">
        <!-- Table header - using computed translations -->
        <div class="table-header">
            <div class="header-cell image-cell"></div>
            <div class="header-cell name-cell">{{ headers.item }}</div>
            <template v-if="!isMobile">
                <div class="header-cell quantity-cell">{{ headers.quantity }}</div>
                <div class="header-cell value-cell">{{ headers.value }}</div>
            </template>
            <div v-else class="header-cell mobile-details-cell">{{ headers.details }}</div>
        </div>

        <!-- Table body -->
        <div class="table-body">
            <!-- Hull section is always shown -->
            <div v-for="(row, index) in data" :key="index"
                 class="table-row"
                 :class="[
                    row.type,
                    { 'cursor-pointer': (row.type === 'item' || row.type === 'container-item') && row.itemId },
                    { 'container-item-row': row.isNested },
                    { 'section-header-row': row.type === 'header' },
                    { 'section-total-row': row.type === 'value' && row.itemName !== t('killItems.total') }
                 ]"
                 @click="handleRowClick(row)">

                <!-- Image cell with indentation and connector icon for container items -->
                <div class="body-cell image-cell" :class="{ 'indented-image': row.isNested }">
                    <template v-if="row.isNested">
                        <div class="connector-line">
                            <Icon name="lucide:corner-down-right" class="connector-icon" />
                        </div>
                    </template>

                    <!-- Show collapse icon for headers if collapsible -->
                    <Icon v-if="row.type === 'header' && isCollapsible(row.itemName)"
                          :name="isSectionCollapsed(row.itemName) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                          class="collapse-icon" />

                    <img v-if="(row.type === 'item' || row.type === 'container-item') && row.image"
                         :src="row.image"
                         :alt="row.itemName || ''"
                         class="w-6 h-6 rounded-md" />
                </div>

                <!-- Name cell -->
                <div class="body-cell name-cell">
                    <div v-if="row.type === 'header'" class="font-bold text-sm uppercase">
                        {{ row.itemName }}
                        <span v-if="isCollapsible(row.itemName)" class="section-count">
                            ({{ getSectionItemCount(row.itemName) }})
                        </span>
                    </div>
                    <div v-else-if="row.type === 'item' || row.type === 'container-item'"
                         class="font-medium">{{ row.itemName }}</div>
                    <div v-else-if="row.type === 'value'" class="font-medium">{{ row.itemName }}</div>
                </div>

                <!-- Desktop view: Separate quantity and value columns -->
                <template v-if="!isMobile">
                    <!-- Combined Quantity cell (Dropped & Destroyed) -->
                    <div class="body-cell quantity-cell">
                        <template v-if="row.type === 'item' || row.type === 'value'">
                            <div class="quantity-badges">
                                <!-- Dropped badge -->
                                <UBadge v-if="row.dropped > 0" variant="solid" color="success" class="item-badge">
                                    <span class="badge-text">{{ row.dropped }}</span>
                                </UBadge>

                                <!-- Destroyed badge -->
                                <UBadge v-if="row.destroyed > 0" variant="solid" color="error" class="item-badge">
                                    <span class="badge-text">{{ row.destroyed }}</span>
                                </UBadge>
                            </div>
                        </template>
                    </div>

                    <!-- Value cell -->
                    <div class="body-cell value-cell justify-end">
                        <template v-if="row.type === 'item' || row.type === 'value'">
                            <div v-if="row.value" class="text-right font-medium">
                                {{ formatIsk(row.value) }}
                            </div>
                            <div v-else class="text-right">-</div>
                        </template>
                    </div>
                </template>

                <!-- Mobile view: Combined details cell -->
                <div v-else class="body-cell mobile-details-cell">
                    <template v-if="row.type === 'item' || row.type === 'value'">
                        <div class="mobile-details-wrapper">
                            <!-- Badges for dropped/destroyed -->
                            <div v-if="row.dropped > 0 || row.destroyed > 0" class="mobile-badges">
                                <UBadge v-if="row.dropped > 0" variant="solid" color="success" class="item-badge item-badge-mobile">
                                    <span class="badge-text">{{ row.dropped }}</span>
                                </UBadge>
                                <UBadge v-if="row.destroyed > 0" variant="solid" color="error" class="item-badge item-badge-mobile">
                                    <span class="badge-text">{{ row.destroyed }}</span>
                                </UBadge>
                            </div>

                            <!-- Value -->
                            <div v-if="row.value" class="mobile-value">
                                {{ formatIsk(row.value) }}
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { resolveComponent } from 'vue';

import type { IKillmail } from '~/server/interfaces/IKillmail';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);
const { isMobile } = useResponsive();

const props = defineProps<{
    killmail: IKillmail | null;
}>();

const groupedItems = ref();
const data = ref<Item[]>();

// Combined slot type configuration with collapsible settings and localized labels
const slotTypeConfig = {
  highSlot: {
    flags: [27, 28, 29, 30, 31, 32, 33, 34],
    collapsible: false,
    defaultCollapsed: false,
    label: () => t('killItems.slots.highSlot')
  },
  mediumSlot: {
    flags: [19, 20, 21, 22, 23, 24, 25, 26],
    collapsible: false,
    defaultCollapsed: false,
    label: () => t('killItems.slots.mediumSlot')
  },
  lowSlot: {
    flags: [11, 12, 13, 14, 15, 16, 17, 18],
    collapsible: false,
    defaultCollapsed: false,
    label: () => t('killItems.slots.lowSlot')
  },
  rigSlot: {
    flags: [92, 93, 94, 95, 96, 97, 98, 99],
    collapsible: false,
    defaultCollapsed: false,
    label: () => t('killItems.slots.rigSlot')
  },
  subsystem: {
    flags: [125, 126, 127, 128, 129, 130, 131, 132],
    collapsible: false,
    defaultCollapsed: false,
    label: () => t('killItems.slots.subsystem')
  },
  droneBay: {
    flags: [87],
    collapsible: true,
    defaultCollapsed: false,
    label: () => t('killItems.slots.droneBay')
  },
  cargoBay: {
    flags: [5],
    collapsible: true,
    defaultCollapsed: false,
    label: () => t('killItems.slots.cargoBay')
  },
  fuelBay: {
    flags: [133],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.fuelBay')
  },
  fleetHangar: {
    flags: [155],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.fleetHangar')
  },
  fighterBay: {
    flags: [158],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.fighterBay')
  },
  fighterLaunchTubes: {
    flags: [159, 160, 161, 162, 163],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.fighterLaunchTubes')
  },
  shipHangar: {
    flags: [90],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.shipHangar')
  },
  oreHold: {
    flags: [134],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.oreHold')
  },
  gasHold: {
    flags: [135],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.gasHold')
  },
  mineralHold: {
    flags: [136],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.mineralHold')
  },
  salvageHold: {
    flags: [137],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.salvageHold')
  },
  shipHold: {
    flags: [138],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.shipHold')
  },
  smallShipHold: {
    flags: [139],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.smallShipHold')
  },
  mediumShipHold: {
    flags: [140],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.mediumShipHold')
  },
  largeShipHold: {
    flags: [141],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.largeShipHold')
  },
  industrialShipHold: {
    flags: [142],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.industrialShipHold')
  },
  ammoHold: {
    flags: [143],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.ammoHold')
  },
  quafeBay: {
    flags: [154],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.quafeBay')
  },
  structureServices: {
    flags: [164, 165, 166, 167, 168, 169, 170, 171],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.structureServices')
  },
  structureFuel: {
    flags: [172],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.structureFuel')
  },
  implants: {
    flags: [89],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.implants')
  },
  infrastructureHangar: {
    flags: [185],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.infrastructureHangar')
  },
  coreRoom: {
    flags: [180],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.coreRoom')
  },
  moonMaterialBay: {
    flags: [186],
    collapsible: true,
    defaultCollapsed: true,
    label: () => t('killItems.slots.moonMaterialBay')
  }
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

// Toggle collapsed state for a section
function toggleSectionCollapse(sectionName: string) {
  if (isCollapsible(sectionName)) {
    // Toggle just this specific section without affecting others
    collapsedSections.value[sectionName] = !collapsedSections.value[sectionName];

    // Reprocess only the data structure, don't reinitialize collapsedSections
    if (props.killmail) {
      processKillmailData(props.killmail);
    }
  }
}

// Handle row click - for collapsible headers and item links
function handleRowClick(row: Item) {
    if (row.type === 'header' && isCollapsible(row.itemName)) {
        toggleSectionCollapse(row.itemName);
    } else if ((row.type === 'item' || row.type === 'container-item') && row.itemId) {
        navigateToItem(row.itemId);
    }
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
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
};

/**
 * Determines if an item is a blueprint based on its name
 */
function isBlueprint(itemName: string): boolean {
  if (!itemName) return false;
  return itemName.includes('Blueprint');
}

/**
 * Generates the correct image URL for an item, handling blueprints appropriately
 */
function getItemImageUrl(typeId: number, itemName: any, size: number = 64): string {
  const localizedName = getLocalizedString(itemName, currentLocale.value);
  const imageType = isBlueprint(localizedName) ? 'bp' : 'icon';
  return `https://images.evetech.net/types/${typeId}/${imageType}?size=${size}`;
}

// Watch for locale changes and reprocess data when language changes
watch(currentLocale, () => {
  if (props.killmail) {
    // Re-process data with new locale
    processKillmailData(props.killmail);
  }
}, { immediate: false });

// Watch for changes to the killmail and process data
watch(() => props.killmail, (killmail: IKillmail | null) => {
  // Initialize collapsed state before first data processing
  if (!isInitialized.value) {
    initializeCollapsedState();
  }

  if (killmail) {
    processKillmailData(killmail);
  }
}, { immediate: true });

// Extract killmail data processing into a separate function for reusability
function processKillmailData(killmail: IKillmail) {
  if (!killmail) return;

  // Clear section data
  sectionItemCounts.value = {};
  sectionValues.value = {};

  let allItems = [];

  // Process each item to identify containers and their contents
  killmail.items?.forEach((item) => {
    const containerItemsValue = item.items ?
      item.items.reduce((sum, containerItem) => sum + containerItem.value * (containerItem.qty_dropped + containerItem.qty_destroyed), 0)
      : 0;
    allItems.push({
      ...item,
      isContainer: !!item.items,
      items: item.items || [],
      containerItemsValue
    })
  });

  // Group items by slot type using the combined config
  groupedItems.value = Object.entries(slotTypeConfig).map(([slotType, config]) => ({
    slotType,
    items: groupByQty(allItems.filter((item) => config.flags.includes(item.flag))),
  })).filter((group) => group.items.length > 0);

  // Start building the display data
  data.value = [];
  let totalValue = killmail.ship_value || 0;

  // Add hull section
  data.value?.push({
    type: 'header',
    image: null,
    itemName: t('killItems.hull'),
    dropped: null,
    destroyed: null,
    value: null
  });

  // Add ship item (always visible)
  data.value?.push({
    type: 'item',
    image: getItemImageUrl(killmail.victim.ship_id, killmail.victim.ship_name),
    itemName: getLocalizedString(killmail.victim.ship_name, currentLocale.value),
    dropped: 0,
    destroyed: 1,
    value: killmail.ship_value,
    itemId: killmail.victim.ship_id
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
    items.forEach(item => {
      itemCount++; // Count the item itself
      if (item.isContainer && item.items && item.items.length > 0) {
        itemCount += item.items.length; // Count container items
      }
    });
    sectionItemCounts.value[sectionName] = itemCount;

    // Add group header with localized slot type name
    data.value?.push({
      type: 'header',
      image: null,
      itemName: sectionName,
      dropped: null,
      destroyed: null,
      value: null,
      sectionName: sectionName
    });

    let innerValue = 0;
    const sectionCollapsed = isSectionCollapsed(sectionName);

    // Process each item in the group - hide if section is collapsed
    if (!sectionCollapsed) {
      items.forEach((item) => {
        // Add the main item
        data.value?.push({
          type: 'item',
          image: getItemImageUrl(item.type_id, item.name),
          itemName: getLocalizedString(item.name, currentLocale.value),
          dropped: item.qty_dropped,
          destroyed: item.qty_destroyed,
          value: item.value * (item.qty_dropped + item.qty_destroyed),
          itemId: item.type_id,
          sectionName: sectionName
        });

        // If this is a container with items, add all contained items with indentation
        if (item.isContainer && item.items && item.items.length > 0) {
          item.items.forEach(containerItem => {
            const itemName = containerItem.type_name || containerItem.name || '';
            data.value?.push({
              type: 'container-item',
              image: getItemImageUrl(containerItem.type_id, itemName),
              itemName: getLocalizedString(itemName, currentLocale.value),
              dropped: containerItem.qty_dropped,
              destroyed: containerItem.qty_destroyed,
              value: containerItem.value * (containerItem.qty_dropped + containerItem.qty_destroyed),
              itemId: containerItem.type_id,
              isNested: true,
              sectionName: sectionName
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
      type: 'value',
      image: null,
      itemName: t('killItems.subtotal'),
      dropped: items.reduce((sum, item) => sum + (item.qty_dropped || 0), 0),
      destroyed: items.reduce((sum, item) => sum + (item.qty_destroyed || 0), 0),
      value: innerValue,
      sectionName: sectionName
    });

    totalValue += innerValue;
  });

  // Add grand total
  data.value?.push({
    type: 'value',
    image: null,
    itemName: t('killItems.total'),
    dropped: null,
    destroyed: null,
    value: totalValue,
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

const UBadge = resolveComponent('UBadge')

type Item = {
    type: 'header' | 'value' | 'item' | 'container-item'
    image: string | null
    itemName: string | null
    dropped: number | null
    destroyed: number | null
    value: number | null
    itemId?: number | null
    isNested?: boolean
    sectionName?: string
}

/**
 * Navigates to item detail page
 */
function navigateToItem(itemId: number) {
    if (!itemId) return;
    navigateTo(`/item/${itemId}`);
}

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

// Create reactive header translations
const headers = computed(() => ({
  item: t('killItems.item'),
  quantity: t('killItems.quantity'),
  value: t('killItems.value'),
  details: t('killItems.details') // New header for mobile view
}));

// Refresh the table headers when locale changes
watch(locale, () => {
  // The computed headers will automatically update
  // This ensures the template will refresh with new translations
  console.debug('Locale changed, updating headers');
}, { immediate: false });

</script>

<style scoped>
.custom-table {
    display: flex;
    flex-direction: column;
    width: 100%;
    border-radius: 0.375rem;
    overflow: hidden;
    background-color: transparent;
    /* Make the table background transparent */
}

/* Table Header */
.table-header {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px; /* Updated to 4 columns */
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.5));
    /* Semi-transparent header */
    padding: 0.5rem 1rem; /* Reduced from 0.75rem */
    border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
}

/* Mobile Table Header */
.mobile-view .table-header {
    grid-template-columns: 50px 1fr 100px; /* Mobile 3 columns */
    padding: 0.4rem 0.75rem;
}

.header-cell {
    font-weight: 600;
    font-size: 0.875rem;
    color: light-dark(#4b5563, #6b7280);
}

.value-cell {
    text-align: right;
}

.mobile-details-cell {
    text-align: right;
}

/* Table Body */
.table-body {
    display: flex;
    flex-direction: column;
    background-color: transparent;
    /* Ensure body is transparent */
}

.table-row {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px; /* Updated to 4 columns */
    padding: 0.4rem 1rem; /* Reduced from 0.75rem */
    border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
    align-items: center;
    color: light-dark(#111827, white);
    background-color: transparent;
    /* Transparent row backgrounds */
}

/* Mobile Table Row */
.mobile-view .table-row {
    grid-template-columns: 50px 1fr 100px; /* Mobile 3 columns */
    padding: 0.35rem 0.75rem;
}

/* Styling for header rows */
.table-row.header {
    background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(26, 26, 26, 0.7));
    /* Semi-transparent header */
    color: light-dark(#111827, white);
    padding: 0.3rem 1rem; /* Reduced from 0.5rem */
    height: 2rem; /* Reduced from 2.5rem */
}

.mobile-view .table-row.header {
    padding: 0.25rem 0.75rem;
    height: 1.75rem;
}

/* Styling for value rows */
.table-row.value {
    background-color: light-dark(rgba(243, 244, 246, 0.3), rgba(40, 40, 40, 0.3));
    /* More transparent values */
    font-weight: 600;
}

/* Hover effects */
.table-row.item:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(26, 26, 26, 0.5));
    /* Semi-transparent hover */
}

/* Cell spacing */
.body-cell {
    display: flex;
    align-items: center;
}

/* Mobile details cell styling */
.mobile-details-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
}

.mobile-badges {
    display: flex;
    gap: 0.25rem;
}

.mobile-value {
    font-size: 0.8rem;
    font-weight: 500;
}

/* Add space between sections */
.table-row.header:not(:first-child) {
    margin-top: 0.5rem;
    border-top: 1px solid light-dark(#d1d5db, rgb(40, 40, 40));
}

/* Table footer */
.table-footer {
    border-color: light-dark(#e5e7eb, rgb(40, 40, 40));
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.5));
    /* Semi-transparent footer */
    color: light-dark(#4b5563, #9ca3af) !important;
}

/* Match KillList component text styles */
.body-cell {
    color: light-dark(#111827, white);
}

.body-cell span {
    color: light-dark(#6b7280, #9ca3af);
}

.table-row.value .body-cell {
    color: light-dark(#111827, white);
}

/* Ensure transparency works in both themes */
:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Add cursor style for clickable rows */
.cursor-pointer {
    cursor: pointer;
}

/* Add hover effect to indicate clickability */
.table-row.item.cursor-pointer:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(26, 26, 26, 0.7));
}

/* Highlight dropped and destroyed items similar to old implementation */
.table-row.container-item {
    background-color: rgba(40, 40, 40, 0.2);
}

/* Indentation and styling for nested items */
.nested-item .name-cell {
    padding-left: 1.25rem !important;
}

/* Container item hover effect */
.container-item:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.6), rgba(26, 26, 26, 0.6)) !important;
}

/* Make the image cell position relative to properly position the connector */
.container-item-row .image-cell {
  position: relative;
}

/* Adjust indentation to focus on the image cell */
.container-item-row {
  position: relative;
  border-left: 1px dashed rgba(100, 100, 100, 0.2);
  background-color: light-dark(rgba(250, 250, 250, 0.1), rgba(40, 40, 40, 0.15));
  padding-left: 0 !important; /* Remove the row indentation */
}

/* Add indentation to the image cell instead */
.indented-image {
  padding-left: 35px !important; /* Increased padding to make indentation more visible */
}

/* Mobile adjustments for indentation */
.mobile-view .indented-image {
  padding-left: 25px !important;
}

/* Style for the connector icon */
.connector-line {
  position: absolute;
  left: 5px; /* Adjust position to work with indented image */
  display: flex;
  align-items: center;
}

.connector-icon {
  width: 12px; /* Reduced from 14px */
  height: 12px; /* Reduced from 14px */
  color: light-dark(#6b7280, #9ca3af);
  margin-right: 2px;
}

.mobile-view .connector-icon {
  width: 10px;
  height: 10px;
}

/* Modify the container-item base styling */
.table-row.container-item {
  transition: background-color 0.2s ease;
}

/* Enhanced hover effect for container items */
.container-item-row:hover {
  background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(50, 50, 50, 0.4)) !important;
}

/* Compact styling for badges */
:deep(.u-badge) {
    padding: 0.1rem 0.4rem;
    font-size: 0.7rem;
}

/* Mobile badges adjustments */
:deep(.item-badge-mobile) {
    padding: 0.05rem 0.3rem;
    font-size: 0.65rem;
}

/* Quantity badges container */
.quantity-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Custom badge styling to ensure black text */
.item-badge {
    border: none;
}

.badge-text {
    color: #000000 !important; /* Force black text for both light and dark modes */
    font-weight: 600;
}

/* Fix UBadge styling to ensure black text is visible */
:deep(.u-badge.bg-success),
:deep(.u-badge.bg-error) {
    color: #000000 !important;
}

/* Mobile specific adjustments for text and spacing */
@media (max-width: 768px) {
    .custom-table {
        font-size: 0.9rem;
    }

    .name-cell {
        font-size: 0.85rem;
    }

    .table-row.header {
        font-size: 0.8rem;
    }

    .font-medium {
        font-weight: 500;
    }

    .image-cell img {
        max-width: 24px;
        max-height: 24px;
    }
}

/* Collapsible section headers */
.section-header-row {
    position: relative;
    cursor: pointer;
}

.section-header-row:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(40, 40, 40, 0.4));
}

.collapse-icon {
    width: 16px;
    height: 16px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 4px;
}

.section-count {
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
    margin-left: 0.5rem;
}

.section-total-row {
    background-color: light-dark(rgba(243, 244, 246, 0.2), rgba(40, 40, 40, 0.2));
}

/* Animation for collapsible sections */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.table-body {
  will-change: transform;
}

.table-row {
  transition: background-color 0.2s ease;
}
</style>
