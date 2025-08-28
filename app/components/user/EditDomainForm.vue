<template>
    <div class="space-y-6">
        <form @submit.prevent="onSubmit" class="space-y-4">
            <div>
                <label for="domain" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('settings.domains.form.domain') }} *
                </label>
                <input id="domain" v-model="state.domain" type="text"
                    :placeholder="t('settings.domains.form.domainPlaceholder')" :disabled="isSubmitting"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    required />
            </div>

            <!-- PHASE 2: Multi-Entity Display -->
            <div>
                <!-- Multi-Entity Display (Read-only in edit mode) -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {{ t('settings.domains.form.entities') }} *
                    </label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Use the "Manage Entities" option to modify entities for this domain.
                    </p>

                    <!-- Current Entities Display -->
                    <div v-if="currentEntities.length > 0" class="space-y-2">
                        <div v-for="entity in currentEntities"
                            :key="`${entity._config?.entity_type || entity.type}-${entity._config?.entity_id || entity.id}`"
                            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <Image :type="entity._config?.entity_type || entity.type"
                                    :id="entity._config?.entity_id || entity.id" :size="32" />
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-gray-100">
                                        {{ getEntityDisplayName(entity) }}
                                    </div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                        {{ entity._config?.entity_type || entity.type }}
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 ml-4">
                                    <span v-if="entity._config?.primary || entity.primary"
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Primary
                                    </span>
                                    <span v-if="entity._config?.show_in_nav || entity.show_in_nav"
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        In Nav
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Entity Limit Info -->
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {{ currentEntities.length }} / 10 entities configured
                    </div>
                </div>
            </div>

            <!-- PHASE 2: Enhanced Branding Section -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    {{ t('settings.domains.form.customBranding') }}
                </h3>

                <!-- Basic Branding -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label for="primaryColor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.form.primaryColor') }}
                        </label>
                        <input id="primaryColor" v-model="state.branding.primary_color" type="color"
                            :disabled="isSubmitting"
                            class="mt-1 block w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700" />
                    </div>

                    <div>
                        <label for="themeMode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Theme Mode
                        </label>
                        <select id="themeMode" v-model="state.branding.theme_mode" :disabled="isSubmitting"
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm">
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
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
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
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
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
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
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
                            class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
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
                                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
                                </div>

                                <div>
                                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        URL
                                    </label>
                                    <input v-model="button.url" type="url" maxlength="500"
                                        placeholder="https://discord.gg/..."
                                        class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
                                </div>
                            </div>

                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" v-model="button.primary"
                                            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                        <span class="text-xs text-gray-700 dark:text-gray-300">Primary Button</span>
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" v-model="button.external"
                                            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                        <span class="text-xs text-gray-700 dark:text-gray-300">External Link</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Banner Image -->
                <div class="mb-4">
                    <label for="bannerImageUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Banner Image URL
                    </label>
                    <input id="bannerImageUrl" v-model="state.branding.banner_image_url" type="url"
                        placeholder="https://example.com/banner.jpg" :disabled="isSubmitting"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                </div>

                <!-- Custom CSS -->
                <div class="mb-4">
                    <label for="customCss" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.form.customCss') }}
                    </label>
                    <textarea id="customCss" v-model="state.branding.custom_css"
                        :placeholder="t('settings.domains.form.customCssPlaceholder')" :disabled="isSubmitting" rows="4"
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"></textarea>
                </div>
            </div>

            <!-- PHASE 2: Features Configuration -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    Features Configuration
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Configure which features and sections are displayed on your domain.
                </p>

                <div class="space-y-4">
                    <!-- Show Hero Section -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Hero Section
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display the main hero section with welcome message and entity showcase
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_hero" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Statistics Cards -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Statistics Cards
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display the statistics highlight cards (kills, ISK, ships, entities)
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_stats" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Tracking Overview -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Tracking Overview
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display the entity tracking overview section with entity list
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_tracking_overview" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Campaigns -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Campaign Section
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display campaign information and featured campaigns
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_campaigns" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Most Valuable Kills -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Most Valuable Kills
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display the most valuable kills section with high-value killmails
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_most_valuable" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Top Boxes -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Top Boxes
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display the top killers, corporations, and alliances boxes
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_top_boxes" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Show Ship Destruction Analysis -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Ship Destruction Analysis
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display detailed ship destruction analysis and patterns
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.features.show_ship_analysis" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                            </div>
                        </label>
                    </div>

                    <!-- Featured Campaign Selector -->
                    <div v-if="state.features.show_campaigns"
                        class="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                        <div class="mb-3">
                            <label for="featuredCampaign"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Featured Campaign (Optional)
                            </label>
                            <select id="featuredCampaign" v-model="state.features.featured_campaign_id"
                                :disabled="isSubmitting || campaignsLoading"
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm">
                                <option value="">No featured campaign</option>
                                <option v-if="campaignsLoading" disabled>Loading campaigns...</option>
                                <option v-for="campaign in availableCampaigns" :key="campaign.campaign_id"
                                    :value="campaign.campaign_id">
                                    {{ campaign.name }} ({{ campaign.status }})
                                </option>
                                <option v-if="!campaignsLoading && availableCampaigns.length === 0" disabled>No
                                    campaigns available</option>
                            </select>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Select a campaign to feature prominently on your domain
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PHASE 2: Navigation Configuration -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    Navigation Settings
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Configure how navigation appears on your custom domain.
                </p>

                <div class="space-y-4">
                    <!-- Show Default Navigation -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Default Navigation
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Include standard EVE-KILL navigation items
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.navigation.show_default_nav" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after-border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                            </div>
                        </label>
                    </div>

                    <!-- Individual Navigation Icon Controls -->
                    <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Navigation Icon Visibility
                        </h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Control which navigation items are displayed. Home, User Menu, and Information Menu are
                            always available but can be hidden.
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Home Button -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Home</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Main homepage link</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_home" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Kills -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Kills</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Killmail navigation and filters
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_kills" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Wars -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Wars</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">War declarations and history</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_wars" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Battles -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Battles</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Battle reports and analysis</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_battles" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Campaigns -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label
                                        class="text-sm font-medium text-gray-700 dark:text-gray-300">Campaigns</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Campaign tracking and management
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_campaigns"
                                        class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Stats -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label
                                        class="text-sm font-medium text-gray-700 dark:text-gray-300">Statistics</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Statistical analysis and charts
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_stats" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Tools -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tools</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">EVE tools and utilities</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_tools" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Search -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Global search functionality</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_search" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Upload -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Upload</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Killmail upload functionality
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_upload" class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Theme Toggle -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme
                                        Toggle</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Light/dark theme switcher</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_theme_toggle"
                                        class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Background Switcher -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Background
                                        Switcher</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Background image selector</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_background_switcher"
                                        class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- Information Menu -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Information
                                        Menu</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">FAQ, status, about, etc.</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_info_menu"
                                        class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>

                            <!-- User Menu -->
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">User
                                        Menu</label>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Login/profile menu</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="state.navigation.show_user_menu"
                                        class="sr-only peer">
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Sticky Navigation -->
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Sticky Navigation
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Keep navigation bar fixed at top when scrolling
                            </p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="state.navigation.sticky" class="sr-only peer">
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                            </div>
                        </label>
                    </div>

                    <!-- Custom Links Section -->
                    <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                                Custom Navigation Links
                            </h4>
                            <button type="button" @click="addCustomLink"
                                :disabled="state.navigation.custom_links.length >= 10"
                                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4v16m8-8H4"></path>
                                </svg>
                                Add Link
                            </button>
                        </div>

                        <div v-if="state.navigation.custom_links.length === 0"
                            class="text-center py-4 text-gray-500 dark:text-gray-400">
                            <p class="text-sm">No custom links configured</p>
                        </div>

                        <div v-else class="space-y-3">
                            <div v-for="(link, index) in state.navigation.custom_links" :key="index"
                                class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Link #{{ index + 1 }}
                                    </span>
                                    <button type="button" @click="removeCustomLink(index)"
                                        class="inline-flex items-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                                            </path>
                                        </svg>
                                    </button>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Label
                                        </label>
                                        <input v-model="link.label" type="text" maxlength="50" placeholder="Link text"
                                            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                                    </div>

                                    <div>
                                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            URL
                                        </label>
                                        <input v-model="link.url" type="text" maxlength="500" placeholder="https://..."
                                            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                                    </div>

                                    <div>
                                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Position
                                        </label>
                                        <input v-model.number="link.position" type="number" min="1" max="100"
                                            class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                                    </div>
                                </div>

                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" v-model="link.external"
                                                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                            <span class="text-xs text-gray-700 dark:text-gray-300">External Link</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Access
                                        </label>
                                        <select v-model="link.access_level"
                                            class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                                            <option value="public">Public</option>
                                            <option value="members">Members</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
                    {{ isSubmitting ? t('settings.domains.form.updating') : t('settings.domains.form.update') }}
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
import { useDomainSettingsStore } from '~/stores/domainSettings';

interface CustomLink {
    label: string;
    url: string;
    external: boolean;
    icon?: string;
    position: number;
    access_level: 'public' | 'members' | 'admin';
}

interface Props {
    domain: any;
}

interface Emits {
    (e: 'updated', domain: any): void;
    (e: 'cancel'): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();
const { t } = useI18n();

// Use the domain settings store for state management
const domainStore = useDomainSettingsStore()

const isSubmitting = ref(false);
const campaignsLoading = ref(false);
const availableCampaigns = ref<any[]>([]);

// PHASE 2: Enhanced state for multi-entity support
const state = reactive({
    domain: props.domain.domain || '',
    branding: {
        primary_color: props.domain.branding?.primary_color || '#3B82F6',
        theme_mode: props.domain.branding?.theme_mode || 'auto',
        banner_image_url: props.domain.branding?.banner_image_url || '',
        custom_css: props.domain.branding?.custom_css || '',
        header_title: props.domain.branding?.header_title || '',
        welcome_message: props.domain.branding?.welcome_message || '',
        secondary_message: props.domain.branding?.secondary_message || '',
        cta_buttons: props.domain.branding?.cta_buttons || []
    },
    navigation: {
        show_default_nav: props.domain.navigation?.show_default_nav ?? true,
        show_home: props.domain.navigation?.show_home ?? true,
        show_kills: props.domain.navigation?.show_kills ?? true,
        show_wars: props.domain.navigation?.show_wars ?? true,
        show_battles: props.domain.navigation?.show_battles ?? true,
        show_campaigns: props.domain.navigation?.show_campaigns ?? true,
        show_stats: props.domain.navigation?.show_stats ?? true,
        show_tools: props.domain.navigation?.show_tools ?? true,
        show_search: props.domain.navigation?.show_search ?? true,
        show_upload: props.domain.navigation?.show_upload ?? true,
        show_theme_toggle: props.domain.navigation?.show_theme_toggle ?? true,
        show_background_switcher: props.domain.navigation?.show_background_switcher ?? true,
        show_info_menu: props.domain.navigation?.show_info_menu ?? true,
        show_user_menu: props.domain.navigation?.show_user_menu ?? true,
        sticky: props.domain.navigation?.sticky ?? true,
        custom_links: props.domain.navigation?.custom_links || []
    },
    page_config: {
        layout: props.domain.page_config?.layout || 'default',
        components: {
            recent_kills: props.domain.page_config?.components?.recent_kills ?? true,
            top_pilots: props.domain.page_config?.components?.top_pilots ?? true,
            campaigns: props.domain.page_config?.components?.campaigns ?? true,
            battles: props.domain.page_config?.components?.battles ?? true,
            stats_overview: props.domain.page_config?.components?.stats_overview ?? true,
            search_widget: props.domain.page_config?.components?.search_widget ?? true,
            news_feed: props.domain.page_config?.components?.news_feed ?? false,
            social_links: props.domain.page_config?.components?.social_links ?? false
        }
    },
    features: {
        show_hero: props.domain.features?.show_hero ?? true,
        show_stats: props.domain.features?.show_stats ?? true,
        show_tracking_overview: props.domain.features?.show_tracking_overview ?? true,
        show_campaigns: props.domain.features?.show_campaigns ?? true,
        show_most_valuable: props.domain.features?.show_most_valuable ?? true,
        show_top_boxes: props.domain.features?.show_top_boxes ?? true,
        show_ship_analysis: props.domain.features?.show_ship_analysis ?? true,
        featured_campaign_id: props.domain.features?.featured_campaign_id || ''
    }
});

// Multi-entity mode variables
const currentEntities = ref<any[]>([]);
const entitySearchQuery = ref('');

// Initialize data
onMounted(async () => {
    console.log('🔍 Frontend Debug - Initial props.domain:', JSON.stringify(props.domain, null, 2));
    console.log('🔍 Frontend Debug - Initial state.navigation:', JSON.stringify(state.navigation, null, 2));
    console.log('🔍 Frontend Debug - props.domain.navigation:', JSON.stringify(props.domain.navigation, null, 2));

    // Load current entities
    if (props.domain.entities_info) {
        currentEntities.value = props.domain.entities_info;
    } else if (props.domain.entity_info) {
        // Convert single entity to multi-entity format
        currentEntities.value = [{
            ...props.domain.entity_info,
            _config: {
                entity_type: props.domain.entity_type,
                entity_id: props.domain.entity_id,
                primary: true,
                show_in_nav: true
            }
        }];
    }

    // Load available campaigns for this domain
    await loadAvailableCampaigns();
});

// Helper functions
const formatSearchResultDisplayName = (result: any) => {
    let displayName = result.name;
    if (result.ticker && (result.type === 'alliance' || result.type === 'corporation')) {
        displayName = `${result.name} [${result.ticker}]`;
    }
    return displayName;
};

const getEntityDisplayName = (entity: any) => {
    let displayName = entity.name || 'Unknown Entity';
    if (entity.ticker && ((entity._config?.entity_type || entity.type) === 'alliance' || (entity._config?.entity_type || entity.type) === 'corporation')) {
        displayName = `${displayName} [${entity.ticker}]`;
    }
    return displayName;
};

// Computed properties
const hasSelectedEntities = computed(() => {
    return currentEntities.value.length > 0;
});

const isFormValid = computed(() => {
    return !!(state.domain && hasSelectedEntities.value);
});

// Custom link management functions
const addCustomLink = () => {
    const newPosition = Math.max(...state.navigation.custom_links.map((l: CustomLink) => l.position), 0) + 1;

    state.navigation.custom_links.push({
        label: '',
        url: '',
        external: false,
        position: newPosition,
        access_level: 'public'
    });
};

const removeCustomLink = (index: number) => {
    state.navigation.custom_links.splice(index, 1);
};

// CTA button management functions
const addCTAButton = () => {
    state.branding.cta_buttons.push({
        text: '',
        url: '',
        primary: false,
        external: true
    });
};

const removeCTAButton = (index: number) => {
    state.branding.cta_buttons.splice(index, 1);
};

const onSubmit = async () => {
    if (!isFormValid.value) return;

    isSubmitting.value = true;

    try {
        const body: any = {
            domain: state.domain,
            branding: state.branding,
            navigation: state.navigation,
            page_config: state.page_config,
            features: state.features
        };

        console.log('🔍 Frontend Debug - Sending to API:', JSON.stringify(body, null, 2));
        console.log('🔍 Frontend Debug - Current state.navigation:', JSON.stringify(state.navigation, null, 2));

        // Multi-entity mode - entities are managed separately via ManageEntitiesForm

        const response = await $fetch(`/api/user/domains/${props.domain.domain_id}`, {
            method: 'PATCH',
            body
        }) as { domain: any };

        console.log('🔍 Frontend Debug - API Response:', JSON.stringify(response, null, 2));

        // Update the domain store with the new settings
        if (response.domain) {
            domainStore.initializeFromData(response.domain);
        }

        emit('updated', response.domain);
    } catch (error: any) {
        console.error('Failed to update domain:', error);
        throw createError({
            statusCode: error.status || 500,
            statusMessage: error.data?.message || 'Failed to update domain'
        });
    } finally {
        isSubmitting.value = false;
    }
};

// Load campaigns available for this domain
const loadAvailableCampaigns = async () => {
    if (!props.domain.domain) return;

    campaignsLoading.value = true;
    try {
        const response = await $fetch(`/api/domain/${props.domain.domain}/campaigns`, {
            query: { limit: 50 } // Get up to 50 campaigns
        });

        if (response.campaigns) {
            // Only show active and upcoming campaigns for featuring
            availableCampaigns.value = response.campaigns.filter((campaign: any) =>
                campaign.status === 'active' || campaign.status === 'upcoming'
            );
        }
    } catch (error) {
        console.error('Failed to load campaigns:', error);
        // Don't show error to user, just leave the dropdown empty
    } finally {
        campaignsLoading.value = false;
    }
};
</script>
