<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const isLoading = ref(false);
const error = ref<string | null>(null);

const processNamesAndSubmit = async (text: string) => {
    if (!text.trim()) {
        error.value = t('tools.localscan.empty_clipboard');
        return;
    }

    // Parse names and remove empty lines
    const names = text.split('\n')
        .map(name => name.trim())
        .filter(name => name !== '');

    if (names.length === 0) {
        error.value = t('tools.localscan.no_names');
        return;
    }

    // Send to API
    const { data, error: fetchError } = await useFetch('/api/tools/localscan', {
        method: 'POST',
        body: names
    });

    if (fetchError.value) {
        error.value = t('tools.localscan.error_processing');
        console.error(fetchError.value);
        return;
    }

    // Navigate to result page with hash
    console.log('LocalScan API Response Data:', JSON.stringify(data.value, null, 2));
    if (data.value && typeof data.value.hash === 'string' && data.value.hash.length > 0) {
        try {
            await router.push(`/tools/localscan/${data.value.hash}`);
        } catch (navigationError) {
            error.value = t('tools.localscan.navigation_error');
        }
    } else {
        error.value = t('tools.localscan.invalid_response');
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
    } finally {
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
    } finally {
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
                        <UIcon name="clipboard" class="mr-2" />
                        {{ t('tools.localscan.paste_button') }}
                    </UButton>
                </div>

                <UAlert v-if="error" color="red">
                    {{ error }}
                </UAlert>
            </div>
        </UContainer>
    </div>
</template>
