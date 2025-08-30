<template>
    <div class="dashboard-customizer-page">

        <Head>
            <Title>Dashboard Customizer - {{ domain || 'Loading...' }}</Title>
            <Meta name="description" :content="`Customize your ${domain || 'domain'} dashboard layout and styling`" />
        </Head>

        <!-- Loading State -->
        <div v-if="!domainValidated" class="min-h-screen flex items-center justify-center">
            <div class="text-center">
                <div
                    class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4">
                </div>
                <p class="text-gray-400">Loading dashboard customizer...</p>
            </div>
        </div>

        <!-- Main Content (only show when domain is validated) -->
        <div v-else>
            <!-- Page Header -->
            <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-3xl font-bold text-white">Dashboard Customizer</h1>
                            <p class="mt-2 text-gray-400">
                                Create a custom dashboard layout for <span class="text-blue-400 font-medium">{{ domain
                                }}</span>
                            </p>
                        </div>
                        <div class="flex items-center space-x-4">

                            <button @click="showPresets = true"
                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                                Template Presets
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Quick Actions -->
                <div class="mb-8 flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <label class="text-sm font-medium text-gray-300">Mode:</label>
                        <select v-model="editorMode"
                            class="bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2">
                            <option value="visual">Visual Editor</option>
                            <option value="code">Code Editor</option>
                        </select>
                    </div>
                </div>

                <!-- Editor Content -->
                <div class="dashboard-editor-container">
                    <!-- Visual Editor Mode -->
                    <div v-if="editorMode === 'visual'" class="visual-editor">
                        <div class="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                            <h3 class="text-white font-semibold mb-4">Visual Dashboard Builder</h3>
                            <p class="text-gray-400 mb-4">Drag and drop components to build your dashboard layout.</p>

                            <!-- Component Palette -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div v-for="component in availableComponents" :key="component.name" :draggable="true"
                                    @dragstart="onDragStart(component, $event)"
                                    class="bg-gray-700/50 border border-gray-600 rounded-lg p-4 cursor-move hover:bg-gray-700 transition-colors">
                                    <div class="text-center">
                                        <div
                                            class="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <component :is="component.icon" class="w-4 h-4 text-blue-400" />
                                        </div>
                                        <h4 class="text-sm font-medium text-white">{{ component.title }}</h4>
                                        <p class="text-xs text-gray-400 mt-1">{{ component.description }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Drop Zone -->
                            <div @drop="onDrop" @dragover.prevent @dragenter.prevent
                                class="min-h-64 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center"
                                :class="{ 'border-blue-500 bg-blue-500/10': isDragOver }">
                                <div v-if="droppedComponents.length === 0" class="text-gray-400">
                                    <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <p>Drop components here to build your dashboard</p>
                                </div>

                                <!-- Rendered Components -->
                                <div v-else class="space-y-4">
                                    <div v-for="(comp, index) in droppedComponents" :key="`dropped-${index}`"
                                        class="relative bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                                        <button @click="removeComponent(index)"
                                            class="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        <h5 class="text-white font-medium">{{ comp.title }}</h5>
                                        <p class="text-gray-400 text-sm mt-1">{{ comp.description }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Generated Template Code for Visual Editor -->
                        <div v-if="currentTemplate" class="mt-8">
                            <div class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                                <div class="p-4 border-b border-gray-700/50">
                                    <h3 class="text-white font-semibold">Generated Template Code</h3>
                                </div>
                                <div class="p-4">
                                    <pre
                                        class="text-sm text-gray-300 bg-gray-900/50 rounded-lg p-4 overflow-x-auto"><code>{{ currentTemplate }}</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Code Editor Mode with 3-Section Layout -->
                    <div v-else class="code-editor-layout">
                        <!-- Top Section: Template Editor | Mobile Preview -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <!-- Template Editor - Top Left (Editor Only) -->
                            <div class="template-editor-panel">
                                <div
                                    class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden flex flex-col h-full min-h-[700px]">
                                    <div class="p-4 border-b border-gray-700/50 flex-shrink-0">
                                        <div class="flex items-center justify-between">
                                            <h3 class="text-white font-semibold">Template Editor</h3>
                                            <button @click="saveCurrentTemplate"
                                                :disabled="!currentTemplate || templateSaving"
                                                class="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors">
                                                {{ templateSaving ? 'Saving...' : 'Save' }}
                                            </button>
                                        </div>
                                    </div>
                                    <div class="flex-1 p-4 flex flex-col space-y-4 overflow-hidden">
                                        <!-- HTML Template Editor -->
                                        <div class="flex-1 flex flex-col">
                                            <label class="block text-sm font-medium text-gray-300 mb-2">HTML
                                                Template</label>
                                            <textarea v-model="currentTemplate" @input="onTemplateEdit"
                                                class="flex-1 w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono text-gray-100 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                                placeholder="Enter your dashboard template HTML..." spellcheck="false" />
                                        </div>
                                        <!-- CSS Editor -->
                                        <div class="flex-1 flex flex-col">
                                            <label class="block text-sm font-medium text-gray-300 mb-2">Custom
                                                CSS</label>
                                            <textarea v-model="currentCss" @input="onCssEdit"
                                                class="flex-1 w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono text-gray-100 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                                placeholder="Enter custom CSS styles..." spellcheck="false" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Mobile Preview - Top Right -->
                            <div class="mobile-preview-panel">
                                <div
                                    class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden flex flex-col h-full min-h-[750px]">
                                    <div class="p-4 border-b border-gray-700/50 flex-shrink-0">
                                        <h3 class="text-white font-semibold">Mobile Preview</h3>
                                        <p class="text-xs text-gray-400 mt-1">iPhone 12 Pro (375×667)</p>
                                    </div>
                                    <div class="flex-1 p-4 overflow-hidden flex items-start justify-center pt-8">
                                        <!-- Mobile Device Frame -->
                                        <div class="mobile-device-frame">
                                            <!-- Device Outer Shell -->
                                            <div class="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl border-2 border-gray-700">
                                                <!-- Notch/Dynamic Island -->
                                                <div class="absolute top-4 left-1/2 transform -translate-x-1/2 w-20 h-7 bg-black rounded-full z-10 border border-gray-800"></div>
                                                
                                                <!-- Screen Container -->
                                                <div class="relative bg-black rounded-[2rem] overflow-hidden" style="width: 375px; height: 667px;">
                                                    <!-- Status Bar Overlay -->
                                                    <div class="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/40 to-transparent z-20 pointer-events-none">
                                                        <div class="flex items-center justify-between px-6 pt-4 text-white text-sm status-bar">
                                                            <span class="font-semibold">9:41</span>
                                                            <div class="flex items-center space-x-1">
                                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                                                                </svg>
                                                                <svg class="w-5 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M17 4h1a1 1 0 011 1v10a1 1 0 01-1 1h-1a1 1 0 01-1-1V5a1 1 0 011-1zM2 6h14v8H2V6z"/>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- Viewport Content -->
                                                    <div class="w-full h-full overflow-auto mobile-viewport-content">
                                                        <div class="min-h-full" style="font-size: 14px; line-height: 1.4;">
                                                            <DomainDashboardRenderer 
                                                                :domain="domain" 
                                                                :time-range="'7d'"
                                                                :custom-template="currentTemplate" 
                                                                :custom-css="mobileOptimizedCss"
                                                                :fallback-to-default="false" 
                                                                :client-only="true" />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <!-- Home Indicator -->
                                                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Section: Full Width Live Preview -->
                        <div class="live-preview-panel">
                            <div
                                class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden flex flex-col min-h-[600px]">
                                <div class="p-4 border-b border-gray-700/50 flex-shrink-0">
                                    <h3 class="text-white font-semibold">Live Preview (Desktop)</h3>
                                </div>
                                <div class="flex-1 overflow-auto">
                                    <div class="preview-container h-full">
                                        <DomainDashboardRenderer :domain="domain" :time-range="'7d'"
                                            :custom-template="currentTemplate" :custom-css="currentCss"
                                            :fallback-to-default="false" :client-only="true" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Template Presets Modal -->
            <div v-if="showPresets" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold text-white">Template Presets</h3>
                        <button @click="showPresets = false" class="text-gray-400 hover:text-white transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div v-for="preset in templatePresets" :key="preset.id" @click="applyPreset(preset)"
                            class="bg-gray-700/50 border border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors">
                            <h4 class="text-white font-medium mb-2">{{ preset.title }}</h4>
                            <p class="text-gray-400 text-sm mb-3">{{ preset.description }}</p>
                            <div class="text-xs text-blue-400">Click to apply</div>
                        </div>
                    </div>
                </div>
            </div>
        </div> <!-- Close the conditional v-else div -->
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch, computed } from 'vue';
import DomainDashboardRenderer from '~/components/domain/dashboard/DomainDashboardRenderer.vue';
import { useDomainContext } from '~/composables/useDomainContext';
import { useDomainDashboardTemplate } from '~/composables/useDomainDashboardTemplate';

// Page setup
definePageMeta({
    layout: 'default',
    middleware: 'auth',
    ssr: false // Disable SSR for this page to avoid validation issues
});

// Route params and query
const route = useRoute();
const router = useRouter();

const domain = ref('');

// Initialize domain from route params - use regular ref instead of computed to avoid readonly issues
const initializeDomain = () => {
    if (route.params.domain) {
        domain.value = route.params.domain as string;
    } else {
        domain.value = (route.query.domain as string) || '';
    }
};

// Watch route changes to update domain
watch(() => [route.params.domain, route.query.domain], () => {
    initializeDomain();
}, { immediate: true });

// More resilient domain validation
const domainValidated = ref(false);

onMounted(() => {
    // Validate domain on client-side only
    if (!domain.value) {
        navigateTo('/');
        return;
    }

    domainValidated.value = true;
});

// Domain context and template state
const { domainContext, dashboardTemplate } = useDomainContext();

// Use Nuxt's useState for template state (shared with DomainDashboardRenderer)
const domainTemplate = useState<string>('domain-template', () => '');
const domainCss = useState<string>('domain-css', () => '');
const templateLoaded = useState<boolean>('template-loaded', () => false);

// Editor state
const editorMode = ref<'visual' | 'code'>('code');
const showPresets = ref(false);
const currentTemplate = ref('');
const currentCss = ref('');

// Mobile-optimized CSS for mobile preview
const mobileOptimizedCss = computed(() => {
    const baseCss = currentCss.value || '';
    const mobileEnhancements = `
        /* Mobile Preview Enhancements */
        @media screen and (max-width: 375px) {
            .dashboard-container {
                padding: 0.75rem !important;
                font-size: 14px !important;
                line-height: 1.4 !important;
            }
            
            /* Make metrics grid single column on mobile */
            .dashboard-container .metrics-grid {
                grid-template-columns: 1fr !important;
                gap: 0.75rem !important;
                margin-bottom: 1.5rem !important;
            }
            
            /* Reduce metric box heights for mobile */
            .dashboard-container .metrics-grid-item {
                min-height: 120px !important;
            }
            
            .dashboard-container .metric-box {
                min-height: 120px !important;
                padding: 0.75rem !important;
            }
            
            /* Compact sections */
            .dashboard-section {
                margin-bottom: 1.5rem !important;
            }
            
            /* Force bottom grid to single column */
            .bottom-grid {
                grid-template-columns: 1fr !important;
                gap: 1rem !important;
            }
            
            /* Smaller text sizes */
            h1, .text-3xl { font-size: 1.5rem !important; }
            h2, .text-2xl { font-size: 1.25rem !important; }
            h3, .text-xl { font-size: 1.125rem !important; }
            
            /* Compact padding */
            .p-6 { padding: 1rem !important; }
            .p-4 { padding: 0.75rem !important; }
            .px-6 { padding-left: 1rem !important; padding-right: 1rem !important; }
            .py-6 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
            
            /* Hide some content that doesn't work well on mobile */
            .desktop-only { display: none !important; }
        }
        
        /* Always apply mobile viewport constraints in mobile preview */
        .mobile-viewport-content {
            max-width: 375px !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
        }
        
        .mobile-viewport-content .dashboard-container {
            padding: 0.75rem !important;
        }
        
        .mobile-viewport-content .metrics-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
        }
        
        .mobile-viewport-content .bottom-grid {
            grid-template-columns: 1fr !important;
        }
    `;
    
    return baseCss + mobileEnhancements;
});

const isDragOver = ref(false);
const droppedComponents = ref<any[]>([]);

// Track whether we loaded from sessionStorage (preview/editor) or API
const loadedFromSessionStorage = ref(false);

// Watch currentTemplate changes for any needed side effects
watch(currentTemplate, (newValue, oldValue) => {
    // Trigger live preview updates
});

// Watch for real-time preview updates
watch([currentTemplate, currentCss], ([newTemplate, newCss]) => {
    // Auto-update previews when template or CSS changes
    // This enables live preview functionality

    // Also update the shared useState for consistency
    domainTemplate.value = newTemplate;
    domainCss.value = newCss;
}, { deep: true });

// Watch domain context changes
watch(dashboardTemplate, (newTemplate) => {
    if (newTemplate && !templateLoaded.value) {
        console.log('Dashboard template updated in domain context, reloading...');
        loadExistingTemplate();
    }
}, { deep: true });

// Initialize template and CSS from sessionStorage, API, or query parameters
onMounted(async () => {
    console.log('onMounted: Starting initialization');
    console.log('Current domain:', domain.value);
    console.log('Domain context available:', !!domainContext.value);
    console.log('Dashboard template from context:', dashboardTemplate.value);
    console.log('useState template:', domainTemplate.value);

    // Load template presets
    await loadTemplatePresets();

    // Check if we're coming from the form editor
    const fromParam = route.query.from as string;
    console.log('From parameter:', fromParam);

    if (fromParam === 'preview') {
        const templateData = import.meta.client ? sessionStorage.getItem('dashboard_template_preview') : null;
        console.log('Preview mode - sessionStorage data:', templateData ? 'found' : 'not found');
        if (templateData) {
            try {
                const data = JSON.parse(templateData);
                currentTemplate.value = data.template || '';
                currentCss.value = data.css || '';
                editorMode.value = 'code';
                loadedFromSessionStorage.value = true; // Mark as loaded from sessionStorage
                console.log('Loaded from preview sessionStorage:', {
                    template: currentTemplate.value.substring(0, 100) + '...',
                    css: currentCss.value.substring(0, 50) + '...'
                });
                // Clear the session storage after using it
                if (import.meta.client) {
                    sessionStorage.removeItem('dashboard_template_preview');
                }
            } catch (error) {
                console.error('Error parsing template data from sessionStorage:', error);
            }
        }
    } else if (fromParam === 'editor') {
        const templateData = import.meta.client ? sessionStorage.getItem('dashboard_template_edit') : null;
        console.log('Editor mode - sessionStorage data:', templateData ? 'found' : 'not found');
        if (templateData) {
            try {
                const data = JSON.parse(templateData);
                currentTemplate.value = data.template || '';
                currentCss.value = data.css || '';
                editorMode.value = 'code';
                loadedFromSessionStorage.value = true; // Mark as loaded from sessionStorage
                console.log('Loaded from editor sessionStorage:', {
                    template: currentTemplate.value.substring(0, 100) + '...',
                    css: currentCss.value.substring(0, 50) + '...'
                });
                // Clear the session storage after using it
                if (import.meta.client) {
                    sessionStorage.removeItem('dashboard_template_edit');
                }
            } catch (error) {
                console.error('Error parsing template data from sessionStorage:', error);
            }
        }
    }

    // If no template loaded from sessionStorage, try domain context/API
    if (!currentTemplate.value) {
        loadedFromSessionStorage.value = false; // Mark as loaded from API
        console.log('No sessionStorage data, loading from domain context/API');
        await loadExistingTemplate();

        // If we're in normal mode and there's no API template, clear any old sessionStorage
        if (!currentTemplate.value?.trim() && import.meta.client) {
            sessionStorage.removeItem('dashboard_template_edit');
            sessionStorage.removeItem('dashboard_template_preview');
        }
    }

    // Fallback: Load initial values from query parameters (legacy support)
    if (!currentTemplate.value && route.query.template) {
        console.log('Loading from query parameters');
        currentTemplate.value = decodeURIComponent(route.query.template as string);
    }
    if (!currentCss.value && route.query.css) {
        currentCss.value = decodeURIComponent(route.query.css as string);
    }

    if (route.query.preview === 'true') {
        editorMode.value = 'code';
    }

    console.log('onMounted: Initialization complete', {
        template: currentTemplate.value ? currentTemplate.value.substring(0, 100) + '...' : 'empty',
        css: currentCss.value ? currentCss.value.substring(0, 50) + '...' : 'empty',
        editorMode: editorMode.value
    });
});

// Available components for visual editor
const availableComponents = [
    // Dashboard Stats Components
    {
        name: 'DomainDashboardTotalKillsBox',
        title: 'Total Kills',
        description: 'Display total kill count with time range',
        category: 'stats',
        icon: 'svg'
    },
    {
        name: 'DomainDashboardISKDestroyedBox',
        title: 'ISK Destroyed',
        description: 'Show ISK value destroyed with formatting',
        category: 'stats',
        icon: 'svg'
    },
    {
        name: 'DomainDashboardTopShipBox',
        title: 'Top Ship',
        description: 'Most used ship type with icon and stats',
        category: 'stats',
        icon: 'svg'
    },
    {
        name: 'DomainDashboardActiveEntitiesBox',
        title: 'Active Entities',
        description: 'Active pilots/corps/alliances counter',
        category: 'stats',
        icon: 'svg'
    },

    // Common Components (can be adapted for dashboard use)
    {
        name: 'StatCard',
        title: 'Stat Card',
        description: 'Generic stat display card',
        category: 'common',
        icon: 'svg'
    },
    {
        name: 'TopBox',
        title: 'Top Box',
        description: 'Display top performers or rankings',
        category: 'common',
        icon: 'svg'
    },
    {
        name: 'KillList',
        title: 'Kill List',
        description: 'List of recent kills with details',
        category: 'kills',
        icon: 'svg'
    },
    {
        name: 'MostValuable',
        title: 'Most Valuable',
        description: 'Most valuable kills showcase',
        category: 'kills',
        icon: 'svg'
    },
    {
        name: 'SimpleBarChart',
        title: 'Bar Chart',
        description: 'Simple bar chart for data visualization',
        category: 'charts',
        icon: 'svg'
    },
    {
        name: 'CampaignsList',
        title: 'Campaigns List',
        description: 'List of active campaigns',
        category: 'campaigns',
        icon: 'svg'
    }
];

// Template presets (loaded from API)
const templatePresets = ref<any[]>([]);
const isLoadingPresets = ref(false);

// Template composable
const {
    loadTemplate,
    saveTemplate,
    loadPresets,
    isLoading: templateLoading,
    isSaving: templateSaving,
    templateErrors
} = useDomainDashboardTemplate();

// Event handlers
async function saveCurrentTemplate() {
    if (!domain.value || !currentTemplate.value) {
        console.log('Cannot save: missing domain or template', {
            domain: domain.value,
            hasTemplate: !!currentTemplate.value
        });
        return;
    }

    console.log('Saving template for domain:', domain.value);

    try {
        const response = await $fetch(`/api/domain/${domain.value}/template`, {
            method: 'POST',
            body: {
                name: "Custom Dashboard",
                template: btoa(currentTemplate.value),
                customCss: btoa(currentCss.value || ""),
                description: "Custom dashboard template",
                encoded: true
            }
        });

        console.log('Template saved successfully:', response);

        // Update shared useState after successful save
        domainTemplate.value = currentTemplate.value;
        domainCss.value = currentCss.value;
        templateLoaded.value = true;

        // Could show a toast notification here
    } catch (error) {
        console.error('Failed to save template:', error);
        // Could show error notification here
    }
}

// Debounced update function for live preview
const updateDebounced = debounce(() => {
    // This triggers reactivity updates for the preview components
    nextTick(() => {
        // Force re-render of preview components
    });
}, 300);

function onTemplateEdit() {
    // Trigger live preview update with debouncing
    updateDebounced();
}

function onCssEdit() {
    // Trigger live preview update with debouncing
    updateDebounced();
}

// Simple debounce function
function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function onTemplateSave(template: string, css: string) {
    if (!domain.value) return;

    const success = await saveTemplate(domain.value, template, css);
    if (success) {
        // Could show a toast notification here
    } else {
        console.error('Failed to save template:', templateErrors.value);
        // Could show error notification here
    }
}

function onTemplateChange(template: string, css: string) {
    currentTemplate.value = template;
    currentCss.value = css;
}

function onDragStart(component: any, event: DragEvent) {
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', JSON.stringify(component));
    }
}

function onDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver.value = false;

    if (event.dataTransfer) {
        const componentData = JSON.parse(event.dataTransfer.getData('text/plain'));
        droppedComponents.value.push(componentData);
    }
}

function removeComponent(index: number) {
    droppedComponents.value.splice(index, 1);
}

function applyPreset(preset: any) {
    console.log('Applying preset:', preset.title);
    currentTemplate.value = preset.template || '';
    currentCss.value = preset.customCss || '';
    showPresets.value = false;
    console.log('Preset applied:', {
        template: currentTemplate.value.substring(0, 100) + '...',
        css: currentCss.value.substring(0, 50) + '...'
    });

    // Trigger live preview update
    nextTick(() => {
        updateDebounced();
    });
}

// Load template presets
async function loadTemplatePresets() {
    isLoadingPresets.value = true;
    try {
        const presets = await loadPresets();
        templatePresets.value = presets;
    } catch (error) {
        console.error('Failed to load template presets:', error);
    } finally {
        isLoadingPresets.value = false;
    }
}

// Load existing template for domain
async function loadExistingTemplate() {
    if (!domain.value) {
        console.log('No domain value, skipping template load');
        return;
    }

    console.log('loadExistingTemplate: Starting for domain:', domain.value);
    console.log('Domain context:', domainContext.value);
    console.log('Dashboard template from context:', dashboardTemplate.value);
    console.log('useState template:', domainTemplate.value);
    console.log('Template loaded flag:', templateLoaded.value);

    // Since this page has ssr: false, let's try API first for now
    try {
        console.log('loadExistingTemplate: Making API call to load template...');
        const templateData = await $fetch(`/api/domain/${domain.value}/template`);
        console.log('loadExistingTemplate: API response:', templateData);

        if (templateData && templateData.template) {
            currentTemplate.value = templateData.template;
            currentCss.value = templateData.customCss || '';

            // Update shared useState
            domainTemplate.value = currentTemplate.value;
            domainCss.value = currentCss.value;
            templateLoaded.value = true;

            console.log('loadExistingTemplate: Template loaded from API:', {
                templateLength: currentTemplate.value.length,
                cssLength: currentCss.value.length,
                template: currentTemplate.value.substring(0, 200) + '...',
                css: currentCss.value.substring(0, 100) + '...',
                isDefault: templateData.isDefault
            });
            return;
        } else {
            console.log('loadExistingTemplate: No template found in API response');
        }
    } catch (error) {
        console.error('loadExistingTemplate: Failed to load template from API:', error);
    }

    // Fallback: try domain context if API fails
    if (dashboardTemplate.value && dashboardTemplate.value.template) {
        console.log('Fallback: Using template from domain context');
        currentTemplate.value = dashboardTemplate.value.template || '';
        currentCss.value = dashboardTemplate.value.customCss || '';

        // Also update the shared useState
        domainTemplate.value = currentTemplate.value;
        domainCss.value = currentCss.value;
        templateLoaded.value = true;

        console.log('Template loaded from domain context:', {
            template: currentTemplate.value.substring(0, 100) + '...',
            css: currentCss.value.substring(0, 100) + '...'
        });
        return;
    }

    // Check if template is already loaded in useState
    if (domainTemplate.value && templateLoaded.value) {
        console.log('Fallback: Using template from useState');
        currentTemplate.value = domainTemplate.value;
        currentCss.value = domainCss.value;
        console.log('Template loaded from useState:', {
            template: currentTemplate.value.substring(0, 100) + '...',
            css: currentCss.value.substring(0, 100) + '...'
        });
        return;
    }

    console.log('loadExistingTemplate: No template found from any source');
    currentTemplate.value = '';
    currentCss.value = '';
}
</script>

<style scoped>
.dashboard-customizer-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}

.dashboard-editor-container {
    width: 100%;
}

.code-editor-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* 3-Section Layout for Code Editor */
.template-editor-panel,
.mobile-preview-panel {
    min-height: 600px;
    height: auto;
}

.template-editor-panel .bg-gray-800\/50,
.mobile-preview-panel .bg-gray-800\/50,
.live-preview-panel .bg-gray-800\/50 {
    height: 100%;
}

/* Desktop Preview - Full width, no margins */
.live-preview-panel .preview-container {
    margin: 0;
    padding: 0;
    height: 100%;
    max-height: none;
    width: 100%;
}

/* Mobile Preview Styling */
.mobile-preview-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    height: 100%;
}

.mobile-preview-container .bg-gray-900\/50 {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border-radius: 20px;
}

/* Ensure proper visual editor layout */
.visual-editor {
    min-height: 600px;
}

.visual-editor .cursor-move:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

pre code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Responsive adjustments */
@media (max-width: 1023px) {
    .code-editor-layout .grid {
        grid-template-columns: 1fr;
    }

    .template-editor-panel,
    .mobile-preview-panel {
        min-height: 350px;
        height: auto;
    }

    .live-preview-panel {
        margin-top: 1.5rem;
        min-height: 400px;
    }

    .mobile-preview-container {
        max-width: 100%;
    }
}

/* Mobile Device Frame Styling */
.mobile-device-frame {
    transform: scale(0.9);
    transform-origin: center top;
}

/* Mobile viewport content constraints */
.mobile-viewport-content {
    font-size: 14px;
    line-height: 1.4;
}

.mobile-viewport-content * {
    box-sizing: border-box;
}

/* Ensure mobile content stays within viewport */
.mobile-viewport-content .dashboard-container {
    max-width: 100%;
    overflow-x: hidden;
}

/* Status bar styling */
.mobile-device-frame .status-bar {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 600;
}

/* Device shadows and depth */
.mobile-device-frame > div {
    box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.8),
        0 10px 20px -5px rgba(0, 0, 0, 0.4);
}

@media (max-width: 1279px) {
    .mobile-device-frame {
        transform: scale(0.75);
        transform-origin: center top;
    }
}

@media (max-width: 1023px) {
    .mobile-device-frame {
        transform: scale(0.6);
        transform-origin: center top;
    }
}
</style>
