<template>
    <div class="custom-table">
        <!-- Table header -->
        <div class="table-header">
            <div class="header-cell image-cell"></div>
            <div class="header-cell name-cell">Item</div>
            <div class="header-cell dropped-cell">Dropped</div>
            <div class="header-cell destroyed-cell">Destroyed</div>
            <div class="header-cell value-cell">Value</div>
        </div>

        <!-- Table body -->
        <div class="table-body">
            <div v-for="(row, index) in data" :key="index" class="table-row" :class="row.type">

                <!-- Image cell -->
                <div class="body-cell image-cell">
                    <img v-if="row.type === 'item' && row.image" :src="row.image" :alt="row.itemName || ''"
                        class="w-8 h-8 rounded-md" />
                </div>

                <!-- Name cell - Always visible for headers and items -->
                <div class="body-cell name-cell">
                    <div v-if="row.type === 'header'" class="font-bold text-sm uppercase">{{ row.itemName }}</div>
                    <div v-else-if="row.type === 'item'" class="font-medium">{{ row.itemName }}</div>
                </div>

                <!-- Dropped cell - Only for items and value rows -->
                <div class="body-cell dropped-cell">
                    <template v-if="row.type === 'item' || row.type === 'value'">
                        <UBadge variant="subtle" :color="row.dropped && row.dropped > 0 ? 'success' : 'warning'">
                            {{ row.dropped || 0 }}
                        </UBadge>
                    </template>
                </div>

                <!-- Destroyed cell - Only for items and value rows -->
                <div class="body-cell destroyed-cell">
                    <template v-if="row.type === 'item' || row.type === 'value'">
                        <UBadge variant="subtle" :color="row.destroyed && row.destroyed > 0 ? 'error' : 'warning'">
                            {{ row.destroyed || 0 }}
                        </UBadge>
                    </template>
                </div>

                <!-- Value cell - Only for items and value rows -->
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

const props = defineProps<{
    killmail: IKillmail | null;
    maxWidth?: number; // New prop to control the max width
}>();

const groupedItems = ref();
const data = ref<Item[]>();

watch(() => props.killmail, (killmail: IKillmail) => {
    const slotTypes = itemSlotTypes();
    let allItems = [];
    killmail.items.forEach((item) => {
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

    groupedItems.value = Object.keys(slotTypes).map((slotType) => ({
      slotType,
      items: groupByQty(allItems.filter((item) => slotTypes[slotType].includes(item.flag))),
    })).filter((group) => group.items.length > 0);

    data.value = [];
    let totalValue = killmail.ship_value || 0;
    data.value?.push({
        type: 'header',
        image: null,
        itemName: 'Hull',
        dropped: null,
        destroyed: null,
        value: null
    });
    data.value?.push({
        type: 'item',
        image: 'https://images.evetech.net/types/' + killmail.victim.ship_id + '/icon?size=64',
        itemName: killmail.victim.ship_name.en,
        dropped: 0,
        destroyed: 1,
        value: killmail.ship_value,
    });

    groupedItems.value.forEach((group) => {
        const items = group.items;
        data.value?.push({
            type: 'header',
            image: null,
            itemName: group.slotType,
            dropped: null,
            destroyed: null,
            value: null
        });

        let innerValue = 0;
        items.forEach((item) => {
            data.value?.push({
                type: 'item',
                image: 'https://images.evetech.net/types/' + item.type_id + '/icon?size=64',
                itemName: item.name.en, // @TODO fix translation handling here
                dropped: item.qty_dropped,
                destroyed: item.qty_destroyed,
                value: item.value,
            });
            innerValue += item.value || 0;
        });

        data.value?.push({
            type: 'value',
            image: null,
            itemName: 'Total',
            dropped: items.reduce((sum, item) => sum + (item.qty_dropped || 0), 0),
            destroyed: items.reduce((sum, item) => sum + (item.qty_destroyed || 0), 0),
            value: innerValue,
        });

        totalValue += innerValue;
    });

    data.value?.push({
        type: 'value',
        image: null,
        itemName: 'Total',
        dropped: null,
        destroyed: null,
        value: totalValue,
    });

}, { immediate: true });

const UBadge = resolveComponent('UBadge')

type Item = {
    type: 'header' | 'value' | 'item'
    image: string | null
    itemName: string | null
    dropped: number | null
    destroyed: number | null
    value: number | null
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

function groupByQty(items: Item[]) {
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

function itemSlotTypes() {
    return {
        'High Slot': [27, 28, 29, 30, 31, 32, 33, 34],
        'Medium Slot': [19, 20, 21, 22, 23, 24, 25, 26],
        'Low Slot': [11, 12, 13, 14, 15, 16, 17, 18],
        'Rig Slot': [92, 93, 94, 95, 96, 97, 98, 99],
        'Subsystem': [125, 126, 127, 128, 129, 130, 131, 132],
        'Drone Bay': [87],
        'Cargo Bay': [5],
        'Fuel Bay': [133],
        'Fleet Hangar': [155],
        'Fighter Bay': [158],
        'Fighter Launch Tubes': [159, 160, 161, 162, 163],
        'Ship Hangar': [90],
        'Ore Hold': [134],
        'Gas hold': [135],
        'Mineral hold': [136],
        'Salvage Hold': [137],
        'Ship Hold': [138],
        'Small Ship Hold': [139],
        'Medium Ship Hold': [140],
        'Large Ship Hold': [141],
        'Industrial Ship Hold': [142],
        'Ammo Hold': [143],
        'Quafe Bay': [154],
        'Structure Services': [164, 165, 166, 167, 168, 169, 170, 171],
        'Structure Fuel': [172],
        'Infrastructure Hangar': [185],
        'Core Room': [180],
        'Moon Material Bay': [186],
        'Implants': [89]
    };
}
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
    padding: 0.75rem 1rem;
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
    padding: 0.75rem 1rem;
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
    padding: 0.5rem 1rem;
    height: 2.5rem;
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
</style>
