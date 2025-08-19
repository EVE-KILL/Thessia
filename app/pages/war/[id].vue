<template>
    <div class="min-h-screen text-white">
        <UContainer class="py-8">
            <!-- Loading State -->
            <div v-if="pending" class="space-y-4">
                <USkeleton class="h-20 w-full" />
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <USkeleton class="h-64 w-full" />
                    <USkeleton class="h-64 w-full" />
                </div>
                <USkeleton class="h-96 w-full" />
            </div>

            <!-- Error State -->
            <div v-else-if="error || !warData" class="text-center py-16 text-gray-400">
                <h2 class="text-3xl font-bold mb-4">{{ t('war.error.title') }}</h2>
                <p>{{ t('war.error.notFound') }}</p>
                <NuxtLink to="/wars" class="mt-4 inline-block text-blue-400 hover:text-blue-300 hover:underline">
                    {{ t('war.error.backToWars') }}
                </NuxtLink>
            </div>

            <!-- War Details -->
            <div v-else>
                <!-- War Header -->
                <div class="mb-6">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <h1 class="text-3xl font-bold text-zinc-100">
                                    {{ t('war.title') }} #{{ warData.war_id }}
                                </h1>
                                <UBadge v-if="warData.finished" color="error" variant="soft" size="sm">
                                    <UIcon name="lucide:x" class="w-3 h-3 mr-1" />
                                    {{ t('wars.status.finished') }}
                                </UBadge>
                                <UBadge v-else color="success" variant="soft" size="sm">
                                    <UIcon name="lucide:check" class="w-3 h-3 mr-1" />
                                    {{ t('wars.status.ongoing') }}
                                </UBadge>
                            </div>

                            <div class="text-sm text-zinc-400 space-y-1">
                                <div class="flex items-center gap-4">
                                    <span><strong>{{ t('war.started') }}:</strong> {{ formatDateDisplay(warData.started)
                                    }}</span>
                                    <span v-if="warData.finished"><strong>{{ t('war.finished') }}:</strong> {{
                                        formatDateDisplay(warData.finished) }}</span>
                                </div>
                                <div v-if="!warData.finished" class="flex items-center gap-2">
                                    <UBadge v-if="warData.mutual" color="warning" variant="soft" size="xs">
                                        {{ t('wars.status.mutual') }}
                                    </UBadge>
                                    <UBadge v-if="warData.open_for_allies" color="info" variant="soft" size="xs">
                                        {{ t('wars.status.openToAllies') }}
                                    </UBadge>
                                </div>
                            </div>
                        </div>

                        <!-- War Stats Summary -->
                        <div v-if="warStats" class="text-right">
                            <div class="text-2xl font-bold text-zinc-100">{{ formatIsk(warStats.totalValue) }}</div>
                            <div class="text-sm text-zinc-400">{{ t('war.totalDestroyed') }}</div>
                            <div class="flex justify-end gap-4 mt-2 text-sm">
                                <div class="text-center">
                                    <div class="font-semibold text-zinc-100">{{ warStats.totalKills }}</div>
                                    <div class="text-zinc-400">{{ t('war.kills') }}</div>
                                </div>
                                <div class="text-center">
                                    <div class="font-semibold text-zinc-100">{{ warStats.uniqueParticipants }}</div>
                                    <div class="text-zinc-400">{{ t('war.participants') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- War Participants -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <!-- Aggressor Side -->
                    <div
                        class="border border-gray-700/50 rounded-lg p-4 bg-gradient-to-br from-red-950/10 to-red-900/5">
                        <h3 class="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            <UIcon name="lucide:sword" class="w-5 h-5" />
                            {{ t('war.aggressor') }}
                        </h3>

                        <div class="flex items-center space-x-3 mb-4">
                            <Image v-if="warData.aggressor.alliance" :type="'alliance'"
                                :id="warData.aggressor.alliance_id" :size="48" :alt="warData.aggressor.alliance?.name"
                                class="w-12 h-12 rounded" />
                            <Image v-else-if="warData.aggressor.corporation" :type="'corporation'"
                                :id="warData.aggressor.corporation_id" :size="48"
                                :alt="warData.aggressor.corporation?.name" class="w-12 h-12 rounded" />
                            <div>
                                <div v-if="warData.aggressor.alliance" class="font-medium text-zinc-100">
                                    <NuxtLink :to="`/alliance/${warData.aggressor.alliance_id}`"
                                        class="hover:text-blue-400">
                                        {{ warData.aggressor.alliance.name }}
                                    </NuxtLink>
                                </div>
                                <div v-if="warData.aggressor.corporation"
                                    :class="warData.aggressor.alliance ? 'text-sm text-zinc-400' : 'font-medium text-zinc-100'">
                                    <NuxtLink :to="`/corporation/${warData.aggressor.corporation_id}`"
                                        class="hover:text-blue-400">
                                        {{ warData.aggressor.corporation.name }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>

                        <!-- Aggressor Stats -->
                        <div v-if="warStats" class="grid grid-cols-2 gap-4 text-sm">
                            <div class="text-center p-2 border border-gray-700/30 rounded bg-black/20">
                                <div class="font-semibold text-zinc-100">{{ formatIsk(warData.aggressor.isk_destroyed ||
                                    0) }}</div>
                                <div class="text-zinc-400">{{ t('war.iskDestroyed') }}</div>
                            </div>
                            <div class="text-center p-2 border border-gray-700/30 rounded bg-black/20">
                                <div class="font-semibold text-zinc-100">{{ warData.aggressor.ships_killed || 0 }}</div>
                                <div class="text-zinc-400">{{ t('war.shipsKilled') }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Defender Side -->
                    <div
                        class="border border-gray-700/50 rounded-lg p-4 bg-gradient-to-br from-blue-950/10 to-blue-900/5">
                        <h3 class="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <UIcon name="lucide:shield" class="w-5 h-5" />
                            {{ t('war.defender') }}
                        </h3>

                        <div class="flex items-center space-x-3 mb-4">
                            <Image v-if="warData.defender.alliance" :type="'alliance'"
                                :id="warData.defender.alliance_id" :size="48" :alt="warData.defender.alliance?.name"
                                class="w-12 h-12 rounded" />
                            <Image v-else-if="warData.defender.corporation" :type="'corporation'"
                                :id="warData.defender.corporation_id" :size="48"
                                :alt="warData.defender.corporation?.name" class="w-12 h-12 rounded" />
                            <div>
                                <div v-if="warData.defender.alliance" class="font-medium text-zinc-100">
                                    <NuxtLink :to="`/alliance/${warData.defender.alliance_id}`"
                                        class="hover:text-blue-400">
                                        {{ warData.defender.alliance.name }}
                                    </NuxtLink>
                                </div>
                                <div v-if="warData.defender.corporation"
                                    :class="warData.defender.alliance ? 'text-sm text-zinc-400' : 'font-medium text-zinc-100'">
                                    <NuxtLink :to="`/corporation/${warData.defender.corporation_id}`"
                                        class="hover:text-blue-400">
                                        {{ warData.defender.corporation.name }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>

                        <!-- Defender Stats -->
                        <div v-if="warStats" class="grid grid-cols-2 gap-4 text-sm">
                            <div class="text-center p-2 border border-gray-700/30 rounded bg-black/20">
                                <div class="font-semibold text-zinc-100">{{ formatIsk(warData.defender.isk_destroyed ||
                                    0) }}</div>
                                <div class="text-zinc-400">{{ t('war.iskDestroyed') }}</div>
                            </div>
                            <div class="text-center p-2 border border-gray-700/30 rounded bg-black/20">
                                <div class="font-semibold text-zinc-100">{{ warData.defender.ships_killed || 0 }}</div>
                                <div class="text-zinc-400">{{ t('war.shipsKilled') }}</div>
                            </div>
                        </div>
                    </div>
                </div> <!-- Allies Section -->
                <div v-if="warData.allies && warData.allies.length > 0" class="mb-8">
                    <h3 class="text-xl font-bold text-zinc-100 mb-4">{{ t('war.allies') }}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="ally in warData.allies"
                            :key="`${ally.alliance_id || 'corp'}-${ally.corporation_id}`"
                            class="flex items-center space-x-3">
                            <Image v-if="ally.alliance" :type="'alliance'" :id="ally.alliance_id" :size="32"
                                :alt="ally.alliance?.name" class="w-8 h-8 rounded" />
                            <Image v-else-if="ally.corporation" :type="'corporation'" :id="ally.corporation_id"
                                :size="32" :alt="ally.corporation?.name" class="w-8 h-8 rounded" />
                            <div>
                                <div v-if="ally.alliance" class="font-medium text-zinc-100 text-sm">
                                    <NuxtLink :to="`/alliance/${ally.alliance_id}`" class="hover:text-blue-400">
                                        {{ ally.alliance.name }}
                                    </NuxtLink>
                                </div>
                                <div v-if="ally.corporation"
                                    :class="ally.alliance ? 'text-xs text-zinc-400' : 'font-medium text-zinc-100 text-sm'">
                                    <NuxtLink :to="`/corporation/${ally.corporation_id}`" class="hover:text-blue-400">
                                        {{ ally.corporation.name }}
                                    </NuxtLink>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- War Timeline and Killmails -->
                <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <!-- Killmails List (75% width) -->
                    <div class="xl:col-span-3">
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold text-zinc-100">{{ t('war.killmails') }}</h3>
                            <p class="text-zinc-400 text-sm mt-1">{{ t('war.killmailsDesc') }}</p>
                        </div>
                        <KillList :api-endpoint="`/api/killlist/war/${warId}`" :limit="50" :ws-disabled="true" />
                    </div>

                    <!-- Stats Sidebar (25% width) -->
                    <div class="xl:col-span-1 space-y-6">
                        <!-- Top Participants -->
                        <div v-if="warStats?.topKillers"
                            class="border border-gray-700/50 rounded-lg p-4 bg-gradient-to-b from-gray-900/30 to-gray-800/20">
                            <h4 class="font-medium text-zinc-100 mb-3 pb-2 border-b border-gray-700/30">{{
                                t('war.topKillers') }}</h4>
                            <div class="space-y-3">
                                <div v-for="killer in warStats.topKillers.slice(0, 10)" :key="killer.character_id"
                                    class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2 min-w-0">
                                        <Image type="character" :id="killer.character_id" :size="24"
                                            class="w-6 h-6 rounded" />
                                        <div class="min-w-0">
                                            <NuxtLink :to="`/character/${killer.character_id}`"
                                                class="text-sm font-medium text-zinc-100 hover:text-blue-400 truncate">
                                                {{ killer.character_name }}
                                            </NuxtLink>
                                        </div>
                                    </div>
                                    <div class="text-sm font-medium text-zinc-400">
                                        {{ killer.kills }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Most Valuable Kills -->
                        <div v-if="warStats?.mostValuable"
                            class="border border-gray-700/50 rounded-lg p-4 bg-gradient-to-b from-gray-900/30 to-gray-800/20">
                            <h4 class="font-medium text-zinc-100 mb-3 pb-2 border-b border-gray-700/30">{{
                                t('war.mostValuable') }}</h4>
                            <div class="space-y-3">
                                <div v-for="kill in warStats.mostValuable.slice(0, 5)" :key="kill.killmail_id"
                                    class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2 min-w-0">
                                        <Image type="type-icon" :id="kill.ship_id" :size="24" class="w-6 h-6" />
                                        <div class="min-w-0">
                                            <NuxtLink :to="`/kill/${kill.killmail_id}`"
                                                class="text-sm font-medium text-zinc-100 hover:text-blue-400 truncate">
                                                {{ getLocalizedString(kill.ship_name, 'Unknown Ship') }}
                                            </NuxtLink>
                                        </div>
                                    </div>
                                    <div class="text-sm font-medium text-zinc-400">
                                        {{ formatIsk(kill.total_value) }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Ship Type Breakdown -->
                        <div v-if="warStats?.shipTypes"
                            class="border border-gray-700/50 rounded-lg p-4 bg-gradient-to-b from-gray-900/30 to-gray-800/20">
                            <h4 class="font-medium text-zinc-100 mb-3 pb-2 border-b border-gray-700/30">{{
                                t('war.shipTypes') }}</h4>
                            <div class="space-y-3">
                                <div v-for="shipType in warStats.shipTypes.slice(0, 8)" :key="shipType.group_id"
                                    class="flex items-center justify-between">
                                    <div class="text-sm font-medium text-zinc-100 truncate">
                                        {{ getLocalizedString(shipType.group_name, 'Unknown Ship Type') }}
                                    </div>
                                    <div class="text-sm font-medium text-zinc-400">
                                        {{ shipType.count }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

// Get war ID from route params
const warId = computed(() => Number(route.params.id));

// Use the centralized date formatting composable
const {
    formatTimeAgo,
    formatDateDisplay,
    formatDateTime,
} = useDateFormatting();

// Helper function to get localized string from translation object
const getLocalizedString = (obj: any, fallback: string = 'Unknown'): string => {
    if (!obj) return fallback;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        const { locale } = useI18n();
        return obj[locale.value] || obj.en || obj.de || Object.values(obj)[0] || fallback;
    }
    return fallback;
};

// SEO setup
useSeoMeta({
    title: () => `${t('war.title')} #${warId.value}`,
    description: () => t('war.seo.description', { warId: warId.value }),
    ogTitle: () => `${t('war.title')} #${warId.value}`,
    ogDescription: () => t('war.seo.description', { warId: warId.value }),
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => `${t('war.title')} #${warId.value}`,
    twitterDescription: () => t('war.seo.description', { warId: warId.value })
});

// Fetch war data and stats
const { data, pending, error } = await useFetch(`/api/war/${warId.value}`, {
    key: `war-${warId.value}`,
    server: true,
    default: () => null,
});

const warData = computed(() => data.value?.war || null);
const warStats = computed(() => data.value?.stats || null);

// Handle 404 for invalid war IDs
if (!pending.value && !warData.value) {
    throw createError({
        statusCode: 404,
        statusMessage: 'War not found'
    });
}
</script>

<style scoped>
.container {
    max-width: 1400px;
}
</style>
