<template>
    <div class="min-h-screen">
        <div v-if="system" class="mx-auto p-4 text-white">
            <UCard class="mb-4 bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
                <div class="flex flex-col gap-2">
                    <h1 class="text-2xl font-bold">{{ system.system_name }}</h1>
                    <div class="text-gray-400 text-sm">
                        System ID: {{ system.system_id }}
                        <span v-if="system.security !== undefined">
                            &mdash; Security: <span :style="{ color: getSecurityStatusColor(system.security) }">{{
                                system.security.toFixed(2) }}</span>
                        </span>
                    </div>
                </div>
            </UCard>
            <UTabs :items="tabItems" v-model="selectedTabIndex" class="space-y-4">
                <template #overview>
                    <div class="tab-content">
                        <KillList killlistType="latest" :limit="100"
                            :apiEndpoint="`/api/killlist/system/${system.system_id}`"
                            :wsFilter="`system.${system.system_id}`" />
                    </div>
                </template>
                <template #battles>
                    <div class="tab-content">
                        <SystemBattles />
                    </div>
                </template>
            </UTabs>
        </div>
        <div v-else-if="pending" class="mx-auto p-4">
            <USkeleton class="h-32 rounded-lg mb-4" />
            <USkeleton class="h-8 w-64 mb-6" />
        </div>
        <UCard v-else class="mx-auto p-4 text-center bg-black bg-opacity-30 dark:bg-gray-900 dark:bg-opacity-30">
            <template #header>
                <div class="flex justify-center mb-2">
                    <UIcon name="i-lucide-alert-triangle" class="text-amber-500 h-8 w-8" />
                </div>
                <h3 class="text-lg font-medium text-center">System Not Found</h3>
            </template>
            <p>This solar system does not exist or could not be loaded.</p>
            <template #footer>
                <div class="flex justify-center">
                    <UButton icon="i-lucide-arrow-left" variant="ghost" @click="() => { navigateTo('/'); }">
                        Go to Homepage
                    </UButton>
                </div>
            </template>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import SystemBattles from '~/components/system/SystemBattles.vue';
import KillList from '../../components/common/KillList.vue';

const route = useRoute();
const router = useRouter();
const { id } = route.params;

const {
    data: system,
    pending,
    error,
} = useFetch(`/api/solarsystems/${id}`);

const getSecurityStatusColor = (security: number): string => {
    if (security >= 0.5) return "#00FF00";
    if (security >= 0.0) return "#FFFF00";
    if (security >= -5.0) return "#FF8C00";
    return "#FF0000";
};

const { t } = useI18n();
const tabItems = [
    { id: "overview", label: t("overview"), icon: "i-lucide-home", slot: "overview" as const },
    { id: "battles", label: t("battles"), icon: "i-lucide-swords", slot: "battles" as const },
];

const selectedTabIndex = computed({
    get() {
        const hash = route.hash.slice(1);
        const tabIndex = tabItems.findIndex(item => item.id === hash);
        return tabIndex >= 0 ? String(tabIndex) : '0';
    },
    set(newIndex) {
        const index = parseInt(newIndex, 10);
        const tabId = tabItems[index]?.id || 'overview';
        router.push({
            path: `/system/${id}`,
            hash: `#${tabId}`,
        });
    }
});

onMounted(() => {
    if (!route.hash) {
        router.replace({
            path: route.path,
            hash: '#overview'
        }, { preserveState: true });
    }
});
</script>
