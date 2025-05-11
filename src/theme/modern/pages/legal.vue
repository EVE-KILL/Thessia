<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <h1 class="text-3xl md:text-4xl font-bold mb-6 text-center">{{ t('legal.title') }}</h1>

                <div class="space-y-8 text-gray-200 dark:text-gray-300">
                    <section>
                        <h2 class="text-2xl font-bold mb-3">{{ t('legal.disclaimer.title') }}</h2>
                        <div class="leading-relaxed">
                            <p class="mb-3">{{ t('legal.disclaimer.p1') }}</p>
                            <p>{{ t('legal.disclaimer.p2') }}</p>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-2xl font-bold mb-3">{{ t('legal.license.title') }}</h2>
                        <div class="leading-relaxed">
                            <p class="mb-3">{{ t('legal.license.p1') }}</p>
                            <p class="mb-3">{{ t('legal.license.p2') }}</p>
                            <p>
                                <a href="https://github.com/EVE-KILL/Thessia/blob/main/LICENSE" target="_blank"
                                    rel="noopener noreferrer" class="hover:underline">
                                    {{ t('legal.license.viewLicense') }}
                                </a>
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-2xl font-bold mb-3">{{ t('legal.ownership.title') }}</h2>
                        <div class="leading-relaxed">
                            <p class="mb-3">{{ t('legal.ownership.p1') }}</p>
                            <p>
                                <a href="https://www.ccpgames.com" target="_blank" rel="noopener noreferrer"
                                    class="hover:underline">
                                    {{ t('legal.ownership.ccpLink') }}
                                </a>
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-2xl font-bold mb-3">{{ t('legal.data.title') }}</h2>
                        <div class="leading-relaxed">
                            <p class="mb-3">{{ t('legal.data.p1') }}</p>
                            <p>{{ t('legal.data.p2') }}</p>
                        </div>
                    </section>

                    <section>
                        <h2 class="text-2xl font-bold mb-3">{{ t('legal.contact.title') }}</h2>
                        <div class="leading-relaxed">
                            <p class="mb-3">{{ t('legal.contact.p1') }}</p>
                            <p>
                                <a href="https://github.com/EVE-KILL/Thessia/issues" target="_blank"
                                    rel="noopener noreferrer" class="hover:underline">
                                    {{ t('legal.contact.githubIssues') }}
                                </a>
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
});

const { t } = useI18n();

useSeoMeta({
    title: t("legal.pageTitle"),
    description: t("legal.title"),
});
</script>

<style scoped>
/* Target links within the legal page content */
:deep(.text-gray-200 a),
:deep(.text-gray-300 a),
:deep(.text-gray-400 a) {
    color: #00aaff;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
}

:deep(.text-gray-200 a:hover),
:deep(.text-gray-300 a:hover),
:deep(.text-gray-400 a:hover) {
    text-decoration: underline;
    opacity: 0.9;
}
</style>
