<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <h1 class="text-3xl md:text-4xl font-bold mb-6 text-center">{{ t('about.title') }}</h1>

                <p class="text-lg text-center text-gray-300 dark:text-gray-400 mb-8">
                    {{ t('about.description') }}
                </p>

                <div class="space-y-8">
                    <div>
                        <h2 class="text-2xl font-bold mb-3">{{ t('about.mission.title') }}</h2>
                        <div class="text-gray-200 dark:text-gray-300 leading-relaxed">
                            {{ t('about.mission.text') }}
                        </div>
                    </div>

                    <div>
                        <h2 class="text-2xl font-bold mb-3">{{ t('about.history.title') }}</h2>
                        <div class="text-gray-200 dark:text-gray-300 leading-relaxed">
                            {{ t('about.history.text') }}
                        </div>
                    </div>

                    <div>
                        <h2 class="text-2xl font-bold mb-3">{{ t('about.contact.title') }}</h2>
                        <div class="text-gray-200 dark:text-gray-300 leading-relaxed" v-html="t('about.contact.text', {
                            discordLink: 'https://discord.gg/R9gZRc4Jtn',
                            githubLink: 'https://github.com/eve-kill/Thessia'
                        })">
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <UButton to="https://discord.gg/R9gZRc4Jtn" target="_blank"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-simple-icons-discord" />
                            {{ t('about.links.discord') }}
                        </UButton>
                        <UButton to="https://github.com/eve-kill/Thessia" target="_blank" variant="outline"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-simple-icons-github" />
                            {{ t('about.links.github') }}
                        </UButton>
                    </div>
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
    title: t("about.pageTitle"),
    description: t("about.description"),
});
</script>

<style scoped>
/* Target links within the about page content, but exclude buttons */
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
