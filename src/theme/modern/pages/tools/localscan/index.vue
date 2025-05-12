<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const isLoading = ref(false);
const error = ref<string | null>(null);

const handlePaste = async () => {
    try {
        isLoading.value = true;
        error.value = null;

        // Get data from clipboard
        const text = await navigator.clipboard.readText();
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
    } catch (e) {
        error.value = t('tools.localscan.clipboard_error');
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div>
        <UContainer>
            <div class="text-center space-y-6 my-10">
                <h1 class="text-2xl font-bold">{{ t('tools.localscan.title') }}</h1>
                <p>{{ t('tools.localscan.instruction') }}</p>

                <div class="flex justify-center mt-6">
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
