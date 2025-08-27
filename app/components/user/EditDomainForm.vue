<template>
    <div class="space-y-6">
        <form @submit.prevent="onSubmit" class="space-y-4">
            <div>
                <label for="domain" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('settings.domains.form.domain') }} *
                </label>
                <input id="domain" v-model="state.domain" type="text"
                    :placeholder="t('settings.domains.form.domainPlaceholder')" :disabled="isSubmitting"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    required />
            </div>

            <!-- Entity Selection with Search -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('settings.domains.form.entity') }} *
                </label>
                <Search v-model="entitySearchQuery" :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                    :transform-response="(data) => data?.hits?.filter(hit => ['character', 'corporation', 'alliance'].includes(hit.type)) || []"
                    :result-name="(result) => formatSearchResultDisplayName(result)" :min-length="2"
                    :placeholder="t('settings.domains.form.entitySearchPlaceholder')"
                    input-class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    dropdown-class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                    @select="selectEntity">
                    <template #results="{ results, selectResult }">
                        <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                            class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                            <div class="flex-shrink-0 mr-3">
                                <Image :type="result.type" :id="result.id" :size="24" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium truncate">{{ formatSearchResultDisplayName(result) }}</div>
                                <div class="text-xs text-gray-500 truncate capitalize">{{ result.type }}</div>
                            </div>
                        </a>
                    </template>

                    <template #loading>
                        <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {{ t('search.searching') }}...
                        </div>
                    </template>

                    <template #no-results>
                        <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {{ t('search.noResults') }}
                        </div>
                    </template>
                </Search>

                <!-- Selected Entity Display -->
                <div v-if="selectedEntity"
                    class="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center space-x-3">
                        <Image :type="selectedEntity.type" :id="selectedEntity.id" :size="32" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-gray-100">
                                {{ formatSearchResultDisplayName(selectedEntity) }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {{ selectedEntity.type }}
                            </div>
                        </div>
                        <button type="button" @click="clearSelectedEntity"
                            class="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Custom Branding Section -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    {{ t('settings.domains.form.customBranding') }}
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="primaryColor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.form.primaryColor') }}
                        </label>
                        <input id="primaryColor" v-model="state.branding.primaryColor" type="color"
                            :disabled="isSubmitting"
                            class="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700" />
                    </div>

                    <div>
                        <label for="secondaryColor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.form.secondaryColor') }}
                        </label>
                        <input id="secondaryColor" v-model="state.branding.secondaryColor" type="color"
                            :disabled="isSubmitting"
                            class="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700" />
                    </div>
                </div>

                <div class="mt-4">
                    <label for="logoUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.form.logoUrl') }}
                    </label>
                    <input id="logoUrl" v-model="state.branding.logoUrl" type="url"
                        :placeholder="t('settings.domains.form.logoUrlPlaceholder')" :disabled="isSubmitting"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                </div>

                <div class="mt-4">
                    <label for="customCss" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.form.customCss') }}
                    </label>
                    <textarea id="customCss" v-model="state.branding.customCss"
                        :placeholder="t('settings.domains.form.customCssPlaceholder')" :disabled="isSubmitting" rows="4"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
                </div>
            </div>

            <div class="flex gap-3 pt-4">
                <button type="submit" :disabled="isSubmitting || !isFormValid"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors">
                    <UIcon v-if="isSubmitting" name="lucide:loader-2" class="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {{ isSubmitting ? t('settings.domains.form.updating') : t('settings.domains.form.update') }}
                </button>
                <button type="button" @click="$emit('cancel')" :disabled="isSubmitting"
                    class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                    {{ t('settings.domains.form.cancel') }}
                </button>
            </div>

            <!-- Form validation errors -->
            <div v-if="!isFormValid && (state.domain || selectedEntity)" class="mt-2 text-sm text-red-600">
                <ul class="list-disc list-inside space-y-1">
                    <li v-if="!state.domain">Domain is required</li>
                    <li v-if="!selectedEntity">Please select an entity (character, corporation, or alliance)</li>
                </ul>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod';

const { t } = useI18n()

const props = defineProps<{
    domain: any
}>()

const emit = defineEmits<{
    updated: [domain: any]
    cancel: []
}>()

const isSubmitting = ref(false)

const schema = z.object({
    domain: z.string().min(1, 'Domain is required').regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
    entityType: z.string().min(1, 'Entity type is required'),
    entityId: z.number().min(1, 'Entity is required'),
    branding: z.object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        logoUrl: z.string().url().optional().or(z.literal('')),
        customCss: z.string().optional()
    }).optional()
})

const state = reactive({
    domain: props.domain.domain || '',
    entityType: props.domain.entity_type || '',
    entityId: props.domain.entity_id || undefined as number | undefined,
    branding: {
        primaryColor: props.domain.branding?.primary_color || '#007bff',
        secondaryColor: props.domain.branding?.secondary_color || '#6c757d',
        logoUrl: props.domain.branding?.logo_url || '',
        customCss: props.domain.branding?.custom_css || ''
    }
})

// Search component variables
const entitySearchQuery = ref('')
const selectedEntity = ref<any>(null)

// Initialize selectedEntity with existing domain data
onMounted(() => {
    if (props.domain.entity_id && props.domain.entity_type) {
        selectedEntity.value = {
            id: props.domain.entity_id,
            type: props.domain.entity_type,
            name: props.domain.entity_name || `${props.domain.entity_type} #${props.domain.entity_id}`,
            ticker: props.domain.entity_ticker || undefined,
            date_founded: props.domain.entity_founded || undefined
        }
    }
})

// Helper function to format search result display name
const formatSearchResultDisplayName = (result: any) => {
    let displayName = result.name

    // Add ticker for alliances and corporations
    if (result.ticker && (result.type === 'alliance' || result.type === 'corporation')) {
        displayName = `${result.name} [${result.ticker}]`
    }

    // Add founded date for context
    if (result.date_founded && (result.type === 'alliance' || result.type === 'corporation')) {
        const foundedDate = new Date(result.date_founded)
        const year = foundedDate.getFullYear()
        displayName += ` (${year})`
    }

    return displayName
}

// Handle entity selection from search
const selectEntity = (result: any) => {
    selectedEntity.value = result
    state.entityType = result.type
    state.entityId = result.id
    entitySearchQuery.value = ''
}

// Clear selected entity
const clearSelectedEntity = () => {
    selectedEntity.value = null
    state.entityType = ''
    state.entityId = undefined
    entitySearchQuery.value = ''
}

// Form validation computed property
const isFormValid = computed(() => {
    return !!(state.domain && state.entityType && state.entityId && selectedEntity.value)
})

const onSubmit = async (event: any) => {
    // Prevent submission if form is not valid
    if (!isFormValid.value) {
        console.error('Form validation failed:', {
            domain: state.domain,
            entityType: state.entityType,
            entityId: state.entityId,
            selectedEntity: selectedEntity.value
        })
        return
    }
    isSubmitting.value = true

    try {
        // Validate the form data
        const validatedData = schema.parse({
            domain: state.domain,
            entityType: state.entityType,
            entityId: state.entityId,
            branding: state.branding
        })

        const response = await $fetch(`/api/user/domains/${props.domain.domain_id}`, {
            method: 'PATCH',
            body: {
                domain: validatedData.domain,
                entity_type: validatedData.entityType,
                entity_id: validatedData.entityId,
                branding: validatedData.branding
            }
        }) as { domain: any }

        emit('updated', response.domain)
    } catch (error: any) {
        console.error('Failed to update domain:', error)

        if (error.name === 'ZodError') {
            // Handle validation errors
            console.error('Validation errors:', error.errors)
        } else {
            throw createError({
                statusCode: error.status || 500,
                statusMessage: error.data?.message || 'Failed to update domain'
            })
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>
