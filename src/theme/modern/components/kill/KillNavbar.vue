<script setup lang="ts">
import type { IKillmail } from "~/server/interfaces/IKillmail";

const props = defineProps<{
    killmail: IKillmail | null;
    battle: boolean | { value: boolean } | null;
    sibling?: number | null; // Accept sibling killmail id as a prop
}>();

const { t } = useI18n();

// Track dropdown states for menus with children
const dropdownStates = ref({});

/**
 * Navbar link interface
 */
interface NavLink {
    name?: string;
    label?: string;
    to?: string;
    url?: string;
    position: "left" | "center" | "right";
    children?: NavLink[];
    disabled?: boolean;
    description?: string;
}

/**
 * Left navigation items
 */
const leftNavItems = computed(() => {
    if (!props.killmail) return [];

    return [
        {
            name: "DOTLAN",
            position: "left",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    url: `https://evemaps.dotlan.net/system/${props.killmail.system_name || ""}`,
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    url: `https://evemaps.dotlan.net/region/${props.killmail.region_name.en || ""}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "EVEEye",
            position: "left",
            children: [
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    url: `https://eveeye.com/?m=${encodeURIComponent(props.killmail.region_name.en || "")}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "EVE Missioneer",
            position: "left",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    url: `https://evemissioneer.com/s/${encodeURIComponent(props.killmail.system_name || "")}`,
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    url: `https://evemissioneer.com/r/${encodeURIComponent(props.killmail.region_id || "")}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "EveShip.fit",
            position: "left",
            children: [
                {
                    name: "Fitting",
                    description: `Fitting for ship: ${props.killmail.victim.ship_name.en}`,
                    url: `https://eveship.fit/?fit=killmail:${props.killmail.killmail_id || ""}/${props.killmail.killmail_hash || ""}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "EVERef",
            position: "left",
            children: [
                {
                    name: "Ship Group",
                    description: props.killmail.victim.ship_group_name.en,
                    url: `https://everef.net/groups/${props.killmail.victim.ship_group_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Ship",
                    description: props.killmail.victim.ship_name.en,
                    url: `https://everef.net/type/${props.killmail.victim.ship_id || ""}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "Jita.Space",
            position: "left",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    url: `https://jita.space/system/${props.killmail.system_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    url: `https://jita.space/region/${props.killmail.region_id || ""}`,
                    disabled: false,
                },
            ],
        },
        {
            name: "EVEWho",
            position: "left",
            children: [
                {
                    name: "Character",
                    description: props.killmail.victim.character_name,
                    url: `https://evewho.com/character/${props.killmail.victim.character_id || ""}`,
                    disabled: !props.killmail.victim.character_id,
                },
                {
                    name: "Corporation",
                    description: props.killmail.victim.corporation_name,
                    url: `https://evewho.com/corporation/${props.killmail.victim.corporation_id || ""}`,
                    disabled: !props.killmail.victim.corporation_id,
                },
                {
                    name: "Alliance",
                    description: props.killmail.victim.alliance_name,
                    url: `https://evewho.com/alliance/${props.killmail.victim.alliance_id || ""}`,
                    disabled: !props.killmail.victim.alliance_id || props.killmail.victim.alliance_id === 0,
                },
            ],
        },
        {
            name: "zKillboard",
            position: "left",
            children: [
                {
                    name: "Killmail",
                    description: props.killmail.killmail_id?.toString(),
                    url: `https://zkillboard.com/kill/${props.killmail.killmail_id || ""}`,
                    disabled: false,
                },
                {
                    name: "System",
                    description: props.killmail.system_name,
                    url: `https://zkillboard.com/system/${props.killmail.system_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    url: `https://zkillboard.com/region/${props.killmail.region_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Ship Group",
                    description: props.killmail.victim.ship_group_name.en,
                    url: `https://zkillboard.com/group/${props.killmail.victim.ship_group_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Ship",
                    description: props.killmail.victim.ship_name.en,
                    url: `https://zkillboard.com/item/${props.killmail.victim.ship_id || ""}`,
                    disabled: false,
                },
                {
                    name: "Character",
                    description: props.killmail.victim.character_name,
                    url: `https://zkillboard.com/character/${props.killmail.victim.character_id || ""}`,
                    disabled: !props.killmail.victim.character_id,
                },
                {
                    name: "Corporation",
                    description: props.killmail.victim.corporation_name,
                    url: `https://zkillboard.com/corporation/${props.killmail.victim.corporation_id || ""}`,
                    disabled: !props.killmail.victim.corporation_id,
                },
                {
                    name: "Alliance",
                    description: props.killmail.victim.alliance_name,
                    url: `https://zkillboard.com/alliance/${props.killmail.victim.alliance_id || ""}`,
                    disabled: !props.killmail.victim.alliance_id || props.killmail.victim.alliance_id === 0,
                },
            ],
        },
    ];
});

/**
 * Center navigation items - empty for this component
 */
const centerNavItems = computed(() => []);

/**
 * Right navigation items
 */
const rightNavItems = computed(() => {
    if (!props.killmail) return [];
    // Unwrap battle if it's a ref
    const battleValue = typeof props.battle === "object" && props.battle !== null && "value" in props.battle
        ? props.battle.value
        : props.battle;
    // Sibling link logic
    const siblingValue = typeof props.sibling === "number" ? props.sibling : null;

    const items = [
        // If battle is true include a link to the battle page
        ...(battleValue
            ? [
                {
                    name: "Battle Report",
                    position: "right",
                    to: `/battle/killmail/${props.killmail.killmail_id}`
                },
            ]
            : []),
        ...(siblingValue
            ? [
                {
                    name: "Sibling Killmail",
                    position: "right",
                    to: `/kill/${siblingValue}`
                },
            ]
            : []),
    ];
    return items;
});

/**
 * All navigation items combined
 */
const allNavItems = computed(() => [
    ...leftNavItems.value,
    ...centerNavItems.value,
    ...centerNavItems.value,
]);
</script>

<template>
    <nav class="flex items-center justify-between w-full gap-2 py-1">
        <!-- Left items -->
        <div class="flex items-center space-x-2">
            <template v-for="(link, index) in leftNavItems" :key="index">
                <!-- Dropdown menus -->
                <Dropdown v-if="link.children" v-model="dropdownStates[link.name || '']" position="bottom" align="start"
                    :max-height="60" width="auto" close-on-inner-click smart-position open-on-hover :hover-delay="100">
                    <template #trigger>
                        <div class="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors cursor-pointer text-gray-700 dark:text-gray-200" :title="link.label">
                            <span class="text-sm font-medium">{{ link.name }}</span>
                        </div>
                    </template>

                    <!-- Dropdown items -->
                    <div class="py-1 min-w-[240px]">
                        <div class="py-1">
                            <a v-for="(item, itemIndex) in link.children" :key="itemIndex" :href="item.url"
                                target="_blank" rel="noopener noreferrer" :class="[
                                    'flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                ]" :tabindex="item.disabled ? -1 : 0"
                                @click="item.disabled ? $event.preventDefault() : null">
                                <div class="flex flex-col">
                                    <span class="font-medium text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                                    <span v-if="item.description"
                                        class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                        {{ item.description }}
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                </Dropdown>
            </template>
        </div>

        <!-- Center items would go here -->
        <div class="flex items-center mx-auto">
            <template v-for="(link, index) in centerNavItems" :key="index">
                <!-- Similar structure to left items -->
            </template>
        </div>

        <!-- Right items -->
        <div class="flex items-center space-x-2">
            <template v-for="(link, index) in rightNavItems" :key="index">
                <!-- Direct link -->
                <a v-if="link.to" :href="link.to" class="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors cursor-pointer text-gray-700 dark:text-gray-200" :title="link.label">
                    <span class="text-sm font-medium">{{ link.name }}</span>
                </a>
                <!-- Dropdown menus -->
                <Dropdown v-if="link.children" v-model="dropdownStates[link.name || '']" position="bottom" align="end"
                    :max-height="60" width="auto" close-on-inner-click smart-position open-on-hover :hover-delay="100">
                    <template #trigger>
                        <div class="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors cursor-pointer text-gray-700 dark:text-gray-200" :title="link.label">
                            <span class="text-sm font-medium">{{ link.name }}</span>
                        </div>
                    </template>

                    <!-- Dropdown items -->
                    <div class="py-1 min-w-[240px]">
                        <div class="py-1">
                            <a v-for="(item, itemIndex) in link.children" :key="itemIndex" :href="item.url"
                                target="_blank" rel="noopener noreferrer" :class="[
                                    'flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                ]" :tabindex="item.disabled ? -1 : 0"
                                @click="item.disabled ? $event.preventDefault() : null">
                                <div class="flex flex-col">
                                    <span class="font-medium text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                                    <span v-if="item.description"
                                        class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                        {{ item.description }}
                                    </span>
                                </div>
                            </a>
                        </div>
                    </div>
                </Dropdown>
            </template>
        </div>
    </nav>
</template>
