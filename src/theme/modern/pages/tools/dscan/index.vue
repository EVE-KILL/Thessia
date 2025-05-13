<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const isLoading = ref(false);
const error = ref<string | null>(null);

const processDscanAndSubmit = async (text: string) => {
    if (!text.trim()) {
        error.value = t('tools.dscan.empty_clipboard');
        isLoading.value = false; // Ensure loading is stopped
        return;
    }

    try {
        isLoading.value = true;
        error.value = null;

        // Send to API
        const { data, error: fetchError } = await useFetch('/api/tools/dscan', {
            method: 'POST',
            body: { dscan: text }
        });

        if (fetchError.value) {
            // Try to get a more specific error message if available
            const errorDetail = fetchError.value.data?.message || t('tools.dscan.error_processing');
            error.value = errorDetail;
            console.error('DScan API error:', fetchError.value);
            return;
        }

        // Navigate to result page with hash
        if (data.value && data.value.hash) {
            await router.push(`/tools/dscan/${data.value.hash}`);
        } else {
            error.value = t('tools.dscan.invalid_response');
        }
    } catch (e) {
        console.error('Error processing DScan:', e);
        error.value = t('tools.dscan.error_processing'); // Generic error for unexpected issues
    } finally {
        isLoading.value = false;
    }
};

const handlePasteButtonClick = async () => {
    try {
        isLoading.value = true;
        error.value = null;
        const text = await navigator.clipboard.readText();
        await processDscanAndSubmit(text);
    } catch (e) {
        console.error('Clipboard read error:', e);
        error.value = t('tools.dscan.clipboard_error');
        isLoading.value = false;
    }
};

// Document-level paste event handler
const onDocumentPaste = async (event: ClipboardEvent) => {
    try {
        isLoading.value = true;
        error.value = null;
        const text = event.clipboardData?.getData('text') || '';
        await processDscanAndSubmit(text);
    } catch (e) {
        console.error('Document paste error:', e);
        error.value = t('tools.dscan.clipboard_error');
        isLoading.value = false;
    }
};

onMounted(() => {
    document.addEventListener('paste', onDocumentPaste);
});

onUnmounted(() => {
    document.removeEventListener('paste', onDocumentPaste);
});
</script>

<template>
    <div>
        <UContainer>
            <div class="text-center space-y-6 my-10">
                <h1 class="text-2xl font-bold">{{ t('tools.dscan.title') }}</h1>
                <p>{{ t('tools.dscan.instruction') }}</p>

                <div
                    class="mt-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p class="text-lg mb-2">{{ t('tools.localscan.paste_direct') }}</p>
                    <!-- Assuming same i18n key is fine -->
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ t('tools.localscan.press_ctrl_v') }} <!-- Assuming same i18n key is fine -->
                    </p>
                    <kbd class="px-2 py-1 mt-2 font-semibold text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl+V</kbd>
                </div>

                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('tools.localscan.or_use_button') }} <!-- Assuming same i18n key is fine -->
                </p>

                <div class="flex justify-center mt-2">
                    <UButton :loading="isLoading" :disabled="isLoading" @click="handlePasteButtonClick">
                        <UIcon name="i-lucide-clipboard" class="mr-2" />
                        {{ t('tools.dscan.paste_button') }}
                    </UButton>
                </div>

                <UAlert v-if="error" color="error" class="mt-4" :description="error" />
            </div>
        </UContainer>
    </div>
</template>
