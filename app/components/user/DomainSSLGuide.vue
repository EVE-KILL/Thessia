<template>
    <div class="ssl-guide space-y-6">
        <!-- SSL Status -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ t('settings.domains.ssl.title') }}
                </h3>
                <div class="flex items-center gap-2">
                    <UIcon :name="sslStatusIcon" :class="sslStatusColor" class="w-5 h-5" />
                    <UBadge :color="sslBadgeColor" variant="soft">
                        {{ sslStatusText }}
                    </UBadge>
                </div>
            </div>

            <p class="text-gray-600 dark:text-gray-400 mb-4">
                {{ t('settings.domains.ssl.description') }}
            </p>

            <!-- SSL Status Details -->
            <div v-if="sslInfo" class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.ssl.issuer') }}:
                        </span>
                        <span class="text-gray-600 dark:text-gray-400 ml-2">
                            {{ sslInfo.issuer || 'Unknown' }}
                        </span>
                    </div>
                    <div v-if="sslInfo.expiresAt">
                        <span class="font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.ssl.expiresAt') }}:
                        </span>
                        <span class="text-gray-600 dark:text-gray-400 ml-2">
                            {{ formatDate(sslInfo.expiresAt) }}
                        </span>
                    </div>
                    <div v-if="sslInfo.validFrom">
                        <span class="font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.ssl.validFrom') }}:
                        </span>
                        <span class="text-gray-600 dark:text-gray-400 ml-2">
                            {{ formatDate(sslInfo.validFrom) }}
                        </span>
                    </div>
                    <div v-if="sslInfo.protocol">
                        <span class="font-medium text-gray-700 dark:text-gray-300">
                            {{ t('settings.domains.ssl.protocol') }}:
                        </span>
                        <span class="text-gray-600 dark:text-gray-400 ml-2">
                            {{ sslInfo.protocol }}
                        </span>
                    </div>
                </div>

                <!-- Expiration Warning -->
                <div v-if="showExpirationWarning"
                    class="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <UIcon name="lucide:alert-triangle"
                        class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                            {{ t('settings.domains.ssl.expirationWarning.title') }}
                        </h4>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300">
                            {{ t('settings.domains.ssl.expirationWarning.message', { days: daysUntilExpiry }) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 mt-6">
                <button @click="checkSSL" :disabled="isCheckingSSL"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors">
                    <UIcon v-if="isCheckingSSL" name="lucide:loader-2" class="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {{ t('settings.domains.ssl.checkSSL') }}
                </button>
                <button @click="showGuide = !showGuide"
                    class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors">
                    <UIcon :name="showGuide ? 'lucide:eye-off' : 'lucide:book-open'" class="-ml-1 mr-2 h-4 w-4" />
                    {{ showGuide ? t('settings.domains.ssl.hideGuide') : t('settings.domains.ssl.showGuide') }}
                </button>
            </div>
        </div>

        <!-- SSL Setup Guide -->
        <div v-if="showGuide"
            class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {{ t('settings.domains.ssl.setupGuide.title') }}
            </h3>

            <UTabs v-model="selectedProvider" :items="sslProviders" class="w-full">
                <!-- Cloudflare -->
                <template #cloudflare>
                    <div class="space-y-4">
                        <div class="flex items-center gap-3 mb-4">
                            <img src="/images/providers/cloudflare.svg" alt="Cloudflare" class="w-6 h-6" />
                            <h4 class="text-md font-medium text-gray-900 dark:text-white">
                                {{ t('settings.domains.ssl.providers.cloudflare.title') }}
                            </h4>
                            <UBadge color="success" variant="soft" size="sm">
                                {{ t('settings.domains.ssl.providers.free') }}
                            </UBadge>
                        </div>

                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            {{ t('settings.domains.ssl.providers.cloudflare.description') }}
                        </p>

                        <div class="space-y-3">
                            <div v-for="(step, index) in cloudflareSteps" :key="index" class="flex gap-3">
                                <div
                                    class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                                    {{ index + 1 }}
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm text-gray-700 dark:text-gray-300" v-html="step"></p>
                                </div>
                            </div>
                        </div>

                        <!-- DNS Configuration Example -->
                        <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {{ t('settings.domains.ssl.dnsConfig') }}:
                            </h5>
                            <div class="font-mono text-sm space-y-1">
                                <div class="text-gray-600 dark:text-gray-400">
                                    <span class="text-blue-600 dark:text-blue-400">CNAME</span>
                                    <span class="mx-2">@</span>
                                    <span class="text-green-600 dark:text-green-400">eve-kill.com</span>
                                    <span class="text-orange-500 ml-2">(Proxied: ON)</span>
                                </div>
                                <div class="text-gray-600 dark:text-gray-400">
                                    <span class="text-blue-600 dark:text-blue-400">CNAME</span>
                                    <span class="mx-2">www</span>
                                    <span class="text-green-600 dark:text-green-400">eve-kill.com</span>
                                    <span class="text-orange-500 ml-2">(Proxied: ON)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Let's Encrypt -->
                <template #letsencrypt>
                    <div class="space-y-4">
                        <div class="flex items-center gap-3 mb-4">
                            <img src="/images/providers/letsencrypt.svg" alt="Let's Encrypt" class="w-6 h-6" />
                            <h4 class="text-md font-medium text-gray-900 dark:text-white">
                                {{ t('settings.domains.ssl.providers.letsencrypt.title') }}
                            </h4>
                            <UBadge color="success" variant="soft" size="sm">
                                {{ t('settings.domains.ssl.providers.free') }}
                            </UBadge>
                        </div>

                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            {{ t('settings.domains.ssl.providers.letsencrypt.description') }}
                        </p>

                        <!-- Code Example -->
                        <div class="p-4 bg-gray-900 dark:bg-gray-800 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium text-gray-300">Terminal</span>
                                <button @click="copyToClipboard(letsencryptCommands)"
                                    class="text-xs text-gray-400 hover:text-gray-200">
                                    {{ t('copy') }}
                                </button>
                            </div>
                            <pre
                                class="text-sm text-green-400 overflow-x-auto"><code>{{ letsencryptCommands }}</code></pre>
                        </div>

                        <div
                            class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div class="flex items-start gap-2">
                                <UIcon name="lucide:info"
                                    class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div class="text-sm text-yellow-700 dark:text-yellow-300">
                                    <p class="font-medium mb-1">{{
                                        t('settings.domains.ssl.providers.letsencrypt.note.title') }}</p>
                                    <p>{{ t('settings.domains.ssl.providers.letsencrypt.note.message') }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Commercial SSL -->
                <template #commercial>
                    <div class="space-y-4">
                        <div class="flex items-center gap-3 mb-4">
                            <UIcon name="lucide:shield-check" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            <h4 class="text-md font-medium text-gray-900 dark:text-white">
                                {{ t('settings.domains.ssl.providers.commercial.title') }}
                            </h4>
                            <UBadge color="warning" variant="soft" size="sm">
                                {{ t('settings.domains.ssl.providers.paid') }}
                            </UBadge>
                        </div>

                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            {{ t('settings.domains.ssl.providers.commercial.description') }}
                        </p>

                        <!-- Provider Comparison -->
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead>
                                    <tr class="border-b border-gray-200 dark:border-gray-700">
                                        <th class="text-left py-2 text-gray-700 dark:text-gray-300">Provider</th>
                                        <th class="text-left py-2 text-gray-700 dark:text-gray-300">Price Range</th>
                                        <th class="text-left py-2 text-gray-700 dark:text-gray-300">Features</th>
                                    </tr>
                                </thead>
                                <tbody class="text-gray-600 dark:text-gray-400">
                                    <tr class="border-b border-gray-200 dark:border-gray-700">
                                        <td class="py-2">DigiCert</td>
                                        <td class="py-2">$175-$595/year</td>
                                        <td class="py-2">EV certificates, warranty, support</td>
                                    </tr>
                                    <tr class="border-b border-gray-200 dark:border-gray-700">
                                        <td class="py-2">Sectigo</td>
                                        <td class="py-2">$36-$199/year</td>
                                        <td class="py-2">DV, OV, EV options, good support</td>
                                    </tr>
                                    <tr>
                                        <td class="py-2">GlobalSign</td>
                                        <td class="py-2">$249-$649/year</td>
                                        <td class="py-2">Enterprise features, high trust</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>
            </UTabs>

            <!-- General Requirements -->
            <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                    {{ t('settings.domains.ssl.requirements.title') }}
                </h4>
                <ul class="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li class="flex items-start gap-2">
                        <UIcon name="lucide:check" class="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{{ t('settings.domains.ssl.requirements.dns') }}</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <UIcon name="lucide:check" class="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{{ t('settings.domains.ssl.requirements.verification') }}</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <UIcon name="lucide:check" class="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{{ t('settings.domains.ssl.requirements.https') }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    domain: any
}>()

const { t } = useI18n()
const toast = useToast()

// State
const showGuide = ref(false)
const selectedProvider = ref('cloudflare')
const isCheckingSSL = ref(false)
const sslInfo = ref<any>(null)

// SSL Status
const sslStatus = computed(() => {
    if (!sslInfo.value) return 'unknown'

    const now = new Date()
    const expiresAt = new Date(sslInfo.value.expiresAt)
    const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return 'expired'
    if (daysLeft < 30) return 'expiring'
    return 'valid'
})

const sslStatusIcon = computed(() => {
    switch (sslStatus.value) {
        case 'valid': return 'lucide:shield-check'
        case 'expiring': return 'lucide:alert-triangle'
        case 'expired': return 'lucide:shield-x'
        default: return 'lucide:shield-question'
    }
})

const sslStatusColor = computed(() => {
    switch (sslStatus.value) {
        case 'valid': return 'text-green-500'
        case 'expiring': return 'text-yellow-500'
        case 'expired': return 'text-red-500'
        default: return 'text-gray-500'
    }
})

const sslBadgeColor = computed(() => {
    switch (sslStatus.value) {
        case 'valid': return 'green'
        case 'expiring': return 'yellow'
        case 'expired': return 'red'
        default: return 'gray'
    }
})

const sslStatusText = computed(() => {
    return t(`settings.domains.ssl.status.${sslStatus.value}`)
})

const daysUntilExpiry = computed(() => {
    if (!sslInfo.value?.expiresAt) return 0
    const now = new Date()
    const expiresAt = new Date(sslInfo.value.expiresAt)
    return Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
})

const showExpirationWarning = computed(() => {
    return sslStatus.value === 'expiring' && daysUntilExpiry.value <= 30
})

// SSL Providers
const sslProviders = computed(() => [
    { key: 'cloudflare', label: 'Cloudflare', icon: 'lucide:cloud' },
    { key: 'letsencrypt', label: "Let's Encrypt", icon: 'lucide:lock' },
    { key: 'commercial', label: 'Commercial SSL', icon: 'lucide:shield-check' }
])

// Provider-specific content
const cloudflareSteps = computed(() => [
    t('settings.domains.ssl.providers.cloudflare.steps.signup'),
    t('settings.domains.ssl.providers.cloudflare.steps.addDomain'),
    t('settings.domains.ssl.providers.cloudflare.steps.updateNameservers'),
    t('settings.domains.ssl.providers.cloudflare.steps.configureDNS'),
    t('settings.domains.ssl.providers.cloudflare.steps.enableSSL'),
])

const letsencryptCommands = `# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d ${props.domain.domain}

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -`

// Methods
const checkSSL = async () => {
    isCheckingSSL.value = true

    try {
        const response = await $fetch(`/api/ssl-check/${props.domain.domain}`)
        sslInfo.value = response.ssl

        toast.add({
            title: t('success'),
            description: t('settings.domains.ssl.checkComplete'),
            color: 'success'
        })
    } catch (error: any) {
        toast.add({
            title: t('error.checkFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'error'
        })
    } finally {
        isCheckingSSL.value = false
    }
}

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text)
        toast.add({
            title: t('copied'),
            description: t('settings.domains.ssl.commandsCopied'),
            color: 'success'
        })
    } catch (error) {
        console.error('Failed to copy to clipboard:', error)
    }
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Initialize SSL check on mount
onMounted(() => {
    if (props.domain.verified && props.domain.active) {
        checkSSL()
    }
})
</script>
