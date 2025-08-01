<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const isLoading = ref(false);
const error = ref<string | null>(null);

// Constants for validation limits
const MAX_LINE_LENGTH = 64;
const MAX_LINES = 4096;

const processNamesAndSubmit = async (text: string) => {
    if (!text.trim()) {
        error.value = t('tools.localscan.empty_clipboard');
        return;
    }

    // Parse names and remove empty lines
    const lines = text.split('\n');

    // Check for line count limit
    if (lines.length > MAX_LINES) {
        error.value = t('tools.localscan.too_many_lines', { max: MAX_LINES });
        return;
    }

    const names = lines
        .map(name => name.trim())
        .filter(name => name !== '' && name.length <= MAX_LINE_LENGTH); // Filter out lines that are too long

    if (names.length === 0) {
        error.value = t('tools.localscan.no_names');
        return;
    }

    // Log if any lines were skipped due to length
    if (names.length < lines.filter(line => line.trim() !== '').length) {
        console.warn(`Skipped ${lines.filter(line => line.trim() !== '').length - names.length} names that exceeded the maximum length of ${MAX_LINE_LENGTH} characters`);
    }

    // Send to API
    try {
        isLoading.value = true;
        error.value = null;

        const response = await fetch('/api/tools/localscan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(names)
        });

        // First check if response is ok
        if (!response.ok) {
            // Try to parse error message from JSON response
            try {
                const errorData = await response.json();
                // Use the server's error message if available
                error.value = errorData.message || t('tools.localscan.error_processing');
            } catch (parseError) {
                // If JSON parsing fails, use a generic error based on status code
                if (response.status === 404) {
                    error.value = t('tools.localscan.no_valid_characters');
                } else {
                    error.value = `${t('tools.localscan.error_processing')} (${response.status})`;
                }
            }

            console.error('API error:', response.status, error.value);
            return;
        }

        // If we get here, the response is ok, so parse the data
        const data = await response.json();

        // Navigate to result page with hash
        if (data && typeof data.hash === 'string' && data.hash.length > 0) {
            try {
                await router.push(`/tools/localscan/${data.hash}`);
            } catch (navigationError) {
                error.value = t('tools.localscan.navigation_error');
            }
        } else {
            error.value = t('tools.localscan.invalid_response');
        }
    } catch (e) {
        error.value = t('tools.localscan.error_processing');
    } finally {
        isLoading.value = false;
    }
};

const handlePaste = async () => {
    try {
        isLoading.value = true;
        error.value = null;

        // Get data from clipboard
        const text = await navigator.clipboard.readText();
        await processNamesAndSubmit(text);
    } catch (e) {
        error.value = t('tools.localscan.clipboard_error');
        isLoading.value = false;
    }
};

// Document-level paste event handler
const onDocumentPaste = async (event: ClipboardEvent) => {
    try {
        isLoading.value = true;
        error.value = null;

        // Get pasted text from the clipboard event
        const text = event.clipboardData?.getData('text') || '';
        await processNamesAndSubmit(text);
    } catch (e) {
        error.value = t('tools.localscan.clipboard_error');
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
                <h1 class="text-2xl font-bold">{{ t('tools.localscan.title') }}</h1>
                <p>{{ t('tools.localscan.instruction') }}</p>

                <div
                    class="mt-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p class="text-lg mb-2">{{ t('tools.localscan.paste_direct') }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ t('tools.localscan.press_ctrl_v') }}
                    </p>
                    <kbd class="px-2 py-1 mt-2 font-semibold text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl+V</kbd>
                </div>

                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('tools.localscan.or_use_button') }}
                </p>

                <div class="flex justify-center mt-2">
                    <UButton :loading="isLoading" :disabled="isLoading" @click="handlePaste">
                        <UIcon name="i-lucide-clipboard" class="mr-2" />
                        {{ t('tools.localscan.paste_button') }}
                    </UButton>
                </div>

                <UAlert v-if="error" color="error" class="mt-4" :description="error" />
            </div>
        </UContainer>
    </div>
</template>
