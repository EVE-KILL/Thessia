<template>
    <div>
        <div class="bg-white dark:bg-black rounded-lg shadow-lg">
            <h1 class="text-3xl md:text-4xl font-bold mb-6">{{ $t('about.title') }}</h1>

            <div class="space-y-6">
                <p class="text-lg">
                    {{ $t('about.description') }}
                </p>

                <h2 class="text-2xl font-bold mt-8">{{ $t('about.mission.title') }}</h2>
                <p>
                    {{ $t('about.mission.text') }}
                </p>

                <h2 class="text-2xl font-bold mt-8">{{ $t('about.history.title') }}</h2>
                <p>
                    {{ $t('about.history.text') }}
                </p>

                <h2 class="text-2xl font-bold mt-8">{{ $t('about.contact.title') }}</h2>
                <p>
                    {{ $t('about.contact.text') }}
                </p>

                <div class="flex gap-4 mt-6">
                    <UButton to="https://discord.gg/R9gZRc4Jtn" target="_blank" class="flex items-center gap-2">
                        <UIcon name="i-simple-icons-discord" />
                        {{ $t('about.links.discord') }}
                    </UButton>
                    <UButton to="https://github.com/eve-kill/Thessia" target="_blank" variant="outline"
                        class="flex items-center gap-2">
                        <UIcon name="i-simple-icons-github" />
                        {{ $t('about.links.github') }}
                    </UButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const { t } = useI18n();

useSeoMeta({
  title: t('about.pageTitle')
});
</script>
