<template>
    <div class="kill-attackers">
        <!-- Final Blow Section -->
        <div v-if="finalBlowAttacker" class="section final-blow-section mb-4">
            <h3 class="section-title">{{ t('killAttackers.finalBlow') }}</h3>
            <div class="key-attacker-info flex items-start gap-3">
                <!-- Portraits Block -->
                <div class="attacker-portraits-layout flex items-start gap-2">
                    <!-- Character Image -->
                    <NuxtLink v-if="finalBlowAttacker.character_id > 0"
                        :to="`/character/${finalBlowAttacker.character_id}`">
                        <Image :type="'character'" :id="finalBlowAttacker.character_id" :size="64"
                            class="portrait-image" />
                    </NuxtLink>
                    <Image v-else :type="'character'" :id="1" :size="64" class="portrait-image" />

                    <!-- Stacked Corp/Alliance -->
                    <div v-if="finalBlowAttacker.corporation_id || finalBlowAttacker.alliance_id"
                        class="stacked-icons-container">
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
                    <NuxtLink v-if="finalBlowAttacker.ship_id" :to="`/item/${finalBlowAttacker.ship_id}`"
                        :class="['ship-image', (finalBlowAttacker.corporation_id || finalBlowAttacker.alliance_id) ? 'ml-2' : 'ml-0']">
                        <Image :type="'item'" :id="finalBlowAttacker.ship_id" :size="64" />
                    </NuxtLink>
                    <div v-else
                        :class="['ship-image placeholder-main', (finalBlowAttacker.corporation_id || finalBlowAttacker.alliance_id) ? 'ml-2' : 'ml-0']"
                        style="width: 64px; height: 64px;"></div>
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
                            <NuxtLink v-else-if="finalBlowAttacker.faction_id"
                                :to="`/faction/${finalBlowAttacker.faction_id}`" class="entity-link">
                                {{ finalBlowAttacker.faction_name }}
                            </NuxtLink>
                            <span v-else-if="finalBlowAttacker.alliance_name">{{ finalBlowAttacker.alliance_name
                            }}</span>
                            <span v-else-if="finalBlowAttacker.faction_name">{{ finalBlowAttacker.faction_name }}</span>
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
                            <span class="ship-name font-medium ml-0.5" ref="finalShipNameRef">
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
                            <span class="weapon-name ml-0.5" ref="finalWeaponNameRef">
                                <NuxtLink v-if="finalBlowAttacker.weapon_type_id"
                                    :to="`/item/${finalBlowAttacker.weapon_type_id}`" class="entity-link">
                                    {{ getLocalizedString(finalBlowAttacker.weapon_type_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(finalBlowAttacker.weapon_type_name,
                                    currentLocale) || $t('unknown') }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Damage info - Absolutely positioned at bottom right -->
                    <div class="damage-info">
                        <Icon name="lucide:zap" class="inline-icon damage-icon w-4 h-4 text-red-500" />
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
                    <NuxtLink v-if="topDamageAttacker.character_id > 0"
                        :to="`/character/${topDamageAttacker.character_id}`">
                        <Image :type="'character'" :id="topDamageAttacker.character_id" :size="64"
                            class="portrait-image" />
                    </NuxtLink>
                    <Image v-else :type="'character'" :id="1" :size="64" class="portrait-image" />

                    <!-- Stacked Corp/Alliance -->
                    <div v-if="topDamageAttacker.corporation_id || topDamageAttacker.alliance_id"
                        class="stacked-icons-container">
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
                    <NuxtLink v-if="topDamageAttacker.ship_id" :to="`/item/${topDamageAttacker.ship_id}`"
                        :class="['ship-image', (topDamageAttacker.corporation_id || topDamageAttacker.alliance_id) ? 'ml-2' : 'ml-0']">
                        <Image :type="'item'" :id="topDamageAttacker.ship_id" :size="64" />
                    </NuxtLink>
                    <div v-else
                        :class="['ship-image placeholder-main', (topDamageAttacker.corporation_id || topDamageAttacker.alliance_id) ? 'ml-2' : 'ml-0']"
                        style="width: 64px; height: 64px;"></div>
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
                            <NuxtLink v-else-if="topDamageAttacker.faction_id"
                                :to="`/faction/${topDamageAttacker.faction_id}`" class="entity-link">
                                {{ topDamageAttacker.faction_name }}
                            </NuxtLink>
                            <span v-else-if="topDamageAttacker.alliance_name">{{ topDamageAttacker.alliance_name
                            }}</span>
                            <span v-else-if="topDamageAttacker.faction_name">{{ topDamageAttacker.faction_name }}</span>
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
                            <span class="ship-name font-medium ml-0.5" ref="topShipNameRef">
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
                            <span class="weapon-name ml-0.5" ref="topWeaponNameRef">
                                <NuxtLink v-if="topDamageAttacker.weapon_type_id"
                                    :to="`/item/${topDamageAttacker.weapon_type_id}`" class="entity-link">
                                    {{ getLocalizedString(topDamageAttacker.weapon_type_name, currentLocale) }}
                                </NuxtLink>
                                <span v-else>{{ getLocalizedString(topDamageAttacker.weapon_type_name,
                                    currentLocale) || $t('unknown') }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Damage info - Absolutely positioned at bottom right -->
                    <div class="damage-info">
                        <Icon name="lucide:zap" class="inline-icon damage-icon w-4 h-4 text-red-500" />
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
                        <NuxtLink v-if="attacker.character_id > 0" :to="`/character/${attacker.character_id}`">
                            <Image :type="'character'" :id="attacker.character_id" :size="64" class="portrait-image" />
                        </NuxtLink>
                        <Image v-else :type="'character'" :id="1" :size="64" class="portrait-image" />

                        <!-- Stacked Corp/Alliance -->
                        <div v-if="attacker.corporation_id || attacker.alliance_id" class="stacked-icons-container">
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
                        <NuxtLink v-if="attacker.ship_id" :to="`/item/${attacker.ship_id}`"
                            :class="['ship-image', (attacker.corporation_id || attacker.alliance_id) ? 'ml-2' : 'ml-0']">
                            <Image :type="'item'" :id="attacker.ship_id" :size="64" />
                        </NuxtLink>
                        <div v-else
                            :class="['ship-image placeholder-main', (attacker.corporation_id || attacker.alliance_id) ? 'ml-2' : 'ml-0']"
                            style="width: 64px; height: 64px;"></div>
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
                                <NuxtLink v-else-if="attacker.faction_id" :to="`/faction/${attacker.faction_id}`"
                                    class="entity-link">
                                    {{ attacker.faction_name }}
                                </NuxtLink>
                                <span v-else-if="attacker.alliance_name">{{ attacker.alliance_name }}</span>
                                <span v-else-if="attacker.faction_name">{{ attacker.faction_name }}</span>
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

                        <!-- Damage info - Absolutely positioned at bottom right -->
                        <div class="damage-info">
                            <Icon name="lucide:zap" class="inline-icon damage-icon w-4 h-4 text-red-500" />
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
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue';

// i18n setup
const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Props definition - accept either full killmail or just attackers array
const props = defineProps<{
    killmail?: IKillmail | null;
    attackers?: IAttacker[];
}>();

// Refs for detecting overflow fade on ship and weapon names
const finalShipNameRef = ref<HTMLElement | null>(null);
const finalWeaponNameRef = ref<HTMLElement | null>(null);
const topShipNameRef = ref<HTMLElement | null>(null);
const topWeaponNameRef = ref<HTMLElement | null>(null);

/**
 * Applies or removes the 'fade' class based on whether the element is truncated
 */
function updateFade(elRef: { value: HTMLElement | null }) {
    const el = elRef.value;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
        el.classList.add('fade');
    } else {
        el.classList.remove('fade');
    }
}

/**
 * Update all registered refs for overflow detection
 */
function updateAllFades() {
    updateFade(finalShipNameRef);
    updateFade(finalWeaponNameRef);
    updateFade(topShipNameRef);
    updateFade(topWeaponNameRef);
}

// Lifecycle hooks to trigger fade updates
onMounted(() => {
    nextTick(updateAllFades);
    window.addEventListener('resize', updateAllFades);
});
onUpdated(() => {
    nextTick(updateAllFades);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', updateAllFades);
});

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
    // Count all alliances plus all corporations (including those within alliances)
    const alliancesCount = organizationsTree.value.alliances.length;
    const totalCorpsCount = getTotalCorporationsCount();

    return alliancesCount + totalCorpsCount;
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

/**
 * Update fade class based on overflow
 */
function updateFades() {
    const container = document.querySelector('.kill-attackers');
    if (!container) return;
    const elements = container.querySelectorAll<HTMLElement>('.ship-name, .weapon-name');
    elements.forEach(el => {
        if (el.scrollWidth > el.clientWidth) el.classList.add('fade');
        else el.classList.remove('fade');
    });
}

// Lifecycle hooks to trigger fade updates
onMounted(() => {
    updateFades();
    window.addEventListener('resize', updateFades);
});
onUpdated(() => {
    updateFades();
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', updateFades);
});
</script>

<style scoped>
.kill-attackers {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    --color-background-hover: var(--color-bg-hover);
}

/* Key Attacker Styles */
.key-attacker-info {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-1) var(--space-1) var(--space-1);
    width: 100%;
    border-bottom: none;
}

.attacker-portraits-layout {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
}

.portrait-image {
    border-radius: 50%;
}

.portrait-image[type="character"],
.portrait-image[type="item"] {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
}

.portrait-image[type="corporation"],
.portrait-image[type="alliance"] {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
}

.stacked-icons-container {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 32px !important;
    height: 64px;
    gap: 0;
    overflow: hidden;
}

.ship-image {
    border-radius: var(--radius-sm);
    margin-left: var(--space-2);
    width: 64px;
    height: 64px;
    flex-shrink: 0;
}

.attacker-details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-2);
}

.entity-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.entity-name-line {
    width: 100%;
    text-align: left;
    font-size: 0.95rem;
    line-height: var(--line-height-snug);
    color: var(--color-text-secondary);
}

.entity-name-line.name-character {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    font-size: var(--text-base);
}

.entity-name-line.name-corporation {
    font-size: 0.9rem;
    color: var(--color-gray-600);
}

:global(.dark) .entity-name-line.name-corporation {
    color: var(--color-gray-300);
}

.entity-name-line.name-alliance-faction {
    font-size: 0.85rem;
    color: var(--color-text-muted);
}

.attacker-meta-info {
    padding: var(--space-2) var(--space-3) 0;
    border-top: 1px solid var(--color-border-light);
    margin-top: var(--space-1);
    background-color: transparent;
}

/* Updated meta-info spacing and layout */
.combined-meta-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    position: relative;
}

/* Position damage info at bottom-right corner */
.damage-info {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    position: absolute;
    right: -10px;
    bottom: 5px;
}

.damage-value {
    font-weight: var(--font-weight-semibold);
    color: var(--color-red-500);
    font-size: 0.9rem;
    line-height: var(--line-height-tight);
    display: flex;
    align-items: center;
    text-align: right;
    font-family: inherit;
}

.damage-percent {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-weight: normal;
    white-space: nowrap;
}

.damage-icon {
    color: var(--color-red-500);
    flex-shrink: 0;
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
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
    min-width: 0;
}

:global(.dark) .ship-info {
    color: var(--color-gray-300);
}

.weapon-info {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
    min-width: 0;
}

:global(.dark) .weapon-info {
    color: var(--color-gray-300);
}

.separator {
    display: inline-block;
    margin: 0 2px;
    color: var(--color-text-muted);
    transform: scaleX(0.5);
}

.ship-name {
    overflow: hidden;
    white-space: nowrap;
    max-width: 150px;
    position: relative;
    transition: all var(--duration-fast) ease;
    will-change: overflow;
}

.ship-name.fade {
    mask-image: linear-gradient(to right, black 75%, transparent);
    -webkit-mask-image: linear-gradient(to right, black 75%, transparent);
}

.ship-name.fade:hover {
    overflow: visible;
    z-index: var(--z-popover);
    mask-image: none;
    -webkit-mask-image: none;
}

.ship-name.fade:hover .entity-link,
.ship-name.fade:hover>span {
    position: relative;
    z-index: var(--z-popover);
    display: inline-block;
    background: linear-gradient(to right,
            var(--color-bg-tooltip) 70%,
            color-mix(in srgb, var(--color-bg-tooltip) 80%, transparent) 85%,
            transparent 100%);
    margin: 0;
    box-decoration-break: clone;
    white-space: nowrap;
}

.weapon-name {
    overflow: hidden;
    white-space: nowrap;
    max-width: 150px;
    position: relative;
    transition: all var(--duration-fast) ease;
    will-change: overflow;
}

.weapon-name.fade {
    mask-image: linear-gradient(to right, black 75%, transparent);
    -webkit-mask-image: linear-gradient(to right, black 75%, transparent);
}

.weapon-name.fade:hover {
    overflow: visible;
    z-index: var(--z-popover);
    mask-image: none;
    -webkit-mask-image: none;
}

.weapon-name.fade:hover .entity-link,
.weapon-name.fade:hover>span {
    position: relative;
    z-index: var(--z-popover);
    display: inline-block;
    background: linear-gradient(to right,
            var(--color-bg-tooltip) 70%,
            color-mix(in srgb, var(--color-bg-tooltip) 80%, transparent) 85%,
            transparent 100%);
    padding: 1px var(--space-2) 1px 0;
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
    .key-attacker-info {
        flex-direction: row;
        gap: var(--space-2);
        align-items: flex-start;
    }

    .attacker-portraits-layout {
        display: grid;
        grid-template-columns: 64px 32px 64px;
        width: auto;
        max-width: 170px;
        gap: var(--space-1);
        justify-content: start;
        flex-shrink: 0;
    }

    .ship-image {
        margin-left: 0 !important;
        width: 64px !important;
        height: 64px !important;
    }

    .portrait-image[type="character"] {
        width: 64px !important;
        height: 64px !important;
    }

    .stacked-icons-container {
        width: 32px !important;
        height: 64px !important;
    }

    .portrait-image[type="corporation"],
    .portrait-image[type="alliance"] {
        width: 32px !important;
        height: 32px !important;
    }

    .attacker-details {
        padding-left: 0;
        margin-top: 0;
        flex: 1;
        min-width: 0;
    }
}

@media (max-width: 380px) {
    .attacker-portraits-layout {
        gap: 2px;
        max-width: 170px;
        grid-template-columns: 64px 32px 64px;
    }

    .portrait-image[type="character"],
    .ship-image {
        width: 64px !important;
        height: 64px !important;
    }

    .portrait-image[type="corporation"],
    .portrait-image[type="alliance"] {
        width: 32px !important;
        height: 32px !important;
    }
}

/* Section Styles */
.section {
    margin-bottom: 1rem;
    border-radius: 0.5rem;
    padding: 0.35rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.final-blow-section,
.top-damage-section {
    padding-bottom: var(--space-2);
}

.section-title {
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--color-border-light);
}

.alliance-group {
    margin-bottom: var(--space-4);
}

.alliance-name {
    font-weight: var(--font-weight-medium);
    font-size: var(--text-base);
    margin-bottom: var(--space-1);
    display: flex;
    align-items: center;
}

.org-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: var(--space-2);
}

.count {
    margin-left: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}

.corporation-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-left: var(--space-8);
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
    margin-top: var(--space-4);
}

.no-alliance-header {
    font-weight: var(--font-weight-medium);
    font-size: var(--text-base);
    margin-bottom: var(--space-1);
    color: var(--color-text-muted);
}

/* Style for attacker sections */
.attacker-section {
    padding: var(--space-2) 0;
    margin-bottom: 0 !important;
}

.attacker-section:hover {
    background-color: var(--color-bg-hover);
    border-radius: var(--radius-sm);
}

/* Special attacker styles */
.attacker-section.final-blow:hover,
.attacker-section.top-damage:hover {
    background-color: var(--color-bg-hover-intense);
}

.character-name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: var(--font-weight-medium);
    min-width: 0;
}

.final-blow-tag {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    font-size: 0.65rem;
    border-radius: var(--radius-full);
    background-color: color-mix(in srgb, var(--color-red-600) 20%, transparent);
    color: var(--color-red-600);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
}

.corporation-name {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    min-width: 0;
}

.ship-info,
.weapon-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.ship-icon,
.weapon-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
}

.ship-name,
.weapon-name {
    min-width: 0;
    font-size: var(--text-sm);
}

.damage-info {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    justify-content: flex-end;
}

.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color var(--duration-fast) ease;
    display: inline-flex;
    align-items: center;
    min-width: 0;
}

.entity-link:hover {
    color: var(--color-blue-400);
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
        font-size: var(--text-sm);
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
        font-size: var(--text-sm);
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
        padding: var(--space-1);
    }

    .section-title {
        font-size: 0.9rem;
    }

    .alliance-name {
        font-size: 0.85rem;
    }

    .corporation-item {
        font-size: var(--text-sm);
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
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    margin-bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.org-counts {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-weight: normal;
}

.toggle-icon {
    width: 18px;
    height: 18px;
    color: var(--color-text-muted);
}

.organizations-content {
    margin-top: var(--space-3);
    animation: fadeIn var(--duration-fast) ease-out;
}

/* Attacker section specific styles */
.attacker-placeholder-image {
    background-color: color-mix(in srgb, var(--color-gray-500) 20%, transparent);
    border-radius: var(--radius-sm);
}

.attacker-placeholder-stacked {
    background-color: color-mix(in srgb, var(--color-gray-500) 10%, transparent);
    border-radius: 2px;
}

/* Character name style */
.character-name {
    font-weight: var(--font-weight-medium);
}

/* Ship and weapon styles */
.ship-reference {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
}

.ship-name-small {
    color: var(--color-text-secondary);
}

:global(.dark) .ship-name-small {
    color: var(--color-gray-300);
}

.corporation-line {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
}

:global(.dark) .corporation-line {
    color: var(--color-gray-300);
}

/* Damage display styles */
.damage-cell {
    padding-left: var(--space-2);
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
    font-weight: var(--font-weight-semibold);
    color: var(--color-red-500);
    display: flex;
    align-items: center;
    font-size: var(--text-base);
}

.damage-container .damage-percent {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
}

.damage-container .damage-icon {
    color: var(--color-red-500);
    margin-right: var(--space-1);
}

.corporation-logo {
    margin-top: var(--space-1);
}

.corp-logo {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
}

.final-blow-badge {
    font-size: 0.7rem;
    padding: 0 var(--space-1);
    letter-spacing: 0.02em;
}

.top-damage-badge {
    font-size: 0.7rem;
    padding: 0 var(--space-1);
    letter-spacing: 0.02em;
}

/* Attacker section styles */
.attacker-section {
    padding: var(--space-2) 0;
}

/* Optional special styling for final blow and top damage attackers */
.attacker-section.final-blow,
.attacker-section.top-damage {
    background-color: var(--color-bg-subtle);
}

/* Attacker separator */
.attacker-separator {
    margin: var(--space-2) 0;
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
        font-size: var(--text-sm);
    }

    .ship-reference {
        font-size: var(--text-xs);
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
