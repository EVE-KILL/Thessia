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
            <KillList killlistType="latest" :limit="100" :apiEndpoint="`/api/killlist/system/${system.system_id}`" />
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
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import KillList from '../../components/common/KillList.vue';

const route = useRoute();
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
</script>
