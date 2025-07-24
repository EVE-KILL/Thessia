<script setup lang="ts">
definePageMeta({
    layout: "default",
});

const { t, locale } = useI18n();
const { generateFAQStructuredData, addStructuredDataToHead } = useStructuredData();

useSeoMeta({
    title: t("faq.pageTitle"),
    description: t("faq.description"),
    ogTitle: t("faq.pageTitle"),
    ogDescription: t("faq.description"),
    ogType: "website",
    twitterCard: "summary",
    twitterTitle: t("faq.pageTitle"),
    twitterDescription: t("faq.description")
});

// Generate FAQ structured data using the composable
const faqItems = [
    {
        label: t('faq.items.killmail.label'),
        content: t('faq.items.killmail.content')
    },
    {
        label: t('faq.items.killmails.label'),
        content: t('faq.items.killmails.content')
    },
    {
        label: t('faq.items.api.label'),
        content: t('faq.items.api.content', { swaggerLink: '/swagger', scalarLink: '/scalar' })
    },
    {
        label: t('faq.items.donations.label'),
        content: t('faq.items.donations.content', { donateLink: '/donate' })
    },
    {
        label: t('faq.items.ads.label'),
        content: t('faq.items.ads.content')
    },
    {
        label: t('faq.items.account.label'),
        content: t('faq.items.account.content')
    },
    {
        label: t('faq.items.contact.label'),
        content: t('faq.items.contact.content', {
            discordLink: 'https://discord.gg/R9gZRc4Jtn',
            githubLink: 'https://github.com/eve-kill/Thessia'
        })
    }
];

// Add FAQ structured data to the page
const faqStructuredData = generateFAQStructuredData(faqItems);
addStructuredDataToHead(faqStructuredData);

// Create reactive items for our custom accordion with updated questions
const items = computed(() => [
    {
        label: t('faq.items.killmail.label'),
        icon: 'i-lucide-file-text',
        content: t('faq.items.killmail.content'),
        key: 'killmail'
    },
    {
        label: t('faq.items.killmails.label'),
        icon: 'i-lucide-mail',
        content: t('faq.items.killmails.content'),
        key: 'killmails'
    },
    {
        label: t('faq.items.api.label'),
        icon: 'i-lucide-code',
        content: t('faq.items.api.content', { swaggerLink: '/swagger', scalarLink: '/scalar' }),
        key: 'api'
    },
    {
        label: t('faq.items.donations.label'),
        icon: 'i-lucide-heart',
        content: t('faq.items.donations.content', { donateLink: '/donate' }),
        key: 'donations'
    },
    {
        label: t('faq.items.ads.label'),
        icon: 'i-lucide-ban',
        content: t('faq.items.ads.content'),
        key: 'ads'
    },
    {
        label: t('faq.items.account.label'),
        icon: 'i-lucide-user',
        content: t('faq.items.account.content'),
        key: 'account'
    },
    {
        label: t('faq.items.contact.label'),
        icon: 'i-lucide-message-square',
        content: t('faq.items.contact.content', {
            discordLink: 'https://discord.gg/R9gZRc4Jtn',
            githubLink: 'https://github.com/eve-kill/Thessia'
        }),
        key: 'contact'
    }
]);
</script>

<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <h1 class="text-3xl md:text-4xl font-bold mb-6 text-center">{{ t('faq.title') }}</h1>
                <div class="text-lg mb-8 text-center text-gray-300 dark:text-gray-400">
                    <p v-html="t('faq.description')"></p>
                </div>

                <!-- Use our custom Accordion component -->
                <Accordion :items="items" />
            </div>
        </UCard>
    </div>
</template>

<style scoped>
/* Target links within the FAQ page content */
:deep(a) {
    color: #00aaff;
    /* Primary color - adjust to match your theme */
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
}

:deep(a:hover) {
    text-decoration: underline;
    opacity: 0.9;
}
</style>
