<template>
    <div class="min-h-screen">
        <div v-if="faction" class="mx-auto p-4 text-gray-900 dark:text-white">
            <!-- Faction Profile Header -->
            <div
                class="faction-header rounded-lg overflow-hidden mb-6 bg-gray-100 bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-30 border border-gray-300 dark:border-gray-800">
                <div class="p-6">
                    <div class="flex flex-col md:flex-row items-start gap-6">
                        <!-- Left: Faction logo -->
                        <div class="flex-shrink-0">
                            <div class="relative">
                                <Image type="corporation" :id="faction.faction_id" :alt="`Faction: ${faction.name}`"
                                    class="w-64 h-64 rounded-lg shadow-lg object-contain" size="256" />
                            </div>
                        </div>

                        <!-- Right: Faction details -->
                        <div class="flex-grow flex flex-col">
                            <!-- Faction info -->
                            <div class="faction-info">
                                <h1 class="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                                    {{ faction.name }}
                                </h1>

                                <p v-if="faction.description"
                                    class="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                    {{ faction.description }}
                                </p>

                                <!-- Faction details grid -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div v-if="faction.faction_id"
                                        class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">{{ $t('faction.id')
                                            }}:</span>
                                        <span class="text-gray-900 dark:text-white font-mono">{{ faction.faction_id
                                            }}</span>
                                    </div>
                                    <div v-if="faction.solar_system_id"
                                        class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">{{
                                            $t('faction.solarSystem') }}:</span>
                                        <NuxtLink :to="`/system/${faction.solar_system_id}`"
                                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200">
                                            {{ faction.solar_system_id }}
                                        </NuxtLink>
                                    </div>
                                    <div v-if="faction.corporation_id"
                                        class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">{{
                                            $t('faction.corporation') }}:</span>
                                        <NuxtLink :to="`/corporation/${faction.corporation_id}`"
                                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200">
                                            {{ faction.corporation_id }}
                                        </NuxtLink>
                                    </div>
                                    <div v-if="faction.militia_corporation_id"
                                        class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">{{
                                            $t('faction.militiaCorporation') }}:</span>
                                        <NuxtLink :to="`/corporation/${faction.militia_corporation_id}`"
                                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200">
                                            {{ faction.militia_corporation_id }}
                                        </NuxtLink>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <Tabs :items="tabItems" v-model="activeTabId" class="space-y-4">
                <template #kills>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/attacker/faction/${faction.faction_id}`"
                            :wsFilter="`faction.${faction.faction_id}`" />
                    </div>
                </template>
                <template #losses>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/losses/faction/${faction.faction_id}`"
                            :wsFilter="`faction.${faction.faction_id}`" />
                    </div>
                </template>
                <template #combined>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/combined/faction/${faction.faction_id}`"
                            :wsFilter="`faction.${faction.faction_id}`" />
                    </div>
                </template>
            </Tabs>
        </div>
        <div v-else-if="pending" class="mx-auto p-4">
            <USkeleton class="h-64 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-lg" />
            </div>
        </div>
        <UCard v-else class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">{{ $t('faction.notFound') }}</h3>
            </template>
            <p>{{ $t('faction.factionDoesNotExist') }}</p>
            <template #footer>
                <div class="flex justify-center">
                    <UButton icon="i-lucide-arrow-left" variant="ghost" @click="() => { navigateTo('/'); }">
                        {{ $t('common.goToHomepage') }}
                    </UButton>
                </div>
            </template>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();

// Get faction ID from route params
const factionId = computed(() => route.params.id as string);

// Define tabs with kills as default
const activeTabId = ref("kills");
const tabItems = computed(() => [
    { id: "kills", label: t("kills"), icon: "i-lucide-trophy", slot: "kills" as const },
    { id: "losses", label: t("losses"), icon: "i-lucide-skull", slot: "losses" as const },
    { id: "combined", label: t("combined"), icon: "i-lucide-home", slot: "combined" as const },
]);

// Fetch faction data
const { data: faction, pending, error } = await useFetch<IFaction>(`/api/factions/${factionId.value}`)

// SEO Meta
useSeoMeta({
    title: faction.value?.name ? `${faction.value.name}` : t('faction.title'),
    description: faction.value?.description || t('faction.defaultDescription'),
    ogTitle: faction.value?.name ? `${faction.value.name} | EVE-KILL` : t('faction.title'),
    ogDescription: faction.value?.description || t('faction.defaultDescription'),
    twitterTitle: faction.value?.name ? `${faction.value.name} | EVE-KILL` : t('faction.title'),
    twitterDescription: faction.value?.description || t('faction.defaultDescription'),
});
</script>

<style scoped>
/* Responsive adjustments for mobile */
@media (max-width: 768px) {
    .w-64 {
        width: 8rem;
        height: 8rem;
    }
}
</style>
