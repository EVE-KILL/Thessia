<template>
    <h1 class="text-2xl font-bold mb-6 capitalize">
        {{ typeLabel }}
    </h1>
    <ClientOnly>
        <KillList v-if="isValidType" :killlistType="currentType" :limit="100" :key="componentKey"
            :wsFilter="currentType" />
        <div v-else class="text-center text-gray-400 py-16">
            <h2 class="text-3xl font-bold mb-4">404</h2>
            <p>{{ t('notFound') }}</p>
        </div>
    </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import KillList from '~/src/theme/modern/components/common/KillList.vue'

const allowedTypes = [
    'latest', 'abyssal', 'wspace', 'highsec', 'lowsec', 'nullsec', 'pochven', 'big', 'solo', 'npc',
    '5b', '10b', 'citadels', 't1', 't2', 't3', 'frigates', 'destroyers', 'cruisers',
    'battlecruisers', 'battleships', 'capitals', 'freighters', 'supercarriers', 'titans'
]

const route = useRoute()
const { t } = useI18n()

const currentType = ref('')
const componentKey = ref(0)
const isValidType = computed(() => allowedTypes.includes(currentType.value))
const typeLabel = computed(() => {
    return currentType.value.charAt(0).toUpperCase() + currentType.value.slice(1)
})

// Use watchEffect to reactively track route changes
watchEffect(() => {
    const newType = route.params.type?.toString() || ''
    if (newType !== currentType.value) {
        currentType.value = newType
        // Increment key to force full component remount
        componentKey.value++
    }
})

// Define proper metadata for SEO
useSeoMeta({
    title: () => `${typeLabel.value} Kills | Eve-Kill.net`,
    description: () => `Browse ${typeLabel.value} kills in EVE Online`,
})
</script>
