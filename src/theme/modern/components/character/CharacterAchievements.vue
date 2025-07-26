<template>
    <div class="space-y-6">
        <!-- Summary Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UCard>
                <template #header>
                    <div class="flex items-center space-x-2">
                        <UIcon name="i-lucide-trophy" class="h-5 w-5 text-amber-500" />
                        <h3 class="text-lg font-semibold">{{ t('achievements.totalPoints') }}</h3>
                    </div>
                </template>
                <div class="text-2xl font-bold text-primary">
                    {{ achievements?.total_points?.toLocaleString() || 0 }}
                </div>
            </UCard>

            <UCard>
                <template #header>
                    <div class="flex items-center space-x-2">
                        <UIcon name="i-lucide-check-circle" class="h-5 w-5 text-green-500" />
                        <h3 class="text-lg font-semibold">{{ t('achievements.completed') }}</h3>
                    </div>
                </template>
                <div class="text-2xl font-bold text-green-600">
                    {{ achievements?.completed_achievements || 0 }} / {{ achievements?.total_achievements || 0 }}
                </div>
            </UCard>

            <UCard>
                <template #header>
                    <div class="flex items-center space-x-2">
                        <UIcon name="i-lucide-clock" class="h-5 w-5 text-blue-500" />
                        <h3 class="text-lg font-semibold">{{ t('achievements.lastUpdated') }}</h3>
                    </div>
                </template>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(achievements?.last_calculated) }}
                </div>
            </UCard>
        </div>

        <!-- Filters Section -->
        <UCard>
            <template #header>
                <div class="flex items-center space-x-2">
                    <UIcon name="i-lucide-filter" class="h-5 w-5" />
                    <h3 class="text-lg font-semibold">{{ t('achievements.filters') }}</h3>
                </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Status Filter -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('achievements.status') }}
                    </label>
                    <div class="flex flex-wrap gap-1">
                        <UButton
                            v-for="status in statusOptions"
                            :key="status.value"
                            :variant="selectedStatus === status.value ? 'solid' : 'soft'"
                            :color="selectedStatus === status.value ? 'primary' : 'neutral'"
                            size="xs"
                            @click="selectedStatus = status.value"
                        >
                            {{ status.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Type Filter -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('achievements.type') }}
                    </label>
                    <div class="flex flex-wrap gap-1">
                        <UButton
                            v-for="type in typeOptions"
                            :key="type.value"
                            :variant="selectedType === type.value ? 'solid' : 'soft'"
                            :color="selectedType === type.value ? 'primary' : 'neutral'"
                            size="xs"
                            @click="selectedType = type.value"
                        >
                            {{ type.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Rarity Filter -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('achievements.rarity') }}
                    </label>
                    <div class="flex flex-wrap gap-1">
                        <UButton
                            v-for="rarity in rarityOptions"
                            :key="rarity.value"
                            :variant="selectedRarity === rarity.value ? 'solid' : 'soft'"
                            :color="selectedRarity === rarity.value ? 'primary' : 'neutral'"
                            size="xs"
                            @click="selectedRarity = rarity.value"
                        >
                            {{ rarity.label }}
                        </UButton>
                    </div>
                </div>

                <!-- Category Filter -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('achievements.category') }}
                    </label>
                    <div class="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        <UButton
                            v-for="category in categoryOptions"
                            :key="category.value"
                            :variant="selectedCategory === category.value ? 'solid' : 'soft'"
                            :color="selectedCategory === category.value ? 'primary' : 'neutral'"
                            size="xs"
                            @click="selectedCategory = category.value"
                        >
                            {{ category.label }}
                        </UButton>
                    </div>
                </div>
            </div>

            <!-- Filter Summary -->
            <div class="mt-6 flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    {{ t('achievements.showing') }} {{ filteredAchievements.length }} {{ t('achievements.of') }} {{ achievements?.achievements?.length || 0 }} {{ t('achievements.achievements') }}
                </div>
                <UButton
                    variant="ghost"
                    size="sm"
                    @click="clearFilters"
                    :disabled="!hasActiveFilters"
                >
                    {{ t('achievements.clearFilters') }}
                </UButton>
            </div>
        </UCard>

        <!-- Achievements Table -->
        <div v-if="filteredAchievements.length > 0">
            <div class="mb-4">
                <h2 class="text-xl font-semibold">{{ t('achievements.yourAchievements') }}</h2>
            </div>

            <!-- Desktop Table -->
            <div class="hidden lg:block">
                <div class="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <!-- Table Header -->
                    <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div class="col-span-4">{{ t('achievements.name') }}</div>
                        <div class="col-span-1 text-center">{{ t('achievements.type') }}</div>
                        <div class="col-span-1 text-center">{{ t('achievements.rarity') }}</div>
                        <div class="col-span-2">{{ t('achievements.progress') }}</div>
                        <div class="col-span-1 text-center">{{ t('achievements.basePoints') }}</div>
                        <div class="col-span-1 text-center">{{ t('achievements.earnedPoints') }}</div>
                        <div class="col-span-1 text-center">{{ t('achievements.status') }}</div>
                        <div class="col-span-1"></div>
                    </div>

                    <!-- Table Body -->
                    <div class="divide-y divide-gray-200 dark:divide-gray-700">
                        <div v-for="achievement in filteredAchievements" :key="achievement.achievement_id">
                            <!-- Main Achievement Row -->
                            <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                                <!-- Name -->
                                <div class="col-span-4">
                                    <div class="flex items-center space-x-3">
                                        <UIcon
                                            :name="getAchievementIcon(achievement)"
                                            :class="['h-5 w-5 flex-shrink-0', getRarityColor(achievement.rarity)]"
                                        />
                                        <div class="min-w-0 flex-1">
                                            <div class="font-medium text-gray-900 dark:text-white truncate">
                                                {{ getAchievementName(achievement.achievement_id, achievement.name, t) }}
                                            </div>
                                            <div class="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {{ getAchievementDescription(achievement.achievement_id, achievement.description, t) }}
                                            </div>
                                            <div v-if="hasKillmails(achievement)" class="text-xs text-blue-500 dark:text-blue-400 mt-1">
                                                {{ t('achievements.killmailsCount', { count: achievement.killmailIds?.length || 0 }) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Type -->
                                <div class="col-span-1 text-center">
                                    <UBadge :color="getTypeColor(achievement.type)" variant="soft" size="xs">
                                        {{ achievement.type }}
                                    </UBadge>
                                </div>

                                <!-- Rarity -->
                                <div class="col-span-1 text-center">
                                    <UBadge :color="getRarityBadgeColor(achievement.rarity)" variant="soft" size="xs">
                                        {{ achievement.rarity }}
                                    </UBadge>
                                </div>

                                <!-- Progress -->
                                <div class="col-span-2">
                                    <div class="space-y-1 min-w-0 w-full">
                                        <div class="flex justify-between items-center text-xs">
                                            <span :class="achievement.is_completed ? 'text-green-600 font-medium' : 'text-gray-600'">
                                                {{ achievement.current_count.toLocaleString() }} / {{ achievement.threshold.toLocaleString() }}
                                            </span>
                                            <div class="flex items-center gap-1">
                                                <span class="text-gray-500">
                                                    {{ Math.round((achievement.current_count / achievement.threshold) * 100) }}%
                                                </span>
                                                <span v-if="Math.floor(achievement.current_count / achievement.threshold) > 1" class="text-gray-500">
                                                    x{{ Math.floor(achievement.current_count / achievement.threshold) }}
                                                </span>
                                            </div>
                                        </div>
                                        <ProgressBar
                                            :value="(achievement.current_count / achievement.threshold) * 100"
                                            size="xs"
                                            color="primary"
                                        />
                                    </div>
                                </div>

                                <!-- Base Points -->
                                <div class="col-span-1 text-center">
                                    <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {{ achievement.points.toLocaleString() }}
                                    </div>
                                </div>

                                <!-- Earned Points -->
                                <div class="col-span-1 text-center">
                                    <div class="text-sm font-medium text-amber-600">
                                        {{ (achievement.points * Math.floor(achievement.current_count / achievement.threshold)).toLocaleString() }}
                                    </div>
                                    <div v-if="Math.floor(achievement.current_count / achievement.threshold) > 1" class="text-xs text-gray-500">
                                        {{ achievement.points }} × {{ Math.floor(achievement.current_count / achievement.threshold) }}
                                    </div>
                                    <div v-else-if="Math.floor(achievement.current_count / achievement.threshold) === 1" class="text-xs text-gray-500">
                                        {{ achievement.points }} × 1
                                    </div>
                                </div>

                                <!-- Status -->
                                <div class="col-span-1 text-center">
                                    <div class="flex items-center justify-center space-x-2">
                                        <UIcon
                                            :name="achievement.is_completed ? 'i-lucide-check-circle' : achievement.current_count > 0 ? 'i-lucide-clock' : 'i-lucide-circle'"
                                            :class="[
                                                'h-4 w-4',
                                                achievement.is_completed ? 'text-green-500' : achievement.current_count > 0 ? 'text-blue-500' : 'text-gray-400'
                                            ]"
                                        />
                                        <span class="text-xs">
                                            {{ achievement.is_completed ? t('achievements.completed') : achievement.current_count > 0 ? t('achievements.inProgress') : t('achievements.notStarted') }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Expand Button -->
                                <div class="col-span-1 text-center">
                                    <UButton
                                        v-if="hasKillmails(achievement)"
                                        variant="ghost"
                                        size="sm"
                                        :icon="isExpanded(achievement.achievement_id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                                        @click="toggleKillmailExpansion(achievement)"
                                        :aria-label="isExpanded(achievement.achievement_id) ? t('achievements.hideKillmails') : t('achievements.showKillmails')"
                                    />
                                </div>
                            </div>

                            <!-- Expanded Killmails Section -->
                            <div v-if="isExpanded(achievement.achievement_id)" class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                <div class="p-6">
                                    <h4 class="text-sm font-medium mb-3">{{ t('achievements.relatedKillmails') }}</h4>

                                    <!-- Loading State -->
                                    <div v-if="isLoadingKillmails(achievement.achievement_id)" class="text-center py-4">
                                        <UIcon name="i-lucide-loader-2" class="animate-spin h-5 w-5 mx-auto" />
                                        <p class="text-sm text-gray-500 mt-2">{{ t('achievements.loadingKillmails') }}</p>
                                    </div>

                                    <!-- Killmails List -->
                                    <div v-else-if="getKillmailsForAchievement(achievement.achievement_id).length > 0" class="space-y-2">
                                        <div
                                            v-for="killmail in getKillmailsForAchievement(achievement.achievement_id)"
                                            :key="killmail.killmail_id"
                                            class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-md transition-shadow"
                                        >
                                            <NuxtLink :to="getKillmailLink(killmail.killmail_id)" class="block">
                                                <div class="grid grid-cols-12 gap-3 items-center text-sm">
                                                    <!-- Victim Ship -->
                                                    <div class="col-span-3 flex items-center space-x-2">
                                                        <img
                                                            :src="`https://images.evetech.net/types/${killmail.victim.ship_id}/icon?size=32`"
                                                            :alt="killmail.victim.ship_name.en || 'Ship'"
                                                            class="w-8 h-8 rounded"
                                                        />
                                                        <div>
                                                            <div class="font-medium truncate">{{ killmail.victim.character_name }}</div>
                                                            <div class="text-gray-500 text-xs truncate">{{ killmail.victim.ship_name.en }}</div>
                                                        </div>
                                                    </div>

                                                    <!-- ISK Value -->
                                                    <div class="col-span-2 text-right">
                                                        <div class="font-medium">{{ formatIsk(killmail.total_value) }}</div>
                                                    </div>

                                                    <!-- System -->
                                                    <div class="col-span-2">
                                                        <div class="font-medium">{{ killmail.system_name }}</div>
                                                        <div :class="getSecurityColor(killmail.system_security)" class="text-xs">
                                                            {{ killmail.system_security.toFixed(1) }}
                                                        </div>
                                                    </div>

                                                    <!-- Final Blow -->
                                                    <div class="col-span-3 flex items-center space-x-2">
                                                        <img
                                                            :src="`https://images.evetech.net/characters/${killmail.finalblow.character_id}/portrait?size=32`"
                                                            :alt="killmail.finalblow.character_name"
                                                            class="w-6 h-6 rounded-full"
                                                            @error="$event.target.src = 'https://images.evetech.net/characters/1/portrait?size=32'"
                                                        />
                                                        <div>
                                                            <div class="font-medium text-xs truncate">{{ killmail.finalblow.character_name }}</div>
                                                            <div class="text-gray-500 text-xs truncate">{{ killmail.finalblow.corporation_name }}</div>
                                                        </div>
                                                    </div>

                                                    <!-- Attackers -->
                                                    <div class="col-span-2 text-right">
                                                        <div class="font-medium text-xs">{{ killmail.attackerCount }} {{ killmail.attackerCount === 1 ? 'attacker' : 'attackers' }}</div>
                                                    </div>
                                                </div>
                                            </NuxtLink>
                                        </div>
                                    </div>

                                    <!-- No Killmails -->
                                    <div v-else class="text-center py-4">
                                        <p class="text-sm text-gray-500">{{ t('achievements.noKillmails') }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Cards -->
            <div class="lg:hidden space-y-4">
                <div v-for="achievement in filteredAchievements" :key="achievement.achievement_id" class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <!-- Mobile Achievement Card -->
                    <div class="p-4">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center space-x-3 flex-1 min-w-0">
                                <UIcon
                                    :name="getAchievementIcon(achievement)"
                                    :class="['h-6 w-6 flex-shrink-0', getRarityColor(achievement.rarity)]"
                                />
                                <div class="min-w-0 flex-1">
                                    <div class="font-medium text-gray-900 dark:text-white">
                                        {{ getAchievementName(achievement.achievement_id, achievement.name, t) }}
                                    </div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {{ getAchievementDescription(achievement.achievement_id, achievement.description, t) }}
                                    </div>
                                </div>
                            </div>
                            <UButton
                                v-if="hasKillmails(achievement)"
                                variant="ghost"
                                size="sm"
                                :icon="isExpanded(achievement.achievement_id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                                @click="toggleKillmailExpansion(achievement)"
                                :aria-label="isExpanded(achievement.achievement_id) ? t('achievements.hideKillmails') : t('achievements.showKillmails')"
                            />
                        </div>

                        <div class="mt-4 space-y-3">
                            <!-- Type & Rarity -->
                            <div class="flex space-x-2">
                                <UBadge :color="getTypeColor(achievement.type)" variant="soft" size="xs">
                                    {{ achievement.type }}
                                </UBadge>
                                <UBadge :color="getRarityBadgeColor(achievement.rarity)" variant="soft" size="xs">
                                    {{ achievement.rarity }}
                                </UBadge>
                            </div>

                            <!-- Progress -->
                            <div class="space-y-1">
                                <div class="flex justify-between items-center text-xs">
                                    <span :class="achievement.is_completed ? 'text-green-600 font-medium' : 'text-gray-600'">
                                        {{ achievement.current_count.toLocaleString() }} / {{ achievement.threshold.toLocaleString() }}
                                    </span>
                                    <span class="text-gray-500">
                                        {{ Math.round((achievement.current_count / achievement.threshold) * 100) }}%
                                    </span>
                                </div>
                                <ProgressBar
                                    :value="(achievement.current_count / achievement.threshold) * 100"
                                    size="xs"
                                    color="primary"
                                />
                            </div>

                            <!-- Points & Status -->
                            <div class="flex justify-between items-center text-sm">
                                <div class="flex items-center space-x-2">
                                    <UIcon
                                        :name="achievement.is_completed ? 'i-lucide-check-circle' : achievement.current_count > 0 ? 'i-lucide-clock' : 'i-lucide-circle'"
                                        :class="[
                                            'h-4 w-4',
                                            achievement.is_completed ? 'text-green-500' : achievement.current_count > 0 ? 'text-blue-500' : 'text-gray-400'
                                        ]"
                                    />
                                    <span class="text-xs">
                                        {{ achievement.is_completed ? t('achievements.completed') : achievement.current_count > 0 ? t('achievements.inProgress') : t('achievements.notStarted') }}
                                    </span>
                                </div>
                                <div class="text-amber-600 font-medium">
                                    {{ (achievement.points * Math.floor(achievement.current_count / achievement.threshold)).toLocaleString() }} pts
                                </div>
                            </div>

                            <!-- Killmails count -->
                            <div v-if="hasKillmails(achievement)" class="text-xs text-blue-500 dark:text-blue-400">
                                {{ t('achievements.killmailsCount', { count: achievement.killmailIds?.length || 0 }) }}
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Expanded Killmails Section -->
                    <div v-if="isExpanded(achievement.achievement_id)" class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div class="p-4">
                            <h4 class="text-sm font-medium mb-3">{{ t('achievements.relatedKillmails') }}</h4>

                            <!-- Loading State -->
                            <div v-if="isLoadingKillmails(achievement.achievement_id)" class="text-center py-4">
                                <UIcon name="i-lucide-loader-2" class="animate-spin h-5 w-5 mx-auto" />
                                <p class="text-sm text-gray-500 mt-2">{{ t('achievements.loadingKillmails') }}</p>
                            </div>

                            <!-- Killmails List -->
                            <div v-else-if="getKillmailsForAchievement(achievement.achievement_id).length > 0" class="space-y-3">
                                <div
                                    v-for="killmail in getKillmailsForAchievement(achievement.achievement_id)"
                                    :key="killmail.killmail_id"
                                    class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                                >
                                    <NuxtLink :to="getKillmailLink(killmail.killmail_id)" class="block space-y-2">
                                        <!-- Victim -->
                                        <div class="flex items-center space-x-3">
                                            <img
                                                :src="`https://images.evetech.net/types/${killmail.victim.ship_id}/icon?size=32`"
                                                :alt="killmail.victim.ship_name.en || 'Ship'"
                                                class="w-8 h-8 rounded"
                                            />
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium text-sm truncate">{{ killmail.victim.character_name }}</div>
                                                <div class="text-gray-500 text-xs truncate">{{ killmail.victim.ship_name.en }}</div>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-medium text-sm">{{ formatIsk(killmail.total_value) }}</div>
                                            </div>
                                        </div>

                                        <!-- System & Final Blow -->
                                        <div class="flex justify-between items-center text-xs">
                                            <div>
                                                <span class="font-medium">{{ killmail.system_name }}</span>
                                                <span :class="getSecurityColor(killmail.system_security)" class="ml-1">
                                                    ({{ killmail.system_security.toFixed(1) }})
                                                </span>
                                            </div>
                                            <div class="text-gray-500">
                                                {{ killmail.attackerCount }} attackers
                                            </div>
                                        </div>
                                    </NuxtLink>
                                </div>
                            </div>

                            <!-- No Killmails -->
                            <div v-else class="text-center py-4">
                                <p class="text-sm text-gray-500">{{ t('achievements.noKillmails') }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- No Achievements State -->
        <div v-else class="text-center py-12">
            <UIcon name="i-lucide-trophy" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ hasActiveFilters ? t('achievements.noMatchingAchievements') : t('achievements.noAchievements') }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
                {{ hasActiveFilters ? t('achievements.tryDifferentFilters') : t('achievements.startPlaying') }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { format } from 'date-fns';
import type { ICharacterAchievements, ICharacterAchievement } from '~/server/interfaces/ICharacterAchievements';
import type { IKillmail } from '~/server/interfaces/IKillmail';
import type { IKillList } from '~/server/interfaces/IKillList';
import { getAchievementName, getAchievementDescription } from '~/server/helpers/AchievementTranslations';
import ProgressBar from '~/src/theme/modern/components/common/ProgressBar.vue';

interface Props {
    achievements: ICharacterAchievements | null;
}

const props = defineProps<Props>();
const { t } = useI18n();

// Filter state
const selectedStatus = ref('completed_or_progress');
const selectedType = ref('all');
const selectedRarity = ref('all');
const selectedCategory = ref('all');

// Expandable killmails state
const expandedAchievements = ref<Set<string>>(new Set());
const killmailData = ref<Map<string, IKillList[]>>(new Map());
const loadingKillmails = ref<Set<string>>(new Set());

// Status filter options (these are static)
const statusOptions = [
    { label: t('achievements.completedOrInProgress'), value: 'completed_or_progress' },
    { label: t('achievements.all'), value: 'all' },
    { label: t('achievements.completed'), value: 'completed' },
    { label: t('achievements.inProgress'), value: 'in_progress' },
    { label: t('achievements.notStarted'), value: 'not_started' },
];

// Predefined achievement types
const getAchievementTypes = () => [
    'pvp',
    'pve',
    'exploration',
    'industry',
    'special'
];

// Predefined achievement rarities
const getAchievementRarities = () => [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
];

// Get unique categories from achievements data
const getAchievementCategories = () => {
    const categories = new Set(props.achievements?.achievements?.map(a => a.category) || []);
    return Array.from(categories).sort();
};

// Type filter options
const typeOptions = [
    { label: t('achievements.allTypes'), value: 'all' },
    ...getAchievementTypes().map(type => ({
        label: t(`achievements.types.${type}`),
        value: type
    }))
];

// Rarity filter options
const rarityOptions = [
    { label: t('achievements.allRarities'), value: 'all' },
    ...getAchievementRarities().map(rarity => ({
        label: t(`achievements.rarities.${rarity}`),
        value: rarity
    }))
];

// Category filter options
const categoryOptions = computed(() => [
    { label: t('achievements.allCategories'), value: 'all' },
    ...getAchievementCategories().map(category => ({
        label: category,
        value: category
    }))
]);

// Rarity order for sorting (highest to lowest)
const rarityOrder = {
    'legendary': 5,
    'epic': 4,
    'rare': 3,
    'uncommon': 2,
    'common': 1
};

// Filtered achievements
const filteredAchievements = computed(() => {
    if (!props.achievements?.achievements) return [];

    let filtered = props.achievements.achievements;

    // Status filter - only apply if not 'all'
    if (selectedStatus.value !== 'all') {
        switch (selectedStatus.value) {
            case 'completed_or_progress':
                filtered = filtered.filter(a => a.is_completed || a.current_count > 0);
                break;
            case 'completed':
                filtered = filtered.filter(a => a.is_completed);
                break;
            case 'in_progress':
                filtered = filtered.filter(a => !a.is_completed && a.current_count > 0);
                break;
            case 'not_started':
                filtered = filtered.filter(a => !a.is_completed && a.current_count === 0);
                break;
        }
    }
    // When status is 'all', no status filtering is applied

    // Type filter - only apply if not 'all'
    if (selectedType.value !== 'all') {
        filtered = filtered.filter(a => a.type === selectedType.value);
    }

    // Rarity filter - only apply if not 'all'
    if (selectedRarity.value !== 'all') {
        filtered = filtered.filter(a => a.rarity === selectedRarity.value);
    }

    // Category filter - only apply if not 'all'
    if (selectedCategory.value !== 'all') {
        filtered = filtered.filter(a => a.category === selectedCategory.value);
    }

    // Sort: completed first, then by rarity (legendary to common), then by cumulative points descending
    return filtered.sort((a, b) => {
        // First, prioritize completed achievements
        if (a.is_completed && !b.is_completed) return -1;
        if (!a.is_completed && b.is_completed) return 1;

        // Then sort by rarity (legendary to common)
        const rarityDiff = (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
        if (rarityDiff !== 0) return rarityDiff;

        // Finally sort by cumulative points descending
        const aCumulativePoints = a.points * Math.floor(a.current_count / a.threshold);
        const bCumulativePoints = b.points * Math.floor(b.current_count / b.threshold);
        return bCumulativePoints - aCumulativePoints;
    });
});

// Check if any filters are active (excluding the two default "show all" states)
const hasActiveFilters = computed(() => {
    const statusIsFiltered = selectedStatus.value !== 'completed_or_progress' && selectedStatus.value !== 'all';
    return statusIsFiltered ||
           selectedType.value !== 'all' ||
           selectedRarity.value !== 'all' ||
           selectedCategory.value !== 'all';
});

// Clear all filters and return to default state
const clearFilters = () => {
    selectedStatus.value = 'completed_or_progress'; // Return to initial default
    selectedType.value = 'all';
    selectedRarity.value = 'all';
    selectedCategory.value = 'all';
};

/**
 * Get achievement icon based on type
 */
const getAchievementIcon = (achievement: ICharacterAchievement) => {
    const icons = {
        pvp: 'i-lucide-swords',
        pve: 'i-lucide-target',
        exploration: 'i-lucide-compass',
        industry: 'i-lucide-factory',
        special: 'i-lucide-star'
    };
    return icons[achievement.type as keyof typeof icons] || 'i-lucide-award';
};

/**
 * Get rarity color for icons
 */
const getRarityColor = (rarity: string) => {
    const colors = {
        common: 'text-gray-500',
        uncommon: 'text-green-500',
        rare: 'text-blue-500',
        epic: 'text-purple-500',
        legendary: 'text-amber-500'
    };
    return colors[rarity as keyof typeof colors] || 'text-gray-500';
};

/**
 * Get type color for badges and buttons
 */
const getTypeColor = (type: string) => {
    const colors = {
        pvp: 'red',
        pve: 'blue',
        exploration: 'green',
        industry: 'orange',
        special: 'purple'
    };
    return colors[type as keyof typeof colors] || 'gray';
};

/**
 * Get rarity color for badges and buttons
 */
const getRarityBadgeColor = (rarity: string) => {
    const colors = {
        common: 'gray',
        uncommon: 'green',
        rare: 'blue',
        epic: 'purple',
        legendary: 'amber'
    };
    return colors[rarity as keyof typeof colors] || 'gray';
};

/**
 * Format date for display
 */
const formatDate = (date: Date | string | undefined) => {
    if (!date) return t('achievements.never');
    return format(new Date(date), 'MMM d, yyyy');
};

/**
 * Toggle killmail expansion for an achievement
 */
const toggleKillmailExpansion = async (achievement: ICharacterAchievement) => {
    const achievementId = achievement.achievement_id;

    if (expandedAchievements.value.has(achievementId)) {
        // Collapse
        expandedAchievements.value.delete(achievementId);
    } else {
        // Expand
        expandedAchievements.value.add(achievementId);

        // Fetch killmail data if not already loaded and achievement has killmailIds
        if (!killmailData.value.has(achievementId) && achievement.killmailIds && achievement.killmailIds.length > 0) {
            await fetchKillmailsForAchievement(achievement);
        }
    }
};

/**
 * Fetch killmail data for an achievement
 */
const fetchKillmailsForAchievement = async (achievement: ICharacterAchievement) => {
    if (!achievement.killmailIds || achievement.killmailIds.length === 0) return;

    const achievementId = achievement.achievement_id;
    loadingKillmails.value.add(achievementId);

    try {
        const killmails = await $fetch<IKillmail[]>('/api/killmail/batch', {
            method: 'POST',
            body: {
                ids: achievement.killmailIds
            }
        });

        // Transform killmails to KillList format
        const killList = killmails.map(formatKillmailToKillList);
        killmailData.value.set(achievementId, killList);
    } catch (error) {
        console.error('Error fetching killmails for achievement:', error);
        // Set empty array on error
        killmailData.value.set(achievementId, []);
    } finally {
        loadingKillmails.value.delete(achievementId);
    }
};/**
 * Format killmail data to KillList format
 */
const formatKillmailToKillList = (killmail: IKillmail): IKillList => {
    const finalBlowAttacker = killmail.attackers.find(attacker => attacker.final_blow);

    return {
        killmail_id: killmail.killmail_id,
        total_value: killmail.total_value,
        system_id: killmail.system_id,
        system_name: killmail.system_name,
        system_security: killmail.system_security,
        region_id: killmail.region_id,
        region_name: killmail.region_name,
        kill_time: typeof killmail.kill_time === 'string' ? killmail.kill_time : killmail.kill_time.toISOString(),
        attackerCount: killmail.attackers.length,
        commentCount: 0,
        is_npc: killmail.is_npc,
        is_solo: killmail.is_solo,
        victim: {
            ship_id: killmail.victim.ship_id,
            ship_name: killmail.victim.ship_name,
            character_id: killmail.victim.character_id,
            character_name: killmail.victim.character_name,
            corporation_id: killmail.victim.corporation_id,
            corporation_name: killmail.victim.corporation_name,
            alliance_id: killmail.victim.alliance_id,
            alliance_name: killmail.victim.alliance_name,
            faction_id: killmail.victim.faction_id,
            faction_name: killmail.victim.faction_name,
        },
        finalblow: finalBlowAttacker ? {
            character_id: finalBlowAttacker.character_id,
            character_name: finalBlowAttacker.character_name,
            corporation_id: finalBlowAttacker.corporation_id,
            corporation_name: finalBlowAttacker.corporation_name,
            alliance_id: finalBlowAttacker.alliance_id,
            alliance_name: finalBlowAttacker.alliance_name,
            faction_id: finalBlowAttacker.faction_id,
            faction_name: finalBlowAttacker.faction_name,
            ship_group_name: finalBlowAttacker.ship_group_name || {},
            is_npc: finalBlowAttacker.character_id === 0,
        } : {
            character_id: 0,
            character_name: 'Unknown',
            corporation_id: 0,
            corporation_name: 'Unknown',
            alliance_id: 0,
            alliance_name: 'Unknown',
            faction_id: 0,
            faction_name: 'Unknown',
            ship_group_name: {},
            is_npc: true,
        }
    };
};

/**
 * Check if an achievement is expanded
 */
const isExpanded = (achievementId: string): boolean => {
    return expandedAchievements.value.has(achievementId);
};

/**
 * Check if an achievement has killmails to show
 */
const hasKillmails = (achievement: ICharacterAchievement): boolean => {
    return achievement.killmailIds && achievement.killmailIds.length > 0;
};

/**
 * Get killmails for an achievement
 */
const getKillmailsForAchievement = (achievementId: string): IKillList[] => {
    return killmailData.value.get(achievementId) || [];
};

/**
 * Check if killmails are loading for an achievement
 */
const isLoadingKillmails = (achievementId: string): boolean => {
    return loadingKillmails.value.has(achievementId);
};

/**
 * Format ISK values
 */
const formatIsk = (value: number): string => {
    if (!value) return "0 ISK";

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B ISK`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M ISK`;
    }
    return `${Math.round(value).toLocaleString()} ISK`;
};

/**
 * Format security status color
 */
const getSecurityColor = (security: number): string => {
    if (security >= 0.45) return 'text-green-500';
    if (security >= 0.05) return 'text-yellow-500';
    return 'text-red-500';
};

/**
 * Generate killmail link
 */
const getKillmailLink = (killmailId: number): string => {
    return `/kill/${killmailId}`;
};
</script>
