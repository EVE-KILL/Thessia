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

                <!-- Domain Type Info -->
                <div class="mt-2 space-y-2">
                    <div
                        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                        <div class="flex items-start gap-2">
                            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-600 mt-0.5" />
                            <div class="text-xs">
                                <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">Eve-kill.com Subdomains
                                    (Recommended)</p>
                                <p class="text-blue-800 dark:text-blue-200">
                                    Use <strong>yourname.eve-kill.com</strong> for instant activation - no DNS
                                    verification needed!
                                    <br />Examples: <code
                                        class="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">corp.eve-kill.com</code>,
                                    <code
                                        class="text-xs bg-blue-100 dark:bg-blue-800 px-1 rounded">alliance.eve-kill.com</code>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div
                        class="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                        <div class="flex items-start gap-2">
                            <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 text-gray-600 mt-0.5" />
                            <div class="text-xs">
                                <p class="font-medium text-gray-900 dark:text-gray-100 mb-1">External Domains</p>
                                <p class="text-gray-700 dark:text-gray-300">
                                    Use your own domain (requires DNS verification before activation)
                                    <br />Examples: <code
                                        class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">example.com</code>,
                                    <code
                                        class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">killboard.example.com</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PHASE 2: Multi-Entity vs Single Entity Mode -->
            <div>
                <!-- Multi-Entity Selection -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('settings.domains.form.entities') }} *
                    </label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Add up to 10 characters, corporations, or alliances to this domain.
                    </p>

                    <!-- Add Entity Search -->
                    <div class="space-y-3">
                        <Search v-model="entitySearchQuery"
                            :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                            :transform-response="(data) => data?.hits?.filter((hit: any) => ['character', 'corporation', 'alliance'].includes(hit.type)) || []"
                            :result-name="(result) => formatSearchResultDisplayName(result)" :min-length="2"
                            :placeholder="t('settings.domains.form.entitySearchPlaceholder')"
                            input-class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            dropdown-class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                            @select="addEntityToList">

                            <template #results="{ results, selectResult }">
                                <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                                    class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                                    <div class="flex-shrink-0 mr-3">
                                        <Image :type="result.type" :id="result.id" :size="24" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium truncate">{{ formatSearchResultDisplayName(result) }}
                                        </div>
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

                        <!-- Selected Entities List -->
                        <div v-if="selectedEntities.length > 0" class="space-y-2">
                            <div v-for="(entity, index) in selectedEntities" :key="`${entity.type}-${entity.id}`"
                                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div class="flex items-center space-x-3">
                                    <Image :type="entity.type" :id="entity.id" :size="32" />
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-gray-100">
                                            {{ formatSearchResultDisplayName(entity) }}
                                        </div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                            {{ entity.type }}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 ml-4">
                                        <span v-if="entity.primary"
                                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Primary
                                        </span>
                                        <span v-if="entity.show_in_nav"
                                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            In Nav
                                        </span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <!-- Primary Toggle -->
                                    <button v-if="!entity.primary" @click="setPrimaryEntity(index)"
                                        class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        Make Primary
                                    </button>

                                    <!-- Navigation Toggle -->
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" v-model="entity.show_in_nav" class="sr-only peer">
                                        <div
                                            class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                        </div>
                                    </label>

                                    <!-- Remove -->
                                    <button type="button" @click="removeEntityFromList(index)"
                                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M6 18L18 6M6 6l12 12">
                                            </path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Entity Limit Info -->
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            {{ selectedEntities.length }} / 10 entities selected
                        </div>
                    </div>
                </div>
            </div>

            <!-- PHASE 2: Enhanced Branding Section -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    {{ t('settings.domains.form.customBranding') }}
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="primaryColor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.form.primaryColor') }}
                        </label>
                        <input id="primaryColor" v-model="state.branding.primary_color" type="color"
                            :disabled="isSubmitting"
                            class="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700" />
                    </div>

                    <div>
                        <label for="themeMode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Theme Mode
                        </label>
                        <select id="themeMode" v-model="state.branding.theme_mode" :disabled="isSubmitting"
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm">
                            <option value="auto">Auto</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>

                <!-- Header Title -->
                <div class="mb-4">
                    <label for="headerTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Custom Header Title
                    </label>
                    <input id="headerTitle" v-model="state.branding.header_title" type="text"
                        placeholder="Your custom domain title" :disabled="isSubmitting"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Leave empty to use default domain-based title
                    </p>
                </div>

                <!-- Welcome Messages -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Welcome Messages</h4>

                    <div class="space-y-4">
                        <div>
                            <label for="welcomeMessage"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Primary Welcome Message
                            </label>
                            <textarea id="welcomeMessage" v-model="state.branding.welcome_message"
                                placeholder="Welcome to our killboard! Track our combat activities and strategic achievements in New Eden."
                                :disabled="isSubmitting" rows="3"
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Leave empty to use auto-generated welcome message based on entities
                            </p>
                        </div>

                        <div>
                            <label for="secondaryMessage"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Secondary Message (Optional)
                            </label>
                            <textarea id="secondaryMessage" v-model="state.branding.secondary_message"
                                placeholder="Additional information about your organization or mission."
                                :disabled="isSubmitting" rows="2"
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Additional text displayed below the main welcome message
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Call-to-Action Buttons -->
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                            Call-to-Action Buttons
                        </h4>
                        <button type="button" @click="addCTAButton" :disabled="state.branding.cta_buttons.length >= 5"
                            class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 4v16m8-8H4"></path>
                            </svg>
                            Add Button
                        </button>
                    </div>

                    <div v-if="state.branding.cta_buttons.length === 0"
                        class="text-center py-4 text-gray-500 dark:text-gray-400">
                        <p class="text-sm">No call-to-action buttons configured</p>
                    </div>

                    <div v-else class="space-y-3">
                        <div v-for="(button, index) in state.branding.cta_buttons" :key="index"
                            class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Button #{{ index + 1 }}
                                </span>
                                <button type="button" @click="removeCTAButton(index)"
                                    class="inline-flex items-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                                        </path>
                                    </svg>
                                </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Button Text
                                    </label>
                                    <input v-model="button.text" type="text" maxlength="50" placeholder="Join Us"
                                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                                </div>

                                <div>
                                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        URL
                                    </label>
                                    <input v-model="button.url" type="url" maxlength="500"
                                        placeholder="https://discord.gg/..."
                                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                                </div>
                            </div>

                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" v-model="button.primary"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                        <span class="text-xs text-gray-700 dark:text-gray-300">Primary Button</span>
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" v-model="button.external"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                        <span class="text-xs text-gray-700 dark:text-gray-300">External Link</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <label for="bannerImageUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Banner Image URL
                    </label>
                    <input id="bannerImageUrl" v-model="state.branding.banner_image_url" type="url"
                        placeholder="https://example.com/banner.jpg" :disabled="isSubmitting"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                </div>

                <div class="mb-4">
                    <label for="customCss" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.form.customCss') }}
                    </label>
                    <textarea id="customCss" v-model="state.branding.custom_css"
                        :placeholder="t('settings.domains.form.customCssPlaceholder')" :disabled="isSubmitting" rows="4"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
                </div>
            </div>

            <!-- PHASE 2: Page Component Selection -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    Page Components
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Choose which components to display on your custom domain pages.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.recent_kills"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Recent Kills</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show recent killmails</div>
                        </div>
                    </label>

                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.top_pilots"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Top Pilots</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show top pilots leaderboard</div>
                        </div>
                    </label>

                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.campaigns"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Campaigns</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show active campaigns</div>
                        </div>
                    </label>

                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.battles"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Battles</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show battle reports</div>
                        </div>
                    </label>

                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.stats_overview"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Statistics</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show statistics overview</div>
                        </div>
                    </label>

                    <label
                        class="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" v-model="state.page_config.components.search_widget"
                            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">Search Widget</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Show search functionality</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="flex gap-3 pt-4">
                <button type="submit" :disabled="isSubmitting || !isFormValid"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors">
                    <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    {{ isSubmitting ? t('settings.domains.form.creating') : t('settings.domains.form.submit') }}
                </button>
                <button type="button" @click="$emit('cancel')" :disabled="isSubmitting"
                    class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                    {{ t('settings.domains.form.cancel') }}
                </button>
            </div>

            <!-- Form validation errors -->
            <div v-if="!isFormValid && (state.domain || hasSelectedEntities)"
                class="mt-2 text-sm text-red-600 dark:text-red-400">
                <ul class="list-disc list-inside space-y-1">
                    <li v-if="!state.domain">Domain is required</li>
                    <li v-if="!hasSelectedEntities">Please select at least one entity</li>
                </ul>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
interface Props {
    // Multi-entity mode is always enabled in Phase 2
}

interface Emits {
    (e: 'created', domain: any): void;
    (e: 'cancel'): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();
const { t } = useI18n();

const isSubmitting = ref(false);

// PHASE 2: Enhanced state for multi-entity support
const state = reactive({
    domain: '',
    branding: {
        primary_color: '#3B82F6',
        theme_mode: 'auto',
        banner_image_url: '',
        custom_css: '',
        header_title: '',
        welcome_message: '',
        secondary_message: '',
        cta_buttons: []
    },
    page_config: {
        layout: 'default',
        components: {
            recent_kills: true,
            top_pilots: true,
            campaigns: true,
            battles: true,
            stats_overview: true,
            search_widget: true,
            news_feed: false,
            social_links: false
        }
    },
    features: {
        show_campaigns: true,
        featured_campaign_id: ''
    }
});

// Multi-entity mode variables
const selectedEntities = ref<any[]>([]);
const entitySearchQuery = ref('');

// Helper functions
const formatSearchResultDisplayName = (result: any) => {
    let displayName = result.name;
    if (result.ticker && (result.type === 'alliance' || result.type === 'corporation')) {
        displayName = `${result.name} [${result.ticker}]`;
    }
    return displayName;
};

// Multi-entity functions
const addEntityToList = (result: any) => {
    // Check if entity already exists
    const exists = selectedEntities.value.some(entity =>
        entity.type === result.type && entity.id === result.id
    );

    if (exists || selectedEntities.value.length >= 10) {
        return;
    }

    const newEntity = {
        ...result,
        primary: selectedEntities.value.length === 0, // First entity is primary
        show_in_nav: true
    };

    selectedEntities.value.push(newEntity);
    entitySearchQuery.value = '';
};

const removeEntityFromList = (index: number) => {
    const wasRemovingPrimary = selectedEntities.value[index].primary;
    selectedEntities.value.splice(index, 1);

    // If we removed the primary entity, make the first entity primary
    if (wasRemovingPrimary && selectedEntities.value.length > 0) {
        selectedEntities.value[0].primary = true;
    }
};

const setPrimaryEntity = (index: number) => {
    selectedEntities.value.forEach((entity, i) => {
        entity.primary = i === index;
    });
};

// Computed properties
const hasSelectedEntities = computed(() => {
    return selectedEntities.value.length > 0;
});

const isFormValid = computed(() => {
    return !!(state.domain && hasSelectedEntities.value);
});

const onSubmit = async () => {
    if (!isFormValid.value) return;

    isSubmitting.value = true;

    try {
        const body: any = {
            domain: state.domain,
            branding: state.branding,
            navigation: {
                show_default_nav: true,
                nav_style: 'horizontal',
                nav_position: 'top',
                show_search: true,
                show_user_menu: true,
                sticky: true,
                custom_links: []
            },
            page_config: state.page_config,
            features: state.features,
            // Multi-entity format
            entities: selectedEntities.value.map(entity => ({
                entity_type: entity.type,
                entity_id: entity.id,
                primary: entity.primary,
                show_in_nav: entity.show_in_nav
            }))
        };

        const response = await $fetch('/api/user/domains', {
            method: 'POST',
            body
        }) as { domain: any; message: string; isEveKillSubdomain?: boolean };

        // Show different success messages based on domain type
        const toast = useToast();
        if (response.isEveKillSubdomain) {
            toast.add({
                title: 'Success',
                description: response.message,
                color: 'green'
            });
        } else {
            toast.add({
                title: 'Success',
                description: response.message,
                color: 'blue'
            });
        }

        emit('created', response.domain);
    } catch (error: any) {
        console.error('Failed to create domain:', error);
        throw createError({
            statusCode: error.status || 500,
            statusMessage: error.data?.message || 'Failed to create domain'
        });
    } finally {
        isSubmitting.value = false;
    }
};
</script>
