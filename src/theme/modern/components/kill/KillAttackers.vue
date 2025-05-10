<template>
    <div class="kill-attackers">
        <!-- Final Blow Section -->
        <div v-if="finalBlowAttacker" class="section final-blow-section mb-4">
            <h3 class="section-title">{{ t('killAttackers.finalBlow') }}</h3>
            <div class="key-attacker-info flex items-start gap-3">
                <!-- Portraits Block -->
                <div class="attacker-portraits-layout flex items-start gap-2">
                    <!-- Character Image -->
                    <NuxtLink v-if="finalBlowAttacker.character_id"
                        :to="`/character/${finalBlowAttacker.character_id}`">
                        <Image :type="'character'" :id="finalBlowAttacker.character_id" :size="64"
                            class="portrait-image" />
                    </NuxtLink>
                    <div v-else class="portrait-image placeholder-main" style="width: 64px; height: 64px;"></div>

                    <!-- Stacked Corp/Alliance -->
                    <div class="stacked-icons-container">
                        <NuxtLink v-if="finalBlowAttacker.corporation_id"
                            :to="`/corporation/${finalBlowAttacker.corporation_id}`" class="h-[32px]">
                            <Image :type="'corporation'" :id="finalBlowAttacker.corporation_id" :size="32"
                                class="portrait-image" />
                        </NuxtLink>
                        <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;"></div>
                        <NuxtLink v-if="finalBlowAttacker.alliance_id"
                            :to="`/alliance/${finalBlowAttacker.alliance_id}`" class="h-[32px]">
                            <Image :type="'alliance'" :id="finalBlowAttacker.alliance_id" :size="32"
                                class="portrait-image" />
                        </NuxtLink>
                        <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;"></div>
                    </div>

                    <!-- Ship Image -->
                    <NuxtLink v-if="finalBlowAttacker.ship_id" :to="`/item/${finalBlowAttacker.ship_id}`">
                        <Image :type="'type-render'" :id="finalBlowAttacker.ship_id" :size="64"
                            class="ship-image ml-2" />
                    </NuxtLink>
                    <div v-else class="ship-image placeholder-main ml-2" style="width: 64px; height: 64px;"></div>
                </div>
                <!-- Info Block -->
                <div class="attacker-details flex flex-col min-w-0 flex-1">
                    <!-- Character/Corp/Alliance Info -->
                    <div class="entity-info flex flex-col gap-0.5">
                        <div class="entity-name-line name-character truncate">
                            <NuxtLink v-if="finalBlowAttacker.character_id"
                                :to="`/character/${finalBlowAttacker.character_id}`" class="entity-link">
                                {{ finalBlowAttacker.character_name || $t('unknown') }}
                            </NuxtLink>
                            <span v-else>{{ finalBlowAttacker.character_name || $t('unknown') }}</span>
                        </div>
                        <div class="entity-name-line name-corporation truncate">
                            <NuxtLink v-if="finalBlowAttacker.corporation_id"
                                :to="`/corporation/${finalBlowAttacker.corporation_id}`" class="entity-link">
                                {{ finalBlowAttacker.corporation_name }}
                            </NuxtLink>
                            <span v-else>{{ finalBlowAttacker.corporation_name || '' }}</span>
                        </div>
                        <div class="entity-name-line name-alliance-faction truncate">
                            <NuxtLink v-if="finalBlowAttacker.alliance_id"
                                :to="`/alliance/${finalBlowAttacker.alliance_id}`" class="entity-link">
                                {{ finalBlowAttacker.alliance_name }}
                            </NuxtLink>
                            <span v-else>{{ finalBlowAttacker.alliance_name || '' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ship/Weapon/Damage Info Row - Single line with proper wrapping -->
            <div class="attacker-meta-info mt-3">
                <!-- Combined ship, weapon and damage info in one line with separators -->
                <div class="combined-meta-info">
                    <!-- Ship and Weapon Group - Left side -->
                    <div class="ship-weapon-group">
                        <!-- Ship Info -->
                        <div class="ship-info flex items-center">
                            <Image v-if="finalBlowAttacker.ship_id" :type="'item'" :id="finalBlowAttacker.ship_id"
                                :size="24" class="flex-shrink-0" />
                            <span class="ship-name font-medium ml-0.5">
                                <NuxtLink v-if="finalBlowAttacker.ship_id" :to="`/item/${finalBlowAttacker.ship_id}`"
                                    class="entity-link">
                                    {{ getLocalizedString(finalBlowAttacker.ship_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(finalBlowAttacker.ship_name, currentLocale) ||
                                    $t('unknown') }}</span>
                            </span>
                        </div>

                        <!-- Separator -->
                        <div class="separator text-gray-400 dark:text-gray-500">—</div>

                        <!-- Weapon Info -->
                        <div class="weapon-info flex items-center">
                            <Image v-if="finalBlowAttacker.weapon_type_id" :type="'item'"
                                :id="finalBlowAttacker.weapon_type_id" :size="24" class="flex-shrink-0" />
                            <span class="weapon-name ml-0.5">
                                <NuxtLink v-if="finalBlowAttacker.weapon_type_id"
                                    :to="`/item/${finalBlowAttacker.weapon_type_id}`" class="entity-link">
                                    {{ getLocalizedString(finalBlowAttacker.weapon_type_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(finalBlowAttacker.weapon_type_name,
                                    currentLocale) || $t('unknown') }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Damage info - Right side -->
                    <div class="damage-info flex items-center">
                        <Icon name="lucide:zap" class="inline-icon damage-icon mr-0.5 w-4 h-4 text-red-500" />
                        <span class="damage-value font-semibold text-red-500 text-sm">
                            {{ formatNumber(finalBlowAttacker.damage_done || 0) }}
                            <span class="damage-percent text-xs text-gray-500 dark:text-gray-400 ml-0.5">({{
                                getDamagePercentage(finalBlowAttacker) }}%)</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top Damage Section -->
        <div v-if="topDamageAttacker && topDamageAttacker !== finalBlowAttacker"
            class="section top-damage-section mb-4">
            <h3 class="section-title">{{ t('killAttackers.topDamage') }}</h3>
            <div class="key-attacker-info flex items-start gap-3">
                <!-- Portraits Block -->
                <div class="attacker-portraits-layout flex items-start gap-2">
                    <!-- Character Image -->
                    <NuxtLink v-if="topDamageAttacker.character_id"
                        :to="`/character/${topDamageAttacker.character_id}`">
                        <Image :type="'character'" :id="topDamageAttacker.character_id" :size="64"
                            class="portrait-image" />
                    </NuxtLink>
                    <div v-else class="portrait-image placeholder-main" style="width: 64px; height: 64px;"></div>

                    <!-- Stacked Corp/Alliance -->
                    <div class="stacked-icons-container">
                        <NuxtLink v-if="topDamageAttacker.corporation_id"
                            :to="`/corporation/${topDamageAttacker.corporation_id}`" class="h-[32px]">
                            <Image :type="'corporation'" :id="topDamageAttacker.corporation_id" :size="32"
                                class="portrait-image" />
                        </NuxtLink>
                        <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;"></div>
                        <NuxtLink v-if="topDamageAttacker.alliance_id"
                            :to="`/alliance/${topDamageAttacker.alliance_id}`" class="h-[32px]">
                            <Image :type="'alliance'" :id="topDamageAttacker.alliance_id" :size="32"
                                class="portrait-image" />
                        </NuxtLink>
                        <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;"></div>
                    </div>

                    <!-- Ship Image -->
                    <NuxtLink v-if="topDamageAttacker.ship_id" :to="`/item/${topDamageAttacker.ship_id}`">
                        <Image :type="'type-render'" :id="topDamageAttacker.ship_id" :size="64"
                            class="ship-image ml-2" />
                    </NuxtLink>
                    <div v-else class="ship-image placeholder-main ml-2" style="width: 64px; height: 64px;"></div>
                </div>
                <!-- Info Block -->
                <div class="attacker-details flex flex-col min-w-0 flex-1">
                    <div class="entity-info flex flex-col gap-0.5">
                        <div class="entity-name-line name-character truncate">
                            <NuxtLink v-if="topDamageAttacker.character_id"
                                :to="`/character/${topDamageAttacker.character_id}`" class="entity-link">
                                {{ topDamageAttacker.character_name || $t('unknown') }}
                            </NuxtLink>
                            <span v-else>{{ topDamageAttacker.character_name || $t('unknown') }}</span>
                        </div>
                        <div class="entity-name-line name-corporation truncate">
                            <NuxtLink v-if="topDamageAttacker.corporation_id"
                                :to="`/corporation/${topDamageAttacker.corporation_id}`" class="entity-link">
                                {{ topDamageAttacker.corporation_name }}
                            </NuxtLink>
                            <span v-else>{{ topDamageAttacker.corporation_name || '' }}</span>
                        </div>
                        <div class="entity-name-line name-alliance-faction truncate">
                            <NuxtLink v-if="topDamageAttacker.alliance_id"
                                :to="`/alliance/${topDamageAttacker.alliance_id}`" class="entity-link">
                                {{ topDamageAttacker.alliance_name }}
                            </NuxtLink>
                            <span v-else>{{ topDamageAttacker.alliance_name || '' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ship/Weapon/Damage Info Row - Single line with proper wrapping -->
            <div class="attacker-meta-info mt-3">
                <!-- Combined ship, weapon and damage info in one line with separators -->
                <div class="combined-meta-info">
                    <!-- Ship and Weapon Group - Left side -->
                    <div class="ship-weapon-group">
                        <!-- Ship Info -->
                        <div class="ship-info flex items-center">
                            <Image v-if="topDamageAttacker.ship_id" :type="'item'" :id="topDamageAttacker.ship_id"
                                :size="24" class="flex-shrink-0" />
                            <span class="ship-name font-medium ml-0.5">
                                <NuxtLink v-if="topDamageAttacker.ship_id" :to="`/item/${topDamageAttacker.ship_id}`"
                                    class="entity-link">
                                    {{ getLocalizedString(topDamageAttacker.ship_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(topDamageAttacker.ship_name, currentLocale) ||
                                    $t('unknown') }}</span>
                            </span>
                        </div>

                        <!-- Separator -->
                        <div class="separator text-gray-400 dark:text-gray-500">—</div>

                        <!-- Weapon Info -->
                        <div class="weapon-info flex items-center">
                            <Image v-if="topDamageAttacker.weapon_type_id" :type="'item'"
                                :id="topDamageAttacker.weapon_type_id" :size="24" class="flex-shrink-0" />
                            <span class="weapon-name ml-0.5">
                                <NuxtLink v-if="topDamageAttacker.weapon_type_id"
                                    :to="`/item/${topDamageAttacker.weapon_type_id}`" class="entity-link">
                                    {{ getLocalizedString(topDamageAttacker.weapon_type_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(topDamageAttacker.weapon_type_name,
                                    currentLocale) || $t('unknown') }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Damage info - Right side -->
                    <div class="damage-info flex items-center">
                        <Icon name="lucide:zap" class="inline-icon damage-icon mr-0.5 w-4 h-4 text-red-500" />
                        <span class="damage-value font-semibold text-red-500 text-sm">
                            {{ formatNumber(topDamageAttacker.damage_done || 0) }}
                            <span class="damage-percent text-xs text-gray-500 dark:text-gray-400 ml-0.5">({{
                                getDamagePercentage(topDamageAttacker) }}%)</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Organizations Involved Section -->
        <div class="section organizations-section mb-4">
            <div class="section-header flex items-center cursor-pointer" @click="toggleOrganizations">
                <h3 class="section-title flex-1">{{ t('killAttackers.organizationsInvolved') }}</h3>
                <span class="toggle-icon ml-2">
                    <Icon :name="isOrganizationsOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
                </span>
            </div>
            <transition name="fadeIn">
                <div v-show="isOrganizationsOpen" class="organizations-content mt-2">
                    <div v-for="(alliance, index) in organizationsTree.alliances" :key="`alliance-${index}`"
                        class="alliance-group mb-2">
                        <div class="alliance-name font-semibold flex items-center">
                            <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`" class="entity-link">
                                <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24"
                                    class="org-icon" />
                                <span>{{ alliance.name }}</span>
                                <span class="count ml-2">({{ alliance.count }})</span>
                            </NuxtLink>
                            <span v-else>
                                <span>{{ alliance.name }}</span>
                                <span class="count ml-2">({{ alliance.count }})</span>
                            </span>
                        </div>
                        <ul class="corporation-list ml-6">
                            <li v-for="(corp, corpIndex) in alliance.corporations"
                                :key="`corp-${alliance.id}-${corpIndex}`" class="corporation-item">
                                <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                    class="entity-link corporation-name">
                                    <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                        class="org-icon" />
                                    <span>{{ corp.name }}</span>
                                    <span class="count ml-1">({{ corp.count }})</span>
                                </NuxtLink>
                                <span v-else>
                                    <span>{{ corp.name }}</span>
                                    <span class="count ml-1">({{ corp.count }})</span>
                                </span>
                            </li>
                        </ul>
                    </div>
                    <div v-if="organizationsTree.noAllianceCorporations.length > 0" class="no-alliance-section mt-2">
                        <div class="no-alliance-header font-semibold flex items-center">
                            <span>{{ t('corporationsWithoutAlliance') }}</span>
                        </div>
                        <ul class="corporation-list ml-6">
                            <li v-for="(corp, index) in organizationsTree.noAllianceCorporations"
                                :key="`no-alliance-corp-${index}`" class="corporation-item standalone">
                                <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`"
                                    class="entity-link corporation-name">
                                    <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24"
                                        class="org-icon" />
                                    <span>{{ corp.name }}</span>
                                    <span class="count ml-1">({{ corp.count }})</span>
                                </NuxtLink>
                                <span v-else>
                                    <span>{{ corp.name }}</span>
                                    <span class="count ml-1">({{ corp.count }})</span>
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </transition>
        </div>

        <!-- Attackers Table Section -->
        <div class="section attackers-table-section mb-4">
            <h3 class="section-title">{{ t('attackers') }} ({{ attackers.length }})</h3>
            <div v-for="(attacker, index) in visibleAttackers" :key="`attacker-${index}`" class="attacker-section"
                :class="{ 'final-blow': attacker.final_blow, 'top-damage': attacker === topDamageAttacker }">
                <div class="key-attacker-info flex items-start gap-3">
                    <!-- Portraits Block -->
                    <div class="attacker-portraits-layout flex items-start gap-2">
                        <!-- Character Image -->
                        <NuxtLink v-if="attacker.character_id" :to="`/character/${attacker.character_id}`">
                            <Image :type="'character'" :id="attacker.character_id" :size="64" class="portrait-image" />
                        </NuxtLink>
                        <div v-else class="portrait-image placeholder-main" style="width: 64px; height: 64px;"></div>

                        <!-- Stacked Corp/Alliance -->
                        <div class="stacked-icons-container">
                            <NuxtLink v-if="attacker.corporation_id" :to="`/corporation/${attacker.corporation_id}`"
                                class="h-[32px]">
                                <Image :type="'corporation'" :id="attacker.corporation_id" :size="32"
                                    class="portrait-image" />
                            </NuxtLink>
                            <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;">
                            </div>
                            <NuxtLink v-if="attacker.alliance_id" :to="`/alliance/${attacker.alliance_id}`"
                                class="h-[32px]">
                                <Image :type="'alliance'" :id="attacker.alliance_id" :size="32"
                                    class="portrait-image" />
                            </NuxtLink>
                            <div v-else class="portrait-image placeholder-stacked h-[32px]" style="width: 32px;">
                            </div>
                        </div>

                        <!-- Ship Image -->
                        <NuxtLink v-if="attacker.ship_id" :to="`/item/${attacker.ship_id}`">
                            <Image :type="'type-render'" :id="attacker.ship_id" :size="64" class="ship-image ml-2" />
                        </NuxtLink>
                        <div v-else class="ship-image placeholder-main ml-2" style="width: 64px; height: 64px;"></div>
                    </div>

                    <!-- Info Block -->
                    <div class="attacker-details flex flex-col min-w-0 flex-1">
                        <!-- Character/Corp/Alliance Info -->
                        <div class="entity-info flex flex-col gap-0.5">
                            <div class="entity-name-line name-character truncate">
                                <NuxtLink v-if="attacker.character_id" :to="`/character/${attacker.character_id}`"
                                    class="entity-link">
                                    {{ attacker.character_name || $t('unknown') }}
                                    <UBadge v-if="attacker.final_blow" variant="solid" color="primary" size="xs"
                                        class="final-blow-badge ml-1">
                                        FB
                                    </UBadge>
                                    <UBadge v-if="attacker === topDamageAttacker" variant="solid" color="error"
                                        size="xs" class="top-damage-badge ml-1">
                                        TD
                                    </UBadge>
                                </NuxtLink>
                                <span v-else>
                                    {{ attacker.character_name || $t('unknown') }}
                                    <UBadge v-if="attacker.final_blow" variant="solid" color="primary" size="xs"
                                        class="final-blow-badge ml-1">
                                        FB
                                    </UBadge>
                                    <UBadge v-if="attacker === topDamageAttacker" variant="solid" color="error"
                                        size="xs" class="top-damage-badge ml-1">
                                        TD
                                    </UBadge>
                                </span>
                            </div>
                            <div class="entity-name-line name-corporation truncate">
                                <NuxtLink v-if="attacker.corporation_id" :to="`/corporation/${attacker.corporation_id}`"
                                    class="entity-link">
                                    {{ attacker.corporation_name }}
                                </NuxtLink>
                                <span v-else>{{ attacker.corporation_name || '' }}</span>
                            </div>
                            <div class="entity-name-line name-alliance-faction truncate">
                                <NuxtLink v-if="attacker.alliance_id" :to="`/alliance/${attacker.alliance_id}`"
                                    class="entity-link">
                                    {{ attacker.alliance_name }}
                                </NuxtLink>
                                <span v-else>{{ attacker.alliance_name || '' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ship/Weapon/Damage Info Row - Single line with proper wrapping -->
                <div class="attacker-meta-info mt-3">
                    <!-- Combined ship, weapon and damage info in one line with separators -->
                    <div class="combined-meta-info">
                        <!-- Ship and Weapon Group - Left side -->
                        <div class="ship-weapon-group">
                            <!-- Ship Info -->
                            <div class="ship-info flex items-center">
                                <Image v-if="attacker.ship_id" :type="'item'" :id="attacker.ship_id" :size="24"
                                    class="flex-shrink-0" />
                                <span class="ship-name font-medium ml-0.5">
                                    <NuxtLink v-if="attacker.ship_id" :to="`/item/${attacker.ship_id}`"
                                        class="entity-link">
                                        {{ getLocalizedString(attacker.ship_name, currentLocale) }}
                                    </NuxtLink>
                                    <span v-else>{{ getLocalizedString(attacker.ship_name, currentLocale) ||
                                        $t('unknown') }}</span>
                                </span>
                            </div>

                            <!-- Separator -->
                            <div class="separator text-gray-400 dark:text-gray-500">—</div>

                            <!-- Weapon Info -->
                            <div class="weapon-info flex items-center">
                                <Image v-if="attacker.weapon_type_id" :type="'item'" :id="attacker.weapon_type_id"
                                    :size="24" class="flex-shrink-0" />
                                <span class="weapon-name ml-0.5">
                                    <NuxtLink v-if="attacker.weapon_type_id" :to="`/item/${attacker.weapon_type_id}`"
                                        class="entity-link">
                                        {{ getLocalizedString(attacker.weapon_type_name, currentLocale) }}
                                    </NuxtLink>
                                    <span v-else>{{ getLocalizedString(attacker.weapon_type_name,
                                        currentLocale) || $t('unknown') }}</span>
                                </span>
                            </div>
                        </div>

                        <!-- Damage info - Right side -->
                        <div class="damage-info flex items-center">
                            <Icon name="lucide:zap" class="inline-icon damage-icon mr-0.5 w-4 h-4 text-red-500" />
                            <span class="damage-value font-semibold text-red-500 text-sm">
                                {{ formatNumber(attacker.damage_done || 0) }}
                                <span class="damage-percent text-xs text-gray-500 dark:text-gray-400 ml-0.5">({{
                                    getDamagePercentage(attacker) }}%)</span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Border between attackers except for the last one -->
                <div v-if="index < visibleAttackers.length - 1"
                    class="attacker-separator border-t border-gray-200 dark:border-gray-700 mt-2"></div>
            </div>

            <!-- "Show more" button when attackers exceed the limit -->
            <div v-if="sortedAttackers.length > MAX_VISIBLE_ATTACKERS" class="flex justify-center mt-4">
                <UButton size="sm" variant="ghost" color="neutral" @click="toggleAttackers" class="text-sm"
                    :icon="showAllAttackers ? 'lucide:chevron-up' : 'lucide:chevron-down'">
                    {{ showAllAttackers ? t('killAttackers.showLess') : t('killAttackers.showMore', {
                        count:
                            sortedAttackers.length - MAX_VISIBLE_ATTACKERS
                    }) }}
                </UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IAttacker, IKillmail } from "~/server/interfaces/IKillmail";

// i18n setup
const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Props definition - accept either full killmail or just attackers array
const props = defineProps<{
    killmail?: IKillmail | null;
    attackers?: IAttacker[];
}>();

// Function to toggle organizations visibility
function toggleOrganizations() {
    isOrganizationsOpen.value = !isOrganizationsOpen.value;
}

// Derive attackers from either props source
const attackers = computed<IAttacker[]>(() => {
    if (props.attackers && props.attackers.length > 0) {
        return props.attackers;
    }
    return props.killmail?.attackers || [];
});

// Sort attackers by damage only (don't prioritize final blow)
const sortedAttackers = computed(() => {
    return [...attackers.value].sort((a, b) => {
        // Sort only by damage done (highest first)
        return (b.damage_done || 0) - (a.damage_done || 0);
    });
});

// Calculate total damage for percentages
const totalDamage = computed(() => {
    return attackers.value.reduce((sum, attacker) => sum + (attacker.damage_done || 0), 0);
});

// Find final blow attacker
const finalBlowAttacker = computed<IAttacker | null>(() => {
    return attackers.value.find((attacker) => attacker.final_blow) || null;
});

// Find top damage attacker
const topDamageAttacker = computed<IAttacker | null>(() => {
    if (attackers.value.length === 0) return null;

    return attackers.value.reduce((highest, current) => {
        return (current.damage_done || 0) > (highest.damage_done || 0) ? current : highest;
    }, attackers.value[0]);
});

// Organization tree for the structured organization display
interface Organization {
    id: number;
    name: string;
    count: number;
}

interface Alliance extends Organization {
    corporations: Organization[];
}

interface OrganizationTree {
    alliances: Alliance[];
    noAllianceCorporations: Organization[];
}

// Build organization tree from attackers
const organizationsTree = computed<OrganizationTree>(() => {
    const alliances: Record<string, Alliance> = {};
    const noAllianceCorporations: Record<string, Organization> = {};

    // Process each attacker
    attackers.value.forEach((attacker) => {
        // Process alliance
        if (attacker.alliance_id && attacker.alliance_name) {
            const allianceKey = `alliance_${attacker.alliance_id}`;
            if (!alliances[allianceKey]) {
                alliances[allianceKey] = {
                    id: attacker.alliance_id,
                    name: attacker.alliance_name,
                    count: 0,
                    corporations: [],
                };
            }
            alliances[allianceKey].count++;

            // Process corporation within alliance
            if (attacker.corporation_id && attacker.corporation_name) {
                const corpKey = `corp_${attacker.corporation_id}`;
                const allianceCorporations = alliances[allianceKey].corporations;

                // Check if corp already exists in alliance
                const existingCorp = allianceCorporations.find(
                    (corp) => corp.id === attacker.corporation_id,
                );

                if (existingCorp) {
                    existingCorp.count++;
                } else {
                    allianceCorporations.push({
                        id: attacker.corporation_id,
                        name: attacker.corporation_name,
                        count: 1,
                    });
                }
            }
        }
        // Process corporations without alliance
        else if (attacker.corporation_id && attacker.corporation_name) {
            const corpKey = `corp_${attacker.corporation_id}`;
            if (!noAllianceCorporations[corpKey]) {
                noAllianceCorporations[corpKey] = {
                    id: attacker.corporation_id,
                    name: attacker.corporation_name,
                    count: 0,
                };
            }
            noAllianceCorporations[corpKey].count++;
        }
    });

    // Sort corporations within alliances by count
    Object.values(alliances).forEach((alliance) => {
        alliance.corporations.sort((a, b) => b.count - a.count);
    });

    // Convert to arrays and sort
    const alliancesArray = Object.values(alliances).sort((a, b) => b.count - a.count);
    const noAllianceCorporationsArray = Object.values(noAllianceCorporations).sort(
        (a, b) => b.count - a.count,
    );

    return {
        alliances: alliancesArray,
        noAllianceCorporations: noAllianceCorporationsArray,
    };
});

// Compute total entities in organizations tree to determine if we should auto-expand
const totalOrgsCount = computed(() => {
    return organizationsTree.value.alliances.length + organizationsTree.value.noAllianceCorporations.length;
});

// State for collapsible sections - open by default for small groups
const isOrganizationsOpen = ref(false);

// State for limiting displayed attackers
const MAX_VISIBLE_ATTACKERS = 10; // Fixed maximum visible attackers
const showAllAttackers = ref(false);

// Compute attackers that should be visible based on toggle state
const visibleAttackers = computed(() => {
    if (showAllAttackers.value || sortedAttackers.value.length <= MAX_VISIBLE_ATTACKERS) {
        return sortedAttackers.value;
    }
    return sortedAttackers.value.slice(0, MAX_VISIBLE_ATTACKERS);
});

// Function to toggle attackers visibility
function toggleAttackers() {
    showAllAttackers.value = !showAllAttackers.value;
}

// Set initial state when organizations data is ready
watch(totalOrgsCount, (count) => {
    // Automatically expand if there are fewer than 5 total entities
    if (count < 5 && count > 0) {
        isOrganizationsOpen.value = true;
    }
}, { immediate: true });

/**
 * Gets the localized string from a translation object using the current locale
 */
function getLocalizedString(obj: any, locale: string): string {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
}

/**
 * Format a number with commas as thousands separators
 */
function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Get damage percentage for an attacker
 */
function getDamagePercentage(attacker: IAttacker): string {
    if (!attacker || !attacker.damage_done || totalDamage.value === 0) return "0";
    return ((attacker.damage_done / totalDamage.value) * 100).toFixed(1);
}

/**
 * Gets the total count of corporations across alliances and standalone corps
 */
function getTotalCorporationsCount(): number {
    const allianceCorpsCount = organizationsTree.value.alliances.reduce(
        (sum, alliance) => sum + alliance.corporations.length,
        0,
    );
    return allianceCorpsCount + organizationsTree.value.noAllianceCorporations.length;
}
</script>

<style scoped>
.kill-attackers {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    --color-background-hover: light-dark(rgba(245, 245, 245, 0.95), rgba(40, 40, 40, 0.95));
}

/* Key Attacker Styles */
.key-attacker-info {
    display: flex;
    gap: 1rem;
    padding: 0.25rem 0.25rem 0.1rem;
    width: 100%;
    border-bottom: none;
    /* Remove border since we added border to the meta section */
}

.attacker-portraits-layout {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.portrait-image {
    border-radius: 50%;
}

.stacked-icons-container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 32px;
    height: 64px;
    gap: 0;
    overflow: hidden;
    /* Prevent any overflow */
}

.ship-image {
    border-radius: 0.25rem;
    margin-left: 0.5rem;
}

.attacker-details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
}

.entity-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.entity-name-line {
    width: 100%;
    text-align: left;
    font-size: 0.95rem;
    line-height: 1.3;
    color: light-dark(#525252, #b8b8b8);
}

.entity-name-line.name-character {
    font-weight: 600;
    color: light-dark(#1f2937, #f3f4f6);
    font-size: 1rem;
}

.entity-name-line.name-corporation {
    font-size: 0.9rem;
    color: light-dark(#374151, #d1d5db);
}

.entity-name-line.name-alliance-faction {
    font-size: 0.85rem;
    color: light-dark(#4b5563, #9ca3af);
}

.attacker-meta-info {
    padding: 0.5rem 0.75rem 0;
    border-top: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    margin-top: 0.25rem;
    background-color: transparent;
}

/* Updated meta-info spacing and layout */
.combined-meta-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.ship-weapon-group {
    display: flex;
    align-items: center;
    flex-grow: 1;
    min-width: 0;
    max-width: 70%;
}

.ship-info {
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    font-weight: 500;
    line-height: 1.4;
    color: light-dark(#525252, #d1d5db);
    min-width: 0;
}

.weapon-info {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    line-height: 1.4;
    color: light-dark(#525252, #d1d5db);
    min-width: 0;
}

.damage-info {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 90px;
    /* Ensure consistent space for damage values */
    margin-left: auto;
}

.damage-value {
    font-weight: 600;
    color: #ef4444;
    font-size: 0.9rem;
    line-height: 1.2;
    display: flex;
    align-items: center;
    text-align: right;
}

.damage-percent {
    color: light-dark(#9ca3af, #9ca3af);
    font-size: 0.75rem;
    font-weight: normal;
    white-space: nowrap;
}

.damage-icon {
    color: #ef4444;
    flex-shrink: 0;
    margin-right: 0.15rem;
    /* Tighter spacing */
}

.separator {
    display: inline-block;
    margin: 0 4px;
    color: light-dark(#9ca3af, #6b7280);
}

.ship-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
    position: relative;
    transition: all 0.15s ease;
    will-change: overflow;
}

.ship-name:hover {
    overflow: visible;
    z-index: 100;
}

.ship-name:hover .entity-link,
.ship-name:hover>span {
    position: relative;
    z-index: 100;
    display: inline-block;
    background: linear-gradient(to right,
            light-dark(rgba(247, 247, 247, 0.98), rgba(30, 30, 30, 0.98)) 70%,
            light-dark(rgba(247, 247, 247, 0.8), rgba(30, 30, 30, 0.8)) 85%,
            light-dark(rgba(247, 247, 247, 0), rgba(30, 30, 30, 0)) 100%);
    margin: 0;
    box-decoration-break: clone;
    white-space: nowrap;
}

.weapon-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
    position: relative;
    transition: all 0.15s ease;
    will-change: overflow;
}

.weapon-name:hover {
    overflow: visible;
    z-index: 100;
}

.weapon-name:hover .entity-link,
.weapon-name:hover>span {
    position: relative;
    z-index: 100;
    display: inline-block;
    background: linear-gradient(to right,
            light-dark(rgba(247, 247, 247, 0.98), rgba(30, 30, 30, 0.98)) 70%,
            light-dark(rgba(247, 247, 247, 0.8), rgba(30, 30, 30, 0.8)) 85%,
            light-dark(rgba(247, 247, 247, 0), rgba(30, 30, 30, 0)) 100%);
    padding: 1px 8px 1px 0;
    margin: 0;
    box-decoration-break: clone;
    white-space: nowrap;
}

@media (max-width: 768px) {

    .ship-name,
    .weapon-name {
        max-width: 120px;
    }
}

@media (max-width: 600px) {

    .ship-name,
    .weapon-name {
        max-width: 100%;
        white-space: normal;
    }

    .combined-meta-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .separator {
        display: none;
    }

    .ship-weapon-group {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        max-width: 100%;
    }

    .ship-info,
    .weapon-info,
    .damage-info {
        width: 100%;
    }
}

@media (max-width: 600px) {
    .key-attacker-info {
        flex-direction: column;
        gap: 0.5rem;
    }

    .attacker-portraits-layout {
        flex-direction: row;
        gap: 0.25rem;
        width: 100%;
        justify-content: space-between;
    }

    .attacker-details {
        padding-left: 0;
        margin-top: 0.5rem;
    }

    .combined-meta-info {
        row-gap: 0.5rem;
    }

    /* Make sure separators don't break oddly */
    .separator {
        display: none;
    }

    /* Stack items on small screens */
    .combined-meta-info>div {
        margin-right: 0.5rem;
    }
}

/* Section Styles */
.section {
    margin-bottom: 1rem;
    border-radius: 0.5rem;
    padding: 1rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.final-blow-section,
.top-damage-section {
    padding-bottom: 0.5rem;
    /* Add minimal padding at the bottom */
}

.section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.alliance-group {
    margin-bottom: 1rem;
}

.alliance-name {
    font-weight: 500;
    font-size: 1rem;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
}

.org-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: 0.5rem;
}

.count {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: light-dark(#6b7280, #d1d5db);
}

.corporation-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-left: 2rem;
}

.corporation-item {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
}

.corporation-item.standalone {
    margin-left: 0;
}

.corporation-name {
    display: flex;
    align-items: center;
}

.no-alliance-section {
    margin-top: 1rem;
}

.no-alliance-header {
    font-weight: 500;
    font-size: 1rem;
    margin-bottom: 0.25rem;
    color: light-dark(#6b7280, #9ca3af);
}

/* Attackers Section Styles */
.attackers-table-section {
    margin-top: 1rem;
}

/* Style for attacker sections */
.attacker-section {
    padding: 0.5rem 0;
    margin-bottom: 0 !important;
    /* Override the mb-4 in template */
}

.attacker-section:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.2), rgba(40, 40, 40, 0.2));
    border-radius: 0.25rem;
}

/* Special attacker styles */
.attacker-section.final-blow:hover,
.attacker-section.top-damage:hover {
    background-color: light-dark(rgba(229, 231, 235, 0.3), rgba(40, 40, 40, 0.3));
}

.character-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    min-width: 0;
}

.final-blow-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.4rem;
    font-size: 0.65rem;
    border-radius: 9999px;
    background-color: rgba(220, 38, 38, 0.2);
    color: rgb(220, 38, 38);
    font-weight: 600;
    white-space: nowrap;
}

.corporation-name {
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
    min-width: 0;
}

.ship-info,
.weapon-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ship-icon,
.weapon-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
}

.ship-name,
.weapon-name {
    min-width: 0;
    font-size: 0.875rem;
}

.damage-info {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    justify-content: flex-end;
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
    display: inline-flex;
    align-items: center;
    min-width: 0;
}

.entity-link:hover {
    color: #4fc3f7;
    text-decoration: underline;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

/* Responsive styles */
@media (max-width: 768px) {

    .table-header,
    .table-row {
        grid-template-columns: minmax(150px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, 0.5fr);
        font-size: 0.8rem;
    }

    .portraits-container {
        width: 32px;
        height: 32px;
    }

    .corporation-image {
        width: 16px;
        height: 16px;
    }

    .ship-portrait {
        width: 32px;
        height: 32px;
    }

    .ship-icon,
    .weapon-icon {
        width: 24px;
        height: 24px;
    }

    .character-name,
    .ship-name,
    .weapon-name {
        font-size: 0.8rem;
    }

    .corporation-name {
        font-size: 0.7rem;
    }
}

@media (max-width: 640px) {

    .table-header,
    .table-row {
        grid-template-columns: minmax(120px, 1.5fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(60px, 0.5fr);
        font-size: 0.7rem;
        padding: 0.25rem;
    }

    .section-title {
        font-size: 0.9rem;
    }

    .alliance-name {
        font-size: 0.85rem;
    }

    .corporation-item {
        font-size: 0.8rem;
    }
}

/* Collapsible section header */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.section-header:hover {
    opacity: 0.9;
}

.section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.org-counts {
    font-size: 0.85rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
}

.toggle-icon {
    width: 18px;
    height: 18px;
    color: light-dark(#6b7280, #9ca3af);
}

.organizations-content {
    margin-top: 0.75rem;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Attacker section specific styles */
.attacker-placeholder-image {
    background-color: rgba(100, 100, 100, 0.2);
    border-radius: 4px;
}

.attacker-placeholder-stacked {
    background-color: rgba(100, 100, 100, 0.1);
    border-radius: 2px;
}

/* Character name style */
.character-name {
    font-weight: 500;
}

/* Ship and weapon styles */
.ship-reference {
    color: light-dark(#6b7280, #9ca3af);
    font-size: 0.875rem;
}

.ship-name-small {
    color: light-dark(#6b7280, #d1d5db);
}

.corporation-line {
    font-size: 0.75rem;
    color: light-dark(#6b7280, #d1d5db);
}

/* Damage display styles */
.damage-cell {
    padding-left: 0.5rem;
    text-align: right;
}

/* Damage container with proper styles */
.damage-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 80px;
}

.damage-container .damage-value {
    font-weight: 600;
    color: #ef4444;
    display: flex;
    align-items: center;
    font-size: 1rem;
}

.damage-container .damage-percent {
    font-size: 0.75rem;
    color: light-dark(#6b7280, #9ca3af);
}

.damage-container .damage-icon {
    color: #ef4444;
    margin-right: 0.1rem;
}

.corporation-logo {
    margin-top: 0.25rem;
}

.corp-logo {
    width: 32px;
    height: 32px;
    border-radius: 0.375rem;
}

.final-blow-badge {
    font-size: 0.7rem;
    padding: 0 0.3rem;
    letter-spacing: 0.02em;
}

.top-damage-badge {
    font-size: 0.7rem;
    padding: 0 0.3rem;
    letter-spacing: 0.02em;
}

/* Attacker section styles */
.attacker-section {
    padding: 0.5rem 0;
}

/* Optional special styling for final blow and top damage attackers */
.attacker-section.final-blow,
.attacker-section.top-damage {
    background-color: light-dark(rgba(229, 231, 235, 0.05), rgba(40, 40, 40, 0.05));
}

/* Attacker separator */
.attacker-separator {
    margin: 0.5rem 0;
}

/* Responsive adjustments */
@media (max-width: 380px) {
    .compact-table .table-row {
        grid-template-columns: auto 1fr auto;
    }

    /* Hide ship images on very small screens */
    .ship-images-cell {
        display: none;
    }

    .character-portrait {
        width: 36px;
        height: 36px;
    }

    .character-line {
        font-size: 0.8rem;
    }

    .ship-reference {
        font-size: 0.75rem;
    }

    .corporation-line {
        font-size: 0.7rem;
    }

    .corp-logo {
        width: 28px;
        height: 28px;
    }
}
</style>
