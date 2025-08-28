<template>
    <div class="space-y-6">
        <!-- Navigation Style Settings -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {{ t('settings.domains.navigation.styleTitle', 'Navigation Style') }}
            </h3>

            <!-- Show Default Navigation -->
            <div class="flex items-center justify-between mb-4">
                <div>
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.navigation.showDefault', 'Show Default Navigation') }}
                    </label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ t('settings.domains.navigation.showDefaultDesc', 'Include standard EVE-KILL navigation
                        items') }}
                    </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="navigationConfig.show_default_nav" class="sr-only peer">
                    <div
                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                </label>
            </div>

            <!-- Navigation Position -->
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t('settings.domains.navigation.position', 'Navigation Position') }}
                </label>
                <select v-model="navigationConfig.nav_position"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                    <option value="top">{{ t('settings.domains.navigation.positions.top', 'Top') }}</option>
                    <option value="side">{{ t('settings.domains.navigation.positions.side', 'Side') }}</option>
                    <option value="bottom">{{ t('settings.domains.navigation.positions.bottom', 'Bottom') }}</option>
                </select>
            </div>

            <!-- Navigation Style -->
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t('settings.domains.navigation.style', 'Navigation Style') }}
                </label>
                <select v-model="navigationConfig.nav_style"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                    <option value="horizontal">{{ t('settings.domains.navigation.styles.horizontal', 'Horizontal') }}
                    </option>
                    <option value="sidebar">{{ t('settings.domains.navigation.styles.sidebar', 'Sidebar') }}</option>
                    <option value="dropdown">{{ t('settings.domains.navigation.styles.dropdown', 'Dropdown') }}</option>
                </select>
            </div>

            <!-- Additional Options -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.navigation.showSearch', 'Show Search') }}
                    </label>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="navigationConfig.show_search" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                        </div>
                    </label>
                </div>

                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.navigation.showUserMenu', 'Show User Menu') }}
                    </label>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="navigationConfig.show_user_menu" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                        </div>
                    </label>
                </div>

                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ t('settings.domains.navigation.sticky', 'Sticky Navigation') }}
                    </label>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" v-model="navigationConfig.sticky" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                        </div>
                    </label>
                </div>
            </div>
        </div>

        <!-- Custom Links -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ t('settings.domains.navigation.customLinks', 'Custom Navigation Links') }}
                </h3>
                <button @click="addCustomLink" :disabled="navigationConfig.custom_links.length >= 10"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    {{ t('settings.domains.navigation.addLink', 'Add Link') }}
                </button>
            </div>

            <!-- Custom Links List -->
            <div v-if="navigationConfig.custom_links.length === 0"
                class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1">
                    </path>
                </svg>
                <p>{{ t('settings.domains.navigation.noLinks', 'No custom links configured') }}</p>
                <p class="text-sm mt-1">{{ t('settings.domains.navigation.addFirstLink', 'Add your first custom
                    navigation link') }}</p>
            </div>

            <div v-else class="space-y-4">
                <div v-for="(link, index) in navigationConfig.custom_links" :key="index"
                    class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4">
                    <div class="flex items-center justify-between">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100">
                            {{ t('settings.domains.navigation.link', 'Link') }} #{{ index + 1 }}
                        </h4>
                        <button @click="removeCustomLink(index)"
                            class="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                                </path>
                            </svg>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Label -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('settings.domains.navigation.label', 'Label') }}
                            </label>
                            <input v-model="link.label" type="text"
                                :placeholder="t('settings.domains.navigation.labelPlaceholder', 'Enter link label')"
                                maxlength="50"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                        </div>

                        <!-- URL -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('settings.domains.navigation.url', 'URL') }}
                            </label>
                            <input v-model="link.url" type="text"
                                :placeholder="t('settings.domains.navigation.urlPlaceholder', 'Enter URL')"
                                maxlength="500"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                        </div>

                        <!-- Icon -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('settings.domains.navigation.icon', 'Icon (Optional)') }}
                            </label>
                            <input v-model="link.icon" type="text"
                                :placeholder="t('settings.domains.navigation.iconPlaceholder', 'e.g., i-heroicons-home')"
                                maxlength="100"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                        </div>

                        <!-- Position -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('settings.domains.navigation.order', 'Order') }}
                            </label>
                            <input v-model.number="link.position" type="number" min="1" max="100"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>

                    <!-- Link Options -->
                    <div class="flex items-center gap-6">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" v-model="link.external" :id="`external-${index}`"
                                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label :for="`external-${index}`" class="text-sm text-gray-700 dark:text-gray-300">
                                {{ t('settings.domains.navigation.external', 'External Link') }}
                            </label>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {{ t('settings.domains.navigation.accessLevel', 'Access Level') }}
                            </label>
                            <select v-model="link.access_level"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                                <option value="public">{{ t('settings.domains.navigation.access.public', 'Public') }}
                                </option>
                                <option value="members">{{ t('settings.domains.navigation.access.members', 'Members
                                    Only') }}</option>
                                <option value="admin">{{ t('settings.domains.navigation.access.admin', 'Admin Only') }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end">
            <button @click="$emit('save', navigationConfig)" :disabled="saving"
                class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="saving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                {{ t('common.save', 'Save') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
interface NavigationConfig {
    show_default_nav: boolean;
    nav_style: 'horizontal' | 'sidebar' | 'dropdown';
    nav_position: 'top' | 'side' | 'bottom';
    show_search: boolean;
    show_user_menu: boolean;
    sticky: boolean;
    custom_links: CustomLink[];
}

interface CustomLink {
    label: string;
    url: string;
    external: boolean;
    icon?: string;
    position: number;
    access_level: 'public' | 'members' | 'admin';
}

interface Props {
    navigation?: Partial<NavigationConfig>;
    saving?: boolean;
}

defineEmits<{
    save: [config: NavigationConfig];
}>();

const props = withDefaults(defineProps<Props>(), {
    navigation: () => ({}),
    saving: false,
});

const { t } = useI18n();

// Navigation configuration with defaults
const navigationConfig = ref<NavigationConfig>({
    show_default_nav: true,
    nav_style: 'horizontal',
    nav_position: 'top',
    show_search: true,
    show_user_menu: true,
    sticky: true,
    custom_links: [],
    ...props.navigation,
});

// Watch for prop changes
watch(() => props.navigation, (newNav) => {
    navigationConfig.value = {
        show_default_nav: true,
        nav_style: 'horizontal',
        nav_position: 'top',
        show_search: true,
        show_user_menu: true,
        sticky: true,
        custom_links: [],
        ...newNav,
    };
}, { deep: true });

// Custom link management
const addCustomLink = () => {
    const newPosition = Math.max(...navigationConfig.value.custom_links.map(l => l.position), 0) + 1;

    navigationConfig.value.custom_links.push({
        label: '',
        url: '',
        external: false,
        position: newPosition,
        access_level: 'public',
    });
};

const removeCustomLink = (index: number) => {
    navigationConfig.value.custom_links.splice(index, 1);
};
</script>
