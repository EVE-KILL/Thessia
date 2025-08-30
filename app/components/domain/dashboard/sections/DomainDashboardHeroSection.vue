<template>
    <div
        class="relative overflow-hidden bg-gradient-to-br from-gray-900/30 via-gray-800/20 to-gray-900/30 border-b border-gray-800">
        <div
            class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZjJhNDAiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20">
        </div>

        <UContainer class="relative py-16">
            <div class="text-center max-w-4xl mx-auto">
                <!-- Domain Title & Branding -->
                <h1
                    class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 bg-clip-text text-transparent mb-4">
                    {{ title }}
                </h1>

                <!-- Enhanced Welcome Message Section -->
                <div class="mb-8 space-y-4">
                    <!-- Primary Welcome Message -->
                    <p class="text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto">
                        {{ welcomeMessage }}
                    </p>

                    <!-- Secondary Custom Text (if configured) -->
                    <div v-if="secondaryMessage" class="max-w-2xl mx-auto">
                        <p class="text-base text-zinc-400 leading-relaxed">
                            {{ secondaryMessage }}
                        </p>
                    </div>

                    <!-- Call-to-Action Buttons (if configured) -->
                    <div v-if="ctaButtons.length > 0" class="flex flex-wrap justify-center gap-3 mt-6">
                        <a v-for="cta in ctaButtons" :key="cta.id" :href="cta.url"
                            :target="cta.external ? '_blank' : '_self'"
                            class="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
                            :class="cta.primary ?
                                'bg-gray-700 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl' :
                                'bg-gray-800/50 hover:bg-gray-700/50 text-zinc-200 border border-gray-600 hover:border-gray-500'">
                            {{ cta.text }}
                            <svg v-if="cta.external" class="w-4 h-4 ml-2" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14">
                                </path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
interface Props {
    /** Domain identifier */
    domain: string;
    /** Hero section title */
    title?: string;
    /** Welcome message text */
    welcomeMessage?: string;
    /** Secondary message text */
    secondaryMessage?: string;
    /** Call-to-action buttons */
    ctaButtons?: Array<{
        id: string;
        text: string;
        url: string;
        primary?: boolean;
        external?: boolean;
    }>;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Domain Dashboard',
    welcomeMessage: 'Welcome to this EVE Online killboard. Track combat activity, analyze statistics, and monitor space battles.',
    secondaryMessage: '',
    ctaButtons: () => []
});
</script>
