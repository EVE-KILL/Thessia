<script setup lang="ts">
import { reactive } from 'vue';

const props = defineProps<{
    killmail: IKillmail | null;
    battle: boolean | { value: boolean } | null;
    siblings?: Array<{ killmail_id: number; victim: { ship_id: number; ship_name: { [key: string]: string } } }>;
}>();

// Track dropdown states for menus with children
const dropdownStates = reactive<Record<string, boolean>>({});

/**
 * Navbar link interface
 */
interface NavLink {
    name: string;
    to?: string;
    target?: string;
    position: "left" | "center" | "right";
    children?: NavLink[];
    disabled?: boolean;
    description?: string;
    logo?: string;
    iconOnly?: boolean; // Show only icon, no text
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
            logo: "https://evemaps.dotlan.net/favicon.ico",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    to: `https://evemaps.dotlan.net/system/${props.killmail.system_name || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    to: `https://evemaps.dotlan.net/region/${props.killmail.region_name.en || ""}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "EVEEye",
            position: "left",
            logo: "https://eveeye.com/img/eveeye.svg",
            children: [
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    to: `https://eveeye.com/?m=${encodeURIComponent(props.killmail.region_name.en || "")}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "EVE Missioneer",
            position: "left",
            logo: "https://evemissioneer.com/favicon.png",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    to: `https://evemissioneer.com/c/${encodeURIComponent(props.killmail.system_id || "")}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    to: `https://evemissioneer.com/r/${encodeURIComponent(props.killmail.region_id || "")}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "EveShip.fit",
            position: "left",
            logo: "https://eveship.fit/favicon.ico",
            children: [
                {
                    name: "Fitting",
                    description: `Fitting for ship: ${props.killmail.victim.ship_name.en}`,
                    to: `https://eveship.fit/?fit=killmail:${props.killmail.killmail_id || ""}/${props.killmail.killmail_hash || ""}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "EVERef",
            position: "left",
            logo: "https://everef.net/favicon.ico",
            children: [
                {
                    name: "Ship Group",
                    description: props.killmail.victim.ship_group_name.en,
                    to: `https://everef.net/groups/${props.killmail.victim.ship_group_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Ship",
                    description: props.killmail.victim.ship_name.en,
                    to: `https://everef.net/type/${props.killmail.victim.ship_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "Jita.Space",
            position: "left",
            logo: "https://www.jita.space/favicon.ico",
            children: [
                {
                    name: "System",
                    description: props.killmail.system_name,
                    to: `https://jita.space/system/${props.killmail.system_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    to: `https://jita.space/region/${props.killmail.region_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
            ],
        },
        {
            name: "EVEWho",
            position: "left",
            logo: "https://evewho.com/favicon.ico",
            children: [
                {
                    name: "Character",
                    description: props.killmail.victim.character_name,
                    to: `https://evewho.com/character/${props.killmail.victim.character_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.character_id,
                },
                {
                    name: "Corporation",
                    description: props.killmail.victim.corporation_name,
                    to: `https://evewho.com/corporation/${props.killmail.victim.corporation_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.corporation_id,
                },
                {
                    name: "Alliance",
                    description: props.killmail.victim.alliance_name,
                    to: `https://evewho.com/alliance/${props.killmail.victim.alliance_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.alliance_id || props.killmail.victim.alliance_id === 0,
                },
            ],
        },
        {
            name: "zKillboard",
            position: "left",
            logo: "https://zkillboard.com/img/wreck.png",
            children: [
                {
                    name: "Killmail",
                    description: props.killmail.killmail_id?.toString(),
                    to: `https://zkillboard.com/kill/${props.killmail.killmail_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "System",
                    description: props.killmail.system_name,
                    to: `https://zkillboard.com/system/${props.killmail.system_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Region",
                    description: props.killmail.region_name.en,
                    to: `https://zkillboard.com/region/${props.killmail.region_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Ship Group",
                    description: props.killmail.victim.ship_group_name.en,
                    to: `https://zkillboard.com/group/${props.killmail.victim.ship_group_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Ship",
                    description: props.killmail.victim.ship_name.en,
                    to: `https://zkillboard.com/item/${props.killmail.victim.ship_id || ""}`,
                    target: '_blank',
                    disabled: false,
                },
                {
                    name: "Character",
                    description: props.killmail.victim.character_name,
                    to: `https://zkillboard.com/character/${props.killmail.victim.character_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.character_id,
                },
                {
                    name: "Corporation",
                    description: props.killmail.victim.corporation_name,
                    to: `https://zkillboard.com/corporation/${props.killmail.victim.corporation_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.corporation_id,
                },
                {
                    name: "Alliance",
                    description: props.killmail.victim.alliance_name,
                    to: `https://zkillboard.com/alliance/${props.killmail.victim.alliance_id || ""}`,
                    target: '_blank',
                    disabled: !props.killmail.victim.alliance_id || props.killmail.victim.alliance_id === 0,
                },
            ],
        },
        {
            name: "RIFT Intel Fusion",
            position: "left",
            to: 'https://riftforeve.online/',
            target: '_blank',
            logo: '/images/rift-intel-fusion-tool-256.png'
        },
    ];
});

/**
 * Right navigation items
 */
const rightNavItems = computed<NavLink[]>(() => {
    if (!props.killmail) return [];
    // Unwrap battle if it's a ref
    const battleValue = typeof props.battle === 'object' && props.battle !== null && 'value' in props.battle
        ? props.battle.value
        : props.battle;
    const items: NavLink[] = [];
    if (battleValue) {
        items.push({
            name: 'Battle Report',
            position: 'right',
            to: `/battle/${props.killmail.killmail_id}?killmail=${props.killmail.killmail_id}`,
            target: '',
        });
    }
    const sibs = Array.isArray(props.siblings) ? props.siblings : [];
    if (sibs.length === 1) {
        items.push({
            name: 'Sibling Killmail',
            position: 'right',
            to: `/kill/${sibs[0]?.killmail_id}`,
            target: '',
        });
    } else if (sibs.length > 1) {
        items.push({
            name: 'Sibling Killmails',
            position: 'right',
            children: sibs.map((s) => ({
                name: s.victim.ship_name?.en || 'Unknown Ship',
                position: 'right' as const,
                to: `/kill/${s.killmail_id}`,
                target: '',
            }))
        });
    }
    return items;
});
</script>

<template>
    <nav class="flex items-center justify-between w-full gap-1 py-1">
        <!-- Left items -->
        <div class="flex items-center space-x-1">
            <template v-for="(link, index) in leftNavItems" :key="index">
                <!-- Direct link -->
                <NuxtLink v-if="link.to" :to="link.to" :target="link.target" rel="noopener noreferrer" :class="[
                    'flex items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-200',
                    (link as any).iconOnly ? 'p-1.5' : 'py-1.5 px-2'
                ]" :title="link.name">
                    <img v-if="link.logo" :src="link.logo" :alt="`${link.name} logo`"
                        :class="(link as any).iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-2 flex-shrink-0'">
                    <span v-if="!(link as any).iconOnly" class="text-sm font-medium">{{ link.name }}</span>
                </NuxtLink>
                <!-- Dropdown menus -->
                <Dropdown v-else-if="link.children" v-model="dropdownStates[link.name]" position="bottom" align="start"
                    :max-height="60" width="auto" close-on-inner-click smart-position open-on-hover :hover-delay="100"
                    disable-click-outside>
                    <template #trigger>
                        <div :class="[
                            'flex items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-200',
                            (link as any).iconOnly ? 'p-1.5' : 'py-1.5 px-2'
                        ]" :title="link.name">
                            <img v-if="link.logo" :src="link.logo" :alt="`${link.name} logo`"
                                :class="(link as any).iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-2 flex-shrink-0'">
                            <span v-if="!(link as any).iconOnly" class="text-sm font-medium">{{ link.name }}</span>
                        </div>
                    </template>

                    <!-- Dropdown items -->
                    <div class="py-1 min-w-[240px]">
                        <div class="py-1">
                            <NuxtLink v-for="(item, itemIndex) in link.children" :key="itemIndex" :to="item.to"
                                :target="item.target" rel="noopener noreferrer" :class="[
                                    'flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                ]" :tabindex="item.disabled ? -1 : 0"
                                @click="item.disabled ? $event.preventDefault() : (dropdownStates[link.name] = false)">
                                <div class="flex flex-col">
                                    <span class="font-medium text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                                    <span v-if="item.description"
                                        class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                        {{ item.description }}
                                    </span>
                                </div>
                            </NuxtLink>
                        </div>
                    </div>
                </Dropdown>
            </template>
        </div>

        <!-- Right items -->
        <div class="flex items-center space-x-1">
            <template v-for="(link, index) in rightNavItems" :key="index">
                <!-- Direct link -->
                <NuxtLink v-if="link.to" :to="link.to" :class="[
                    'flex items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-200',
                    link.iconOnly ? 'p-1.5' : 'py-1.5 px-2'
                ]" :title="link.name">
                    <img v-if="link.logo" :src="link.logo" :alt="`${link.name} logo`"
                        :class="link.iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-2 flex-shrink-0'">
                    <span v-if="!link.iconOnly" class="text-sm font-medium">{{ link.name }}</span>
                </NuxtLink>
                <!-- Dropdown menus -->
                <Dropdown v-if="link.children" v-model="dropdownStates[link.name]" position="bottom" align="end"
                    :max-height="60" width="auto" close-on-inner-click smart-position open-on-hover :hover-delay="100"
                    disable-click-outside>
                    <template #trigger>
                        <div :class="[
                            'flex items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-200',
                            link.iconOnly ? 'p-1.5' : 'py-1.5 px-2'
                        ]" :title="link.name">
                            <img v-if="link.logo" :src="link.logo" :alt="`${link.name} logo`"
                                :class="link.iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-2 flex-shrink-0'">
                            <span v-if="!link.iconOnly" class="text-sm font-medium">{{ link.name }}</span>
                        </div>
                    </template>

                    <!-- Dropdown items -->
                    <div class="py-1 min-w-[240px]">
                        <div class="py-1">
                            <NuxtLink v-for="(item, itemIndex) in link.children" :key="itemIndex" :to="item.to"
                                :target="item.target" rel="noopener noreferrer" :class="[
                                    'flex px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                ]" :tabindex="item.disabled ? -1 : 0"
                                @click="item.disabled ? $event.preventDefault() : (dropdownStates[link.name] = false)">
                                <div class="flex flex-col">
                                    <span class="font-medium text-gray-700 dark:text-gray-200">{{ item.name }}</span>
                                    <span v-if="item.description"
                                        class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                        {{ item.description }}
                                    </span>
                                </div>
                            </NuxtLink>
                        </div>
                    </div>
                </Dropdown>
            </template>
        </div>
    </nav>
</template>
