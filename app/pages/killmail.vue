<template>
    <UContainer>
        <div class="text-center space-y-6 my-10">
            <h1 class="text-2xl font-bold">{{ t('killmail.title') }}</h1>
            <p class="max-w-xl mx-auto text-gray-600 dark:text-gray-400">{{ t('killmail.instruction') }}</p>

            <div class="mt-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                @click="handlePaste">
                <p class="text-lg mb-2 font-medium">{{ t('killmail.paste_direct') }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('killmail.press_ctrl_v') }}
                </p>
                <kbd class="px-2 py-1 mt-2 font-semibold text-xs bg-gray-200 dark:bg-gray-700 rounded shadow">{{ isMac ?
                    '⌘+V' : 'Ctrl+V' }}</kbd>
            </div>

            <!-- Options panel with better styling -->
            <div
                class="max-w-lg mx-auto mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 class="font-medium mb-3 text-left">{{ t('killmail.options') }}</h3>

                <div class="flex items-center gap-2">
                    <UCheckbox v-model="shouldRedirect" name="redirect" />
                    <label for="redirect" class="cursor-pointer text-left text-sm">
                        {{ t('killmail.redirect_after_posting') }}
                        <span class="block text-xs text-gray-500 dark:text-gray-400">{{
                            t('killmail.redirect_explanation') }}</span>
                    </label>
                </div>
            </div>

            <div class="flex justify-center mt-4">
                <UButton :loading="loading" :disabled="loading" @click="handlePaste" color="primary"
                    class="relative overflow-hidden">
                    <UIcon name="i-lucide-clipboard" class="mr-2" />
                    {{ t('killmail.paste_button') }}
                </UButton>
            </div>

            <UAlert v-if="errorMessage" color="red" class="mt-4" :description="errorMessage"
                icon="i-lucide-alert-triangle" />

            <UAlert v-if="lastPastedUrl" color="info" class="mt-4" icon="i-lucide-clipboard-check">
                <div class="text-sm">
                    <p class="font-medium">{{ t('killmail.last_pasted') }}</p>
                    <p class="break-all mt-1 text-xs text-gray-600 dark:text-gray-300">{{ lastPastedUrl }}</p>
                </div>
            </UAlert>

            <!-- Enhanced processed killmails section -->
            <div v-if="processedKillmails.length > 0"
                class="mt-6 border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="text-xl font-semibold">{{ t('killmail.processed_killmails') }}</h2>
                    <UButton @click="clearProcessedKillmails" color="gray" size="xs" icon="i-lucide-trash-2">
                        {{ t('killmail.clear_list') }}
                    </UButton>
                </div>

                <div class="space-y-2 max-h-80 overflow-y-auto">
                    <div v-for="(kill, index) in processedKillmails" :key="index"
                        class="p-3 border rounded-lg flex items-center justify-between" :class="{
                            'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800': kill.status === 'success',
                            'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800': kill.status === 'existing'
                        }">
                        <div class="flex items-center gap-2">
                            <UIcon :name="kill.status === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'"
                                class="mr-1 flex-shrink-0"
                                :class="kill.status === 'success' ? 'text-green-500' : 'text-yellow-500'" />
                            <span class="font-medium">{{ kill.id }}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">{{ kill.message }}</span>
                        </div>
                        <UButton icon="i-lucide-external-link" size="xs" color="gray"
                            @click="navigateToKillmail(kill.id)">
                            {{ t('killmail.view') }}
                        </UButton>
                    </div>
                </div>
            </div>
        </div>
    </UContainer>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
const errorMessage = ref('');
const loading = ref(false);
// Initialize with a default value and update after client-side hydration
const isMac = ref(false);
const lastPastedUrl = ref('');
const shouldRedirect = ref(true);

// Interface for processed killmail items
interface ProcessedKillmail {
    id: number;
    status: 'success' | 'existing' | 'error';
    message: string;
}

// Array to store processed killmails
const processedKillmails = ref<ProcessedKillmail[]>([]);

// SEO
useSeoMeta({
    title: t('killmail.pageTitle'),
    description: t('killmail.pageDescription'),
    ogTitle: t('killmail.pageTitle'),
    ogDescription: t('killmail.pageDescription'),
});

/**
 * Extracts killmail ID and hash from a URL
 * @param url - The killmail URL from ESI
 * @returns The killmail ID and hash, or null if invalid
 */
const extractKillmailInfo = (url: string) => {
    // First check if the URL is from the ESI API
    if (!url.startsWith('https://esi.evetech.net/')) {
        throw new Error(t('killmail.not_esi_url'));
    }

    if (!url.includes('killmails')) {
        throw new Error(t('killmail.not_killmail_url'));
    }

    const regex = /killmails\/(\d+)\/([a-f0-9]+)/i;
    const matches = url.match(regex);

    if (!matches || matches.length < 3) {
        throw new Error(t('killmail.invalidUrlFormat'));
    }

    const killmail_id = parseInt(matches[1]);
    const killmail_hash = matches[2];

    if (isNaN(killmail_id)) {
        throw new Error(t('killmail.invalid_killmail_id'));
    }

    if (!killmail_hash || killmail_hash.length < 10) {
        throw new Error(t('killmail.invalid_killmail_hash'));
    }

    return { killmail_id, killmail_hash };
};

/**
 * Clear the processed killmails list
 */
const clearProcessedKillmails = () => {
    processedKillmails.value = [];
};

/**
 * Navigate to a specific killmail page
 */
const navigateToKillmail = (killmail_id: number) => {
    router.push(`/kill/${killmail_id}`);
};

/**
 * Processes the URL and submits it to the API
 */
const processAndSubmit = async (url: string) => {
    errorMessage.value = '';
    loading.value = true;
    lastPastedUrl.value = url;

    try {
        const killmailInfo = extractKillmailInfo(url);

        const { data, error } = await useFetch('/api/killmail', {
            method: 'POST',
            body: killmailInfo
        });

        if (error.value) {
            errorMessage.value = `${t('killmail.apiError')}: ${error.value.message}`;
            return;
        }

        // Handling the response based on the redirect preference
        if (data.value?.error) {
            // If there's an error but it's just that the killmail already exists,
            // redirect to the killmail page instead of showing an error
            if (data.value.error === "Killmail already exists") {
                // If redirect is enabled, go directly to the killmail
                if (shouldRedirect.value) {
                    router.push(`/kill/${killmailInfo.killmail_id}`);
                    return;
                }

                // If redirect is disabled, add to processed list and allow user to view it manually
                processedKillmails.value.unshift({
                    id: killmailInfo.killmail_id,
                    status: 'existing',
                    message: t('killmail.already_exists')
                });
                return;
            } else {
                errorMessage.value = data.value.error;
            }
            return;
        }

        // Add to processed list
        processedKillmails.value.unshift({
            id: killmailInfo.killmail_id,
            status: 'success',
            message: t('killmail.successfully_added')
        });

        // Redirect if the option is enabled
        if (shouldRedirect.value) {
            router.push(`/kill/${killmailInfo.killmail_id}`);
        }
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t('killmail.unknownError');
    } finally {
        loading.value = false;
    }
};

/**
 * Reads from clipboard and processes the URL
 */
const handlePaste = async () => {
    try {
        loading.value = true;
        errorMessage.value = '';

        // Check if we're in a browser environment
        if (!process.client) {
            errorMessage.value = t('killmail.client_only_feature');
            loading.value = false;
            return;
        }

        // Get data from clipboard
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText.trim()) {
            errorMessage.value = t('killmail.empty_clipboard');
            loading.value = false;
            return;
        }

        await processAndSubmit(clipboardText);
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : t('killmail.clipboardError');
        loading.value = false;
    }
};

/**
 * Handle paste event on document level
 */
const onDocumentPaste = async (event: ClipboardEvent) => {
    if (loading.value) return;

    try {
        const text = event.clipboardData?.getData('text') || '';
        if (text.trim()) {
            await processAndSubmit(text);
        } else {
            errorMessage.value = t('killmail.empty_clipboard');
        }
    } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : t('killmail.clipboardError');
    }
};

// Only run client-side code in onMounted
onMounted(() => {
    // Check for Mac OS only on the client side
    if (process.client && typeof navigator !== 'undefined') {
        isMac.value = navigator.userAgent.includes('Mac');
        document.addEventListener('paste', onDocumentPaste);
    }
});

onUnmounted(() => {
    // Remove event listener only if we're on the client side
    if (process.client && typeof document !== 'undefined') {
        document.removeEventListener('paste', onDocumentPaste);
    }
});
</script>
