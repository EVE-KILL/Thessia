<template>
    <div class="container mx-auto px-4 py-8">
        <UCard class="max-w-3xl mx-auto bg-black/20 dark:bg-gray-900/20 backdrop-blur-sm">
            <div class="p-6">
                <!-- Icon and Title -->
                <div class="text-center mb-8">
                    <div class="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                        <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-red-400" />
                    </div>
                    <h1 class="text-3xl md:text-4xl font-bold mb-4">Domain Not Found</h1>
                    <p class="text-lg text-gray-300 dark:text-gray-400">
                        The domain <strong class="text-red-400">{{ domain }}</strong> is not registered with EVE Kill.
                    </p>
                </div>

                <div class="space-y-6">
                    <!-- Explanation -->
                    <div>
                        <h2 class="text-2xl font-bold mb-3">What does this mean?</h2>
                        <ul class="space-y-3 text-gray-200 dark:text-gray-300">
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-x-circle" class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <span>This domain is not registered in our custom domain system</span>
                            </li>
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-x-circle" class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <span>You may have mistyped the domain name</span>
                            </li>
                            <li class="flex items-start space-x-3">
                                <UIcon name="i-heroicons-x-circle" class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <span>The domain owner hasn't set up their custom killboard yet</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Instructions -->
                    <div>
                        <h2 class="text-2xl font-bold mb-3">Want to Set Up a Custom Killboard?</h2>
                        <p class="text-gray-200 dark:text-gray-300 mb-4">
                            If you own this domain, you can create a custom killboard in just a few steps:
                        </p>
                        <ol class="list-decimal list-inside space-y-2 text-gray-200 dark:text-gray-300 ml-4">
                            <li>Create an account on EVE Kill</li>
                            <li>Navigate to User Settings → Custom Domains</li>
                            <li>Add your domain and configure your entities</li>
                            <li>Complete the DNS verification process</li>
                        </ol>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <UButton to="https://eve-kill.com" target="_blank"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-heroicons-home" />
                            Go to EVE Kill
                        </UButton>
                        <UButton to="https://eve-kill.com/user/settings/domains" target="_blank" variant="outline"
                            class="flex items-center gap-2 justify-center">
                            <UIcon name="i-heroicons-cog-6-tooth" />
                            Set Up Custom Domain
                        </UButton>
                    </div>

                    <!-- Help Links -->
                    <div class="pt-6 border-t border-gray-700/50 text-center">
                        <p class="text-sm text-gray-400 mb-4">
                            Need help setting up your custom killboard? Check our documentation.
                        </p>
                        <div class="flex justify-center space-x-6">
                            <NuxtLink to="/docs/domains"
                                class="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                                Documentation
                            </NuxtLink>
                            <NuxtLink to="/contact" class="text-sm text-gray-400 hover:text-gray-300 transition-colors">
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
    title: `${props.domain} - Domain Not Found`,
    description: `The custom domain ${props.domain} was not found. Set up your own custom EVE Online killboard today.`,
    robots: 'noindex,nofollow'
});
</script>
