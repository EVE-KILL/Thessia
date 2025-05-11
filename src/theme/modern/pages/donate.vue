<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <h1 class="text-3xl md:text-4xl font-bold mb-6 text-center">{{ t('donate.title') }}</h1>

                <div class="mb-8">
                    <p class="text-lg text-center text-gray-300 dark:text-gray-400">
                        {{ t('donate.description') }}
                    </p>
                    <div class="border-l-4 border-primary pl-4 mt-4 py-2 bg-black/30 dark:bg-gray-800/30 rounded">
                        <p class="text-sm italic text-gray-300">
                            {{ t("donate.disclaimer") }}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        class="flex flex-col items-center p-6 border border-gray-700 rounded-lg bg-black/30 dark:bg-gray-800/30 hover:border-primary transition-colors">
                        <UIcon name="i-lucide-shopping-cart" class="text-4xl mb-4 text-primary" />
                        <h3 class="text-xl font-semibold mb-2">{{ t('donate.markeeDragonTitle') }}</h3>
                        <p class="text-center text-sm mb-4">{{ t('donate.markeeDragonDescription') }}</p>
                        <UButton as="a"
                            href="https://store.markeedragon.com/affiliate.php?id=1104&redirect=index.php?cat=4"
                            target="_blank" rel="noopener" color="primary" size="lg" block>
                            {{ t('donate.markeeDragon') }}
                        </UButton>
                    </div>

                    <div
                        class="flex flex-col items-center p-6 border border-gray-700 rounded-lg bg-black/30 dark:bg-gray-800/30 hover:border-primary transition-colors">
                        <UIcon name="i-lucide-coffee" class="text-4xl mb-4 text-primary" />
                        <h3 class="text-xl font-semibold mb-2">{{ t('donate.koFiTitle') }}</h3>
                        <p class="text-center text-sm mb-4">{{ t('donate.koFiDescription') }}</p>
                        <UButton as="a" href="https://ko-fi.com/evekill" target="_blank" color="secondary" size="lg"
                            block>
                            {{ t('donate.koFi') }}
                        </UButton>
                    </div>
                </div>

                <p class="mt-8 text-center text-gray-400">{{ t('donate.thankYouMessage') }}</p>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const { t } = useI18n();
useSeoMeta({
    title: t('donate.pageTitle'),
    description: t('donate.description')
});
</script>
