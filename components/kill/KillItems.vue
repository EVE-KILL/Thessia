<template>
    <div class="custom-table">
        <!-- Table header - using computed translations -->
        <div class="table-header">
            <div class="header-cell image-cell"></div>
            <div class="header-cell name-cell">{{ headers.item }}</div>
            <div class="header-cell dropped-cell">{{ headers.dropped }}</div>
            <div class="header-cell destroyed-cell">{{ headers.destroyed }}</div>
            <div class="header-cell value-cell">{{ headers.value }}</div>
        </div>

        <!-- Table body -->
        <div class="table-body">
            <div v-for="(row, index) in data" :key="index"
                 class="table-row"
                 :class="[
                    row.type,
                    { 'cursor-pointer': (row.type === 'item' || row.type === 'container-item') && row.itemId },
                    { 'container-item-row': row.isNested }
                 ]"
                 @click="(row.type === 'item' || row.type === 'container-item') && row.itemId ? navigateToItem(row.itemId) : null">

                <!-- Image cell with indentation and connector icon for container items -->
                <div class="body-cell image-cell" :class="{ 'indented-image': row.isNested }">
                    <template v-if="row.isNested">
                        <div class="connector-line">
                            <Icon name="lucide:corner-down-right" class="connector-icon" />
                        </div>
                    </template>

                    <img v-if="(row.type === 'item' || row.type === 'container-item') && row.image"
                         :src="row.image"
                         :alt="row.itemName || ''"
                         class="w-6 h-6 rounded-md" />
                </div>

                <!-- Name cell -->
                <div class="body-cell name-cell">
                    <div v-if="row.type === 'header'" class="font-bold text-sm uppercase">{{ row.itemName }}</div>
                    <div v-else-if="row.type === 'item' || row.type === 'container-item'"
                         class="font-medium">{{ row.itemName }}</div>
                </div>

                <!-- Dropped cell -->
                <div class="body-cell dropped-cell">
                    <template v-if="row.type === 'item' || row.type === 'value'">
                        <UBadge variant="subtle" :color="row.dropped && row.dropped > 0 ? 'success' : 'warning'">
                            {{ row.dropped || 0 }}
                        </UBadge>
                    </template>
                </div>

                <!-- Destroyed cell -->
                <div class="body-cell destroyed-cell">
                    <template v-if="row.type === 'item' || row.type === 'value'">
                        <UBadge variant="subtle" :color="row.destroyed && row.destroyed > 0 ? 'error' : 'warning'">
                            {{ row.destroyed || 0 }}
                        </UBadge>
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
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { resolveComponent } from 'vue';

import type { IKillmail } from '~/server/interfaces/IKillmail';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

const props = defineProps<{
    killmail: IKillmail | null;
    maxWidth?: number;
}>();

const groupedItems = ref();
const data = ref<Item[]>();

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

// Extract killmail data processing into a separate function for reusability
function processKillmailData(killmail: IKillmail) {
  if (!killmail) return;

  const slotTypes = itemSlotTypes();
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

  // Group items by slot type
  groupedItems.value = Object.keys(slotTypes).map((slotType) => ({
    slotType,
    items: groupByQty(allItems.filter((item) => slotTypes[slotType].includes(item.flag))),
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

  // Add ship item
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

    // Add group header with localized slot type name
    data.value?.push({
      type: 'header',
      image: null,
      itemName: t(`killItems.slots.${group.slotType}`, group.slotType),
      dropped: null,
      destroyed: null,
      value: null
    });

    let innerValue = 0;

    // Process each item in the group
    items.forEach((item) => {
      // Add the main item
      data.value?.push({
        type: 'item',
        image: getItemImageUrl(item.type_id, item.name),
        itemName: getLocalizedString(item.name, currentLocale.value),
        dropped: item.qty_dropped,
        destroyed: item.qty_destroyed,
        value: item.value,
        itemId: item.type_id
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
            isNested: true
          });
        });
      }

      // Calculate value including container items
      const itemValue = (item.value || 0) * ((item.qty_destroyed || 0) + (item.qty_dropped || 0));
      const containerValue = item.containerItemsValue || 0;
      innerValue += itemValue + containerValue;
    });

    // Add group total
    data.value?.push({
      type: 'value',
      image: null,
      itemName: t('killItems.subtotal'),
      dropped: items.reduce((sum, item) => sum + (item.qty_dropped || 0), 0),
      destroyed: items.reduce((sum, item) => sum + (item.qty_destroyed || 0), 0),
      value: innerValue,
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

// Use the new function in the watch
watch(() => props.killmail, (killmail: IKillmail) => {
  if (killmail) {
    processKillmailData(killmail);
  }
}, { immediate: true });

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
}

/**
 * Navigates to item detail page
 */
function navigateToItem(itemId: number) {
    if (!itemId) return;
    navigateTo(`/item/${itemId}`);
}

/**
 * Format ISK values to human-readable form
 */
function formatIsk(value: number): string {
    if (!value || typeof value !== 'number') return '0 ISK';

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)} B`;
    } else if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)} M`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} K`;
    }

    return `${value.toFixed(2)} ISK`;
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

/**
 * Returns slot type mappings with translated keys
 */
function itemSlotTypes() {
    // Use raw slot type identifiers for the mapping but return translated names
    const slotTypes = {
        'highSlot': [27, 28, 29, 30, 31, 32, 33, 34],
        'mediumSlot': [19, 20, 21, 22, 23, 24, 25, 26],
        'lowSlot': [11, 12, 13, 14, 15, 16, 17, 18],
        'rigSlot': [92, 93, 94, 95, 96, 97, 98, 99],
        'subsystem': [125, 126, 127, 128, 129, 130, 131, 132],
        'droneBay': [87],
        'cargoBay': [5],
        'fuelBay': [133],
        'fleetHangar': [155],
        'fighterBay': [158],
        'fighterLaunchTubes': [159, 160, 161, 162, 163],
        'shipHangar': [90],
        'oreHold': [134],
        'gasHold': [135],
        'mineralHold': [136],
        'salvageHold': [137],
        'shipHold': [138],
        'smallShipHold': [139],
        'mediumShipHold': [140],
        'largeShipHold': [141],
        'industrialShipHold': [142],
        'ammoHold': [143],
        'quafeBay': [154],
        'structureServices': [164, 165, 166, 167, 168, 169, 170, 171],
        'structureFuel': [172],
        'infrastructureHangar': [185],
        'coreRoom': [180],
        'moonMaterialBay': [186],
        'implants': [89]
    };

    // Create a new object with translated keys but same flag arrays
    const translatedSlotTypes = {};
    Object.keys(slotTypes).forEach(key => {
        translatedSlotTypes[t(`killItems.slotTypes.${key}`)] = slotTypes[key];
    });

    return translatedSlotTypes;
}

// Create reactive header translations
const headers = computed(() => ({
  item: t('killItems.item'),
  dropped: t('killItems.dropped'),
  destroyed: t('killItems.destroyed'),
  value: t('killItems.value'),
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
    grid-template-columns: 80px 1fr 100px 100px 120px;
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(26, 26, 26, 0.5));
    /* Semi-transparent header */
    padding: 0.5rem 1rem; /* Reduced from 0.75rem */
    border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
}

.header-cell {
    font-weight: 600;
    font-size: 0.875rem;
    color: light-dark(#4b5563, #6b7280);
}

.value-cell {
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
    grid-template-columns: 80px 1fr 100px 100px 120px;
    padding: 0.4rem 1rem; /* Reduced from 0.75rem */
    border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
    align-items: center;
    color: light-dark(#111827, white);
    background-color: transparent;
    /* Transparent row backgrounds */
}

/* Styling for header rows */
.table-row.header {
    background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(26, 26, 26, 0.7));
    /* Semi-transparent header */
    color: light-dark(#111827, white);
    padding: 0.3rem 1rem; /* Reduced from 0.5rem */
    height: 2rem; /* Reduced from 2.5rem */
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

/* Modify the container-item base styling */
.table-row.container-item {
  transition: background-color 0.2s ease;
}

/* Enhanced hover effect for container items */
.container-item-row:hover {
  background-color: light-dark(rgba(229, 231, 235, 0.7), rgba(50, 50, 50, 0.4)) !important;
}

/* Make the image cell position relative to properly position the connector */
.container-item-row .image-cell {
  position: relative;
}

/* Compact styling for badges */
:deep(.u-badge) {
    padding: 0.1rem 0.4rem;
    font-size: 0.7rem;
}
</style>
