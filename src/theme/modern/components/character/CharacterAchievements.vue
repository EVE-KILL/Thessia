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

            <Table
                :items="filteredAchievements"
                :columns="columns"
                :loading="false"
                :hover="true"
                :striped="true"
                class="w-full"
            >
                <!-- Achievement Name Column -->
                <template #cell-name="{ item }">
                    <div class="flex items-center space-x-3">
                        <UIcon
                            :name="getAchievementIcon(item)"
                            :class="[
                                'h-5 w-5 flex-shrink-0',
                                getRarityColor(item.rarity)
                            ]"
                        />
                        <div class="min-w-0 flex-1">
                            <div class="font-medium text-gray-900 dark:text-white truncate">
                                {{ getAchievementName(item.achievement_id, item.name, t) }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {{ getAchievementDescription(item.achievement_id, item.description, t) }}
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Type Column -->
                <template #cell-type="{ item }">
                    <UBadge
                        :color="getTypeColor(item.type)"
                        variant="soft"
                        size="xs"
                    >
                        {{ item.type }}
                    </UBadge>
                </template>

                <!-- Rarity Column -->
                <template #cell-rarity="{ item }">
                    <UBadge
                        :color="getRarityBadgeColor(item.rarity)"
                        variant="soft"
                        size="xs"
                    >
                        {{ item.rarity }}
                    </UBadge>
                </template>

                <!-- Category Column -->
                <template #cell-category="{ item }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        {{ item.category }}
                    </span>
                </template>

                <!-- Progress Column -->
                <template #cell-progress="{ item }">
                    <div class="space-y-1 min-w-0 w-32">
                        <div class="flex justify-between items-center text-xs">
                            <span :class="item.is_completed ? 'text-green-600 font-medium' : 'text-gray-600'">
                                {{ item.current_count }} / {{ item.threshold }}
                            </span>
                            <div class="flex items-center gap-1">
                                <span class="text-gray-500">
                                    {{ Math.round((item.current_count / item.threshold) * 100) }}%
                                </span>
                                <span v-if="Math.floor(item.current_count / item.threshold) > 1" class="text-gray-500">
                                    x{{ Math.floor(item.current_count / item.threshold) }}
                                </span>
                            </div>
                        </div>
                        <ProgressBar
                            :value="(item.current_count / item.threshold) * 100"
                            size="xs"
                            color="primary"
                        />
                    </div>
                </template>

                <!-- Points Column -->
                <template #cell-points="{ item }">
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {{ item.points.toLocaleString() }}
                        </div>
                    </div>
                </template>

                <!-- Cumulative Points Column -->
                <template #cell-cumulativePoints="{ item }">
                    <div class="text-right">
                        <div class="text-sm font-medium text-amber-600">
                            {{ (item.points * Math.floor(item.current_count / item.threshold)).toLocaleString() }}
                        </div>
                        <div v-if="Math.floor(item.current_count / item.threshold) > 1" class="text-xs text-gray-500">
                            {{ item.points }} × {{ Math.floor(item.current_count / item.threshold) }}
                        </div>
                        <div v-else-if="Math.floor(item.current_count / item.threshold) === 1" class="text-xs text-gray-500">
                            {{ item.points }} × 1
                        </div>
                    </div>
                </template>

                <!-- Status Column -->
                <template #cell-status="{ item }">
                    <div class="flex items-center space-x-2">
                        <UIcon
                            :name="item.is_completed ? 'i-lucide-check-circle' : item.current_count > 0 ? 'i-lucide-clock' : 'i-lucide-circle'"
                            :class="[
                                'h-4 w-4',
                                item.is_completed ? 'text-green-500' : item.current_count > 0 ? 'text-blue-500' : 'text-gray-400'
                            ]"
                        />
                        <span class="text-xs">
                            {{ item.is_completed ? t('achievements.completed') : item.current_count > 0 ? t('achievements.inProgress') : t('achievements.notStarted') }}
                        </span>
                    </div>
                </template>
            </Table>
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
import Table from '~/components/common/Table.vue';
import { getAchievementName, getAchievementDescription } from '~/server/helpers/AchievementTranslations';

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

// Table columns
const columns = [
    {
        id: 'name',
        header: t('achievements.name'),
        width: '30%'
    },
    {
        id: 'type',
        header: t('achievements.type'),
        width: '8%'
    },
    {
        id: 'rarity',
        header: t('achievements.rarity'),
        width: '8%'
    },
    {
        id: 'category',
        header: t('achievements.category'),
        width: '12%'
    },
    {
        id: 'progress',
        header: t('achievements.progress'),
        width: '12%'
    },
    {
        id: 'points',
        header: t('achievements.basePoints'),
        width: '8%',
        cellClass: 'text-right'
    },
    {
        id: 'cumulativePoints',
        header: t('achievements.earnedPoints'),
        width: '8%',
        cellClass: 'text-right'
    },
    {
        id: 'status',
        header: t('achievements.status'),
        width: '14%'
    }
];

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
</script>
