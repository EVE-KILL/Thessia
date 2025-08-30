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

            <!-- Entities Display -->
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
            </div>

            <!-- Flexible Configuration Section -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="lucide:settings" class="w-5 h-5" />
                    Configuration
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Add custom key-value settings that can be used in your dashboard templates with <code
                        class="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">&#123;&#123; key &#125;&#125;</code>
                    syntax.
                </p>

                <!-- Existing Configuration Items -->
                <div v-if="Object.keys(state.configuration).length > 0" class="space-y-4 mb-6">
                    <div v-for="(value, key) in state.configuration" :key="key"
                        class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ key }}
                            </label>
                            <input v-if="typeof value === 'string'" v-model="state.configuration[key]" type="text"
                                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                                :disabled="isSubmitting" />
                            <input v-else-if="typeof value === 'number'" v-model.number="state.configuration[key]"
                                type="number"
                                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                                :disabled="isSubmitting" />
                            <label v-else-if="typeof value === 'boolean'" class="flex items-center">
                                <input v-model="state.configuration[key]" type="checkbox"
                                    class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 mr-2"
                                    :disabled="isSubmitting" />
                                <span class="text-sm">Enable {{ key }}</span>
                            </label>
                            <textarea v-else v-model="state.configuration[key]" rows="3"
                                class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm font-mono"
                                :disabled="isSubmitting" placeholder="JSON format" />
                        </div>
                        <button type="button" @click="removeConfigurationItem(key)"
                            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                            :disabled="isSubmitting">
                            <Icon name="lucide:trash-2" class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Add New Configuration Item -->
                <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div class="flex space-x-2 mb-4">
                        <input v-model="newConfigKey" type="text"
                            placeholder="Configuration key (e.g., primary_color, welcome_message)"
                            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                            :disabled="isSubmitting" />
                        <select v-model="newConfigType"
                            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                            :disabled="isSubmitting">
                            <option value="string">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">True/False</option>
                            <option value="object">JSON</option>
                        </select>
                        <button type="button" @click="addConfigurationItem" :disabled="!newConfigKey || isSubmitting"
                            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            <Icon name="lucide:plus" class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- Common Configuration Examples -->
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick add common settings:</p>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="example in configurationExamples" :key="example.key" type="button"
                                @click="addExampleConfiguration(example)"
                                :disabled="state.configuration && state.configuration.hasOwnProperty(example.key) || isSubmitting"
                                class="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ example.label }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Dashboard Template Configuration -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    Custom Dashboard Template
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create a custom dashboard layout using modular components with personalized styling.
                </p>

                <!-- Enable Custom Dashboard Toggle -->
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Custom Dashboard Template
                        </label>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Use a custom HTML template with modular dashboard components instead of the default layout
                        </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="state.dashboard_template.enabled" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                        </div>
                    </label>
                </div>
            </div>

            <!-- Navigation Settings -->
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

            <!-- Dashboard Template Configuration -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                    Dashboard Template
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create a custom dashboard layout using modular components with personalized styling.
                </p>

                <!-- Enable Custom Dashboard Toggle -->
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Custom Dashboard Template
                        </label>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Use a custom HTML template with modular dashboard components instead of the default layout
                        </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="state.dashboard_template.enabled" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                        </div>
                    </label>
                </div>

                <!-- Template Configuration (shown when enabled) -->
                <div v-if="state.dashboard_template.enabled" class="space-y-6">
                    <!-- Template Metadata -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="templateName"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Template Name (Optional)
                            </label>
                            <input id="templateName" v-model="state.dashboard_template.template_name" type="text"
                                placeholder="My Custom Dashboard" :disabled="isSubmitting" maxlength="100"
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                        </div>

                        <div>
                            <label for="templateDescription"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description (Optional)
                            </label>
                            <input id="templateDescription" v-model="state.dashboard_template.template_description"
                                type="text" placeholder="Custom layout for our organization" :disabled="isSubmitting"
                                maxlength="200"
                                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm" />
                        </div>
                    </div>

                    <!-- HTML Template -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label for="htmlTemplate"
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                HTML Template
                            </label>
                            <div class="flex items-center space-x-2">
                                <button type="button" @click="loadDefaultTemplate"
                                    class="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors">
                                    Load Default
                                </button>
                                <button type="button" @click="openTemplateEditor"
                                    class="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
                                    Advanced Editor
                                </button>
                            </div>
                        </div>
                        <textarea id="htmlTemplate" v-model="state.dashboard_template.html_template"
                            :disabled="isSubmitting" rows="8" placeholder="<!-- Use modular dashboard components with configuration variables: -->
<div class=&quot;grid grid-cols-2 gap-6&quot;>
  <DomainDashboardTotalKillsBox
    domain=&quot;{{ domain }}&quot;
    time-range=&quot;7d&quot;
    title=&quot;Total Kills&quot; />
  <DomainDashboardISKDestroyedBox
    domain=&quot;{{ domain }}&quot;
    time-range=&quot;7d&quot; />
</div>

<!-- Use configuration variables like: -->
<p>Join our Discord: {{ discord_invite }}</p>
<h1>{{ welcome_message }}</h1>"
                            class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm font-mono"></textarea>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Use modular dashboard components with HTML layout. Available components:
                            DomainDashboardTotalKillsBox, DomainDashboardISKDestroyedBox, DomainDashboardTopShipBox,
                            DomainDashboardActiveEntitiesBox. Use <strong>&#123;&#123; key &#125;&#125;</strong> syntax
                            for configuration variables.
                        </p>
                    </div>

                    <!-- Custom CSS -->
                    <div>
                        <label for="templateCss" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Custom CSS Styles
                        </label>
                        <textarea id="templateCss" v-model="state.dashboard_template.custom_css"
                            :disabled="isSubmitting" rows="6" placeholder="/* Custom styles for your dashboard components */
.domain-dashboard-total-kills-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #667eea;
}

/* Responsive design */
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
}" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm font-mono"></textarea>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Add custom CSS to style your dashboard components. Use component-specific classes for
                            targeted styling.
                        </p>
                    </div>

                    <!-- Template Actions -->
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div class="flex items-center space-x-4">
                            <button type="button" @click="previewTemplate"
                                :disabled="!state.dashboard_template.html_template"
                                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Preview Template
                            </button>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            Last updated: {{ state.dashboard_template.updated_at ?
                                formatDate(state.dashboard_template.updated_at) : 'Never' }}
                        </div>
                    </div>

                    <!-- Template Validation Results -->
                    <div v-if="templateValidation.errors.length > 0"
                        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Template Validation
                                    Errors</h3>
                                <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                                    <ul class="list-disc list-inside space-y-1">
                                        <li v-for="error in templateValidation.errors" :key="error">{{ error }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Help Text -->
                <div
                    class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mt-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">Custom Dashboard Templates
                            </h3>
                            <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                <p>Create custom dashboard layouts using modular components. When disabled, your domain
                                    uses the default dashboard layout.
                                    <a href="/docs/modular-dashboard" target="_blank"
                                        class="font-medium underline hover:no-underline">Learn more about dashboard
                                        templates</a>
                                </p>
                            </div>
                        </div>
                    </div>
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
import { useDomainCacheInvalidation } from '~/composables/useDomainCacheInvalidation';
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

// Cache invalidation for template updates
const { invalidateAllDomainCaches } = useDomainCacheInvalidation();

const isSubmitting = ref(false);
const campaignsLoading = ref(false);
const availableCampaigns = ref<any[]>([]);

// Configuration management
const newConfigKey = ref('');
const newConfigType = ref('string');

// Configuration examples
const configurationExamples = ref([
    { key: 'contact_email', value: 'recruit@example.com', type: 'string', label: 'Contact Email' },
    { key: 'discord_invite', value: 'https://discord.gg/yourserver', type: 'string', label: 'Discord Invite' },
    { key: 'recruitment_open', value: true, type: 'boolean', label: 'Open Recruitment' },
    { key: 'primary_timezone', value: 'UTC', type: 'string', label: 'Primary Timezone' },
    { key: 'min_skillpoints', value: 5000000, type: 'number', label: 'Min Skill Points' },
    { key: 'welcome_message', value: 'Welcome to our killboard!', type: 'string', label: 'Welcome Message' }
]);

// Dashboard template functionality
const templateValidation = ref({ errors: [] as string[] });

// PHASE 2: Enhanced state for multi-entity support
const state = reactive({
    domain: props.domain.domain || '',
    configuration: props.domain.configuration || {},
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
    },
    dashboard_template: {
        enabled: props.domain.dashboard_template?.enabled ?? false,
        html_template: props.domain.dashboard_template?.html_template || '',
        custom_css: props.domain.dashboard_template?.custom_css || '',
        template_name: props.domain.dashboard_template?.template_name || '',
        template_description: props.domain.dashboard_template?.template_description || '',
        template_version: props.domain.dashboard_template?.template_version || '1.0.0',
        created_at: props.domain.dashboard_template?.created_at || new Date().toISOString(),
        updated_at: props.domain.dashboard_template?.updated_at || new Date().toISOString()
    }
});

// Multi-entity mode variables
const currentEntities = ref<any[]>([]);
const entitySearchQuery = ref('');

// Initialize data
onMounted(async () => {
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

// Configuration management functions
const addConfigurationItem = () => {
    if (!newConfigKey.value.trim()) return;

    if (!state.configuration) {
        state.configuration = {};
    }

    let defaultValue: any = '';
    switch (newConfigType.value) {
        case 'number':
            defaultValue = 0;
            break;
        case 'boolean':
            defaultValue = false;
            break;
        case 'object':
            defaultValue = {};
            break;
        default:
            defaultValue = '';
    }

    state.configuration[newConfigKey.value] = defaultValue;
    newConfigKey.value = '';
    newConfigType.value = 'string';
};

const removeConfigurationItem = (key: string | number) => {
    delete state.configuration[String(key)];
};

const addExampleConfiguration = (example: any) => {
    if (!state.configuration) {
        state.configuration = {};
    }
    if (state.configuration.hasOwnProperty(example.key)) return;
    state.configuration[example.key] = example.value;
};

// Dashboard template management functions
const loadDefaultTemplate = () => {
    state.dashboard_template.html_template = `<!-- Welcome Section with Configuration Variables -->
<div class="mb-8 text-center">
  <h1 class="text-3xl font-bold mb-2">{{ welcome_message }}</h1>
  <p class="text-gray-600">Join our community: <a href="{{ discord_invite }}" class="text-blue-600 hover:underline">Discord</a></p>
</div>

<!-- Dashboard Statistics -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <DomainDashboardTotalKillsBox
    domain="{{ domain }}"
    time-range="7d"
    title="Total Kills" />
  <DomainDashboardISKDestroyedBox
    domain="{{ domain }}"
    time-range="7d"
    title="ISK Destroyed" />
  <DomainDashboardTopShipBox
    domain="{{ domain }}"
    time-range="7d"
    limit="1" />
  <DomainDashboardActiveEntitiesBox
    domain="{{ domain }}"
    time-range="7d" />
</div>`;

    state.dashboard_template.custom_css = `.domain-dashboard-stats-container {
  margin-bottom: 2rem;
}

.domain-dashboard-total-kills-box,
.domain-dashboard-isk-destroyed-box,
.domain-dashboard-top-ship-box,
.domain-dashboard-active-entities-box {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.domain-dashboard-total-kills-box:hover,
.domain-dashboard-isk-destroyed-box:hover,
.domain-dashboard-top-ship-box:hover,
.domain-dashboard-active-entities-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}`;

    state.dashboard_template.updated_at = new Date().toISOString();
};

const validateTemplate = async () => {
    if (!state.dashboard_template.html_template) {
        templateValidation.value = { errors: ['HTML template is required'] };
        return;
    }

    try {
        // Simple validation - just check for basic HTML structure
        templateValidation.value = { errors: [] };
    } catch (error) {
        console.error('Template validation error:', error);
        templateValidation.value = { errors: ['Failed to validate template'] };
    }
};

const previewTemplate = () => {
    // Store template data in sessionStorage to avoid long URLs
    const templateData = {
        domain: state.domain,
        preview: true,
        template: state.dashboard_template.html_template,
        css: state.dashboard_template.custom_css || '',
        name: state.dashboard_template.template_name || '',
        description: state.dashboard_template.template_description || ''
    };

    sessionStorage.setItem('dashboard_template_preview', JSON.stringify(templateData));
    window.open(`/domain/dashboard/customizer?domain=${encodeURIComponent(state.domain)}&from=preview`, '_blank');
};

const openTemplateEditor = () => {
    // Store template data in sessionStorage to avoid long URLs
    const templateData = {
        domain: state.domain,
        template: state.dashboard_template.html_template,
        css: state.dashboard_template.custom_css || '',
        name: state.dashboard_template.template_name || '',
        description: state.dashboard_template.template_description || ''
    };

    sessionStorage.setItem('dashboard_template_edit', JSON.stringify(templateData));
    window.open(`/domain/dashboard/customizer?domain=${encodeURIComponent(state.domain)}&from=editor`, '_blank');
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

const onSubmit = async () => {
    if (!isFormValid.value) return;

    isSubmitting.value = true;

    try {
        // Update dashboard template timestamps if enabled
        if (state.dashboard_template.enabled) {
            state.dashboard_template.updated_at = new Date().toISOString();

            // Validate template before submitting if it has content
            if (state.dashboard_template.html_template) {
                await validateTemplate();
                if (templateValidation.value.errors.length > 0) {
                    throw new Error('Template validation failed. Please fix the errors before saving.');
                }
            }
        }

        const body: any = {
            domain: state.domain,
            configuration: state.configuration,
            branding: state.branding,
            navigation: state.navigation,
            page_config: state.page_config,
            features: state.features,
            dashboard_template: state.dashboard_template
        };

        // Multi-entity mode - entities are managed separately via ManageEntitiesForm

        const response = await $fetch(`/api/user/domains/${props.domain.domain_id}`, {
            method: 'PATCH',
            body
        }) as { domain: any };

        // Force refresh domain settings from the server to ensure we have the latest data
        // This ensures any server-side transformations or computed fields are reflected
        if (response.domain) {
            await domainStore.loadDomainSettings(state.domain, true);

            // Invalidate all domain caches to ensure template changes are reflected
            await invalidateAllDomainCaches(state.domain);
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
