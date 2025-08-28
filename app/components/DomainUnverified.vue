<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <!-- Icon and Title -->
                <div class="text-center mb-8">
                    <div class="mx-auto w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                        <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-yellow-400" />
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold mb-4">Domain Not Verified</h1>
                    <p class="text-lg text-gray-300 dark:text-gray-400">
                        The domain <strong class="text-yellow-400">{{ domain }}</strong> is not yet verified.
                    </p>
                </div>

                <div class="space-y-6">
                    <!-- Explanation -->
                    <div>
                        <h2 class="text-2xl font-bold mb-3">What does this mean?</h2>
                        <ul class="space-y-3 text-gray-200 dark:text-gray-300">
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-check-circle"
                                    class="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>This custom domain has been registered but not yet verified</span>
                            </li>
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-check-circle"
                                    class="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Domain verification ensures proper DNS configuration</span>
                            </li>
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-check-circle"
                                    class="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Once verified, this page will display the custom killboard</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Instructions -->
                    <div>
                        <h2 class="text-2xl font-bold mb-3">For Domain Owners</h2>
                        <p class="text-gray-200 dark:text-gray-300 mb-4">
                            If you own this domain, please complete the verification process:
                        </p>
                        <ol class="list-decimal list-inside space-y-2 text-gray-200 dark:text-gray-300 ml-4">
                            <li>Log into your EVE Kill user settings</li>
                            <li>Navigate to the Custom Domains section</li>
                            <li>Follow the DNS verification instructions</li>
                            <li>Click the "Verify Domain" button</li>
                        </ol>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <UButton to="https://eve-kill.com" target="_blank" variant="outline"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-heroicons-home" />
                            Go to EVE Kill
                        </UButton>
                        <UButton to="https://eve-kill.com/user/settings/domains" target="_blank"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-heroicons-cog-6-tooth" />
                            Domain Settings
                        </UButton>
                    </div>

                    <!-- Help Links -->
                    <div class="pt-6 border-t border-gray-700/50 text-center">
                        <p class="text-sm text-gray-400 mb-4">
                            Need help? Check our documentation or contact support.
                        </p>
                        <div class="flex justify-center space-x-6">
                            <NuxtLink to="https://eve-kill.com/docs/domains" target="_blank"
                                class="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                                Documentation
                            </NuxtLink>
                            <NuxtLink to="https://eve-kill.com/contact" target="_blank"
                                class="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                                Contact Support
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
interface Props {
    domain: string;
}

const props = defineProps<Props>();

// SEO
useSeoMeta({
    title: `${props.domain} - Domain Not Verified`,
    description: `The custom domain ${props.domain} is not yet verified. Complete the verification process to access your custom killboard.`,
    robots: 'noindex,nofollow'
});
</script>
