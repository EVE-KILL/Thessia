<template>
    <div class="domain-dashboard-editor">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <!-- Editor Panel -->
            <div class="editor-panel">
                <div class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                    <!-- Editor Header -->
                    <div class="flex items-center justify-between p-4 border-b border-gray-700/50">
                        <h3 class="text-white font-semibold">Dashboard Template Editor</h3>
                        <div class="flex items-center space-x-2">
                            <button @click="showDocs = !showDocs"
                                class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                                {{ showDocs ? 'Hide' : 'Show' }} Docs
                            </button>
                            <button @click="resetToDefault"
                                class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
                                Reset to Default
                            </button>
                        </div>
                    </div>

                    <!-- Template Editor -->
                    <div class="p-4">
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            HTML Template
                        </label>
                        <textarea v-model="templateContent" @input="onTemplateChange"
                            class="w-full h-64 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono text-gray-100 resize-none focus:outline-none focus:border-blue-500"
                            placeholder="Enter your dashboard template HTML..." spellcheck="false" />
                    </div>

                    <!-- CSS Editor -->
                    <div class="p-4 border-t border-gray-700/50">
                        <label class="block text-sm font-medium text-gray-300 mb-2">
                            Custom CSS
                        </label>
                        <textarea v-model="cssContent" @input="onCssChange"
                            class="w-full h-32 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono text-gray-100 resize-none focus:outline-none focus:border-blue-500"
                            placeholder="Enter custom CSS styles..." spellcheck="false" />
                    </div>

                    <!-- Template Errors -->
                    <div v-if="templateErrors.length > 0" class="p-4 border-t border-red-700/50 bg-red-900/20">
                        <h4 class="text-red-400 font-semibold mb-2">Template Errors:</h4>
                        <ul class="text-red-300 text-sm space-y-1">
                            <li v-for="error in templateErrors" :key="error" class="flex items-start">
                                <span class="text-red-500 mr-2">•</span>
                                {{ error }}
                            </li>
                        </ul>
                    </div>

                    <!-- Save/Load Actions -->
                    <div class="flex items-center justify-between p-4 border-t border-gray-700/50 bg-gray-800/30">
                        <div class="flex items-center space-x-2">
                            <button @click="saveTemplate" :disabled="!isTemplateValid || isSaving"
                                class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors">
                                {{ isSaving ? 'Saving...' : 'Save Template' }}
                            </button>
                            <button @click="loadTemplate"
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                                Load Saved
                            </button>
                        </div>
                        <div class="text-sm text-gray-400">
                            Status: {{ isTemplateValid ? 'Valid' : 'Invalid' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preview Panel -->
            <div class="preview-panel">
                <div class="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden h-full">
                    <!-- Preview Header -->
                    <div class="flex items-center justify-between p-4 border-b border-gray-700/50">
                        <h3 class="text-white font-semibold">Live Preview</h3>
                        <div class="flex items-center space-x-2">
                            <select v-model="previewTimeRange"
                                class="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1">
                                <option value="1d">1 Day</option>
                                <option value="7d">7 Days</option>
                                <option value="14d">14 Days</option>
                                <option value="30d">30 Days</option>
                            </select>
                        </div>
                    </div>

                    <!-- Preview Content -->
                    <div class="preview-content p-4 h-full overflow-auto">
                        <!-- Mobile viewport simulation -->
                        <div class="mobile-preview-wrapper mx-auto" style="max-width: 375px;">
                            <div class="mobile-preview-container bg-white rounded-lg shadow-lg overflow-hidden">
                                <!-- Mobile chrome/frame -->
                                <div class="mobile-chrome bg-gray-100 px-4 py-2 flex items-center justify-center">
                                    <div class="flex items-center space-x-2">
                                        <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                                        <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                        <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                                    </div>
                                </div>

                                <!-- Mobile viewport content -->
                                <div class="mobile-viewport bg-gray-900 text-white min-h-96 overflow-hidden">
                                    <DomainDashboardRenderer :domain="domain" :time-range="previewTimeRange"
                                        :custom-template="templateContent" :custom-css="cssContent + mobilePreviewCSS"
                                        :fallback-to-default="false" :client-only="true" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Documentation Modal -->
        <div v-if="showDocs" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-white">Component Documentation</h3>
                    <button @click="showDocs = false" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="space-y-6">
                    <div v-for="(doc, componentName) in componentDocs" :key="componentName"
                        class="border-b border-gray-700 pb-4">
                        <h4 class="text-lg font-medium text-white mb-2">&lt;{{ componentName }}&gt;</h4>
                        <p class="text-gray-300 mb-3">{{ doc.description }}</p>

                        <div class="bg-gray-900/50 rounded-lg p-3 mb-3">
                            <code class="text-green-400 text-sm">{{ doc.example }}</code>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="(prop, propName) in doc.props" :key="propName" class="text-sm">
                                <div class="flex items-center space-x-2">
                                    <code class="text-blue-400">{{ propName }}</code>
                                    <span class="text-gray-500">{{ prop.type }}</span>
                                    <span v-if="prop.required" class="text-red-400 text-xs">required</span>
                                </div>
                                <p class="text-gray-400 text-xs mt-1">{{ prop.description }}</p>
                                <p v-if="prop.default" class="text-gray-500 text-xs">Default: {{ prop.default }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';
import { useDomainDashboardTemplate } from '~/composables/useDomainDashboardTemplate';
import DomainDashboardRenderer from './DomainDashboardRenderer.vue';

interface Props {
    /** Domain identifier for preview */
    domain: string;
    /** Initial template content */
    initialTemplate?: string;
    /** Initial CSS content */
    initialCss?: string;
}

const props = withDefaults(defineProps<Props>(), {
    initialTemplate: '',
    initialCss: ''
});

// Emits
const emit = defineEmits<{
    templateSave: [template: string, css: string];
    templateChange: [template: string, css: string];
}>();

// Template composable
const {
    templateErrors,
    isTemplateValid,
    componentDocs,
    generateDefaultTemplate,
    setTemplate
} = useDomainDashboardTemplate();

// Editor state
const templateContent = ref('');
const cssContent = ref('');
const showDocs = ref(false);
const isSaving = ref(false);
const previewTimeRange = ref<'1d' | '7d' | '14d' | '30d'>('7d');

// Mobile preview CSS to force mobile breakpoints in small preview
const mobilePreviewCSS = computed(() => `
    .dashboard-container {
        max-width: 100% !important;
        width: 100% !important;
    }

    .metrics-grid {
        grid-template-columns: 1fr !important;
        gap: 0.5rem !important;
    }

    .bottom-grid {
        grid-template-columns: 1fr !important;
        gap: 0.75rem !important;
    }

    /* Override component padding for mobile */
    .domain-dashboard-hero-box,
    .domain-dashboard-total-kills-box,
    .domain-dashboard-total-value-box,
    .domain-dashboard-top-character-box,
    .domain-dashboard-top-corporation-box,
    .domain-dashboard-tracking-overview,
    .domain-dashboard-campaigns,
    .domain-dashboard-most-valuable-kills,
    .domain-dashboard-ship-analysis,
    .domain-dashboard-recent-kills,
    .domain-dashboard-top-pilots,
    .domain-dashboard-top-corporations {
        width: 100% !important;
        margin-bottom: 0.5rem !important;
        padding: 0.75rem !important; /* p-3 instead of p-6 */
    }

    /* Force smaller text sizes for mobile */
    h1 { font-size: 1.25rem !important; line-height: 1.75rem !important; } /* text-xl */
    h2 { font-size: 1.125rem !important; line-height: 1.75rem !important; } /* text-lg */
    h3 { font-size: 1rem !important; line-height: 1.5rem !important; } /* text-base */
    h4, h5, h6 { font-size: 0.875rem !important; line-height: 1.25rem !important; } /* text-sm */

    /* Override large text in stat boxes */
    .text-2xl {
        font-size: 1.25rem !important;
        line-height: 1.75rem !important;
        margin-bottom: 0.25rem !important;
    }

    /* Make icons smaller */
    .w-8.h-8 {
        width: 1.5rem !important;
        height: 1.5rem !important;
    }

    .w-4.h-4 {
        width: 1rem !important;
        height: 1rem !important;
    }

    /* Reduce margins and spacing */
    .mb-2 { margin-bottom: 0.25rem !important; }
    .mb-1 { margin-bottom: 0.125rem !important; }
    .p-6 { padding: 0.75rem !important; }
    .p-4 { padding: 0.5rem !important; }

    /* Make skeleton loaders smaller */
    .h-8 { height: 1.5rem !important; }
    .w-24 { width: 4rem !important; }
    .w-32 { width: 6rem !important; }

    /* Force smaller rounded corners */
    .rounded-lg { border-radius: 0.375rem !important; }

    /* Hide scrollbars in mobile preview */
    ::-webkit-scrollbar {
        display: none;
    }

    /* Force single column for any grid layouts */
    .grid {
        grid-template-columns: 1fr !important;
        gap: 0.5rem !important;
    }

    /* Make tables more compact */
    table {
        font-size: 0.75rem !important;
    }

    td, th {
        padding: 0.25rem !important;
    }
`);

// Initialize content
onMounted(async () => {
    if (props.initialTemplate) {
        templateContent.value = props.initialTemplate;
        cssContent.value = props.initialCss || '';
    } else {
        // Load template from API instead of using generateDefaultTemplate
        await loadTemplateFromAPI();
    }
});

// Load template from API using the composable
async function loadTemplateFromAPI() {
    try {
        const { loadTemplate } = useDomainDashboardTemplate();
        const templateData = await loadTemplate(props.domain);
        if (templateData?.template) {
            templateContent.value = templateData.template;
            cssContent.value = templateData.customCss || '';
            // Trigger preview update after loading template
            onTemplateChange();
        } else {
            // Fallback to generateDefaultTemplate only if API fails
            resetToDefault();
        }
    } catch (error) {
        console.error('[DomainDashboardEditor] Failed to load template from API:', error);
        // Fallback to generateDefaultTemplate on error
        resetToDefault();
    }
}

// Debounced template change handlers
const debouncedTemplateUpdate = useDebounceFn(() => {
    nextTick(() => {
        setTemplate(templateContent.value, cssContent.value);
        emit('templateChange', templateContent.value, cssContent.value);
    });
}, 500); // 500ms debounce

// Template change handler
function onTemplateChange() {
    debouncedTemplateUpdate();
}

// CSS change handler
function onCssChange() {
    debouncedTemplateUpdate();
}

// Reset to default template
function resetToDefault() {
    templateContent.value = generateDefaultTemplate(props.domain, previewTimeRange.value);
    cssContent.value = `/* Dashboard Container */
.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    padding-top: 2rem;
}

/* Time Range Section */
.time-range-section {
    margin-bottom: 2rem;
}

/* Metrics Grid Layout - Force Grid Display */
.dashboard-container .metrics-grid {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 4rem; /* Increased space after metrics grid */
    align-items: stretch; /* Ensure all grid items stretch to same height */
}

/* Responsive grid breakpoints */
@media (min-width: 640px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .dashboard-container .metrics-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.5rem;
    }
}

/* Grid items - equal height and proper display */
.dashboard-container .metrics-grid-item {
    display: flex; /* Use flex to ensure child components fill height */
    width: 100%;
    min-height: 200px; /* Set minimum height for consistency */
}

/* Metric boxes - expand to fill container completely */
.dashboard-container .metric-box,
.dashboard-container .metrics-grid-item > * {
    flex: 1; /* Fill available space */
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 200px; /* Ensure minimum height */
}

/* Dashboard sections spacing */
.dashboard-section {
    margin-bottom: 3rem;
}

/* Bottom section - 80/20 split layout */
.bottom-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

/* Responsive 80/20 split for larger screens */
@media (min-width: 1280px) {
    .bottom-grid {
        grid-template-columns: 4fr 1fr;
        gap: 2rem;
    }
}

/* Kill list section (80% width on large screens) */
.kill-list-section {
    width: 100%;
    min-width: 0; /* Prevent flex item from overflowing */
}

/* Top boxes section (20% width on large screens) */
.top-boxes-section {
    width: 100%;
    min-width: 0; /* Prevent flex item from overflowing */
}`;

    onTemplateChange();
}

// Save template
function saveTemplate() {
    isSaving.value = true;

    setTimeout(() => {
        emit('templateSave', templateContent.value, cssContent.value);
        isSaving.value = false;
    }, 1000); // Simulate save delay
}

// Load template (placeholder for future implementation)
function loadTemplate() {
    // This would typically show a modal with saved templates
    // TODO: Implement load template functionality
}

// Watch for preview time range changes to update default template
watch(previewTimeRange, (newRange) => {
    if (!templateContent.value) {
        resetToDefault();
    }
});
</script>

<style scoped>
.domain-dashboard-editor {
    height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 1rem;
}

.editor-panel,
.preview-panel {
    height: calc(100vh - 2rem);
}

.preview-content {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    min-height: 500px;
}

/* Code editor styling */
textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    line-height: 1.5;
    tab-size: 2;
}

textarea:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Scrollbar styling */
.preview-content::-webkit-scrollbar {
    width: 6px;
}

.preview-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}
</style>
