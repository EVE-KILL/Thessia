<template>
    <div class="space-y-6">
        <!-- Setup Guide Header -->
        <div
            class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {{ t('settings.domains.verification.setupGuide') }}
            </h3>
            <p class="text-sm text-blue-700 dark:text-blue-300">
                Follow these steps to configure your domain for use with EVE-KILL. We strongly recommend using
                Cloudflare for optimal performance and security.
            </p>
        </div>

        <!-- Step 1: DNS TXT Record -->
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <div
                    class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                </div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {{ t('settings.domains.verification.step1') }}
                </h4>
            </div>

            <div
                class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 ml-10">
                <p class="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    {{ t('settings.domains.verification.dnsDescription') }}
                </p>

                <div class="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-sm">
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">{{
                                t('settings.domains.verification.dnsName') }}:</strong><br>
                            <code class="text-blue-600 dark:text-blue-400">_evekill-verification</code>
                        </div>
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">Type:</strong><br>
                            <code class="text-blue-600 dark:text-blue-400">TXT</code>
                        </div>
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">{{
                                t('settings.domains.verification.dnsValue') }}:</strong><br>
                            <code class="text-blue-600 dark:text-blue-400 break-all">{{ verificationToken }}</code>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 mt-3">
                    <button @click="copyDnsRecord"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                        {{ t('settings.domains.verification.copyRecord') }}
                    </button>
                    <button @click="verifyDns" :disabled="isVerifying"
                        class="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors">
                        <UIcon v-if="isVerifying" name="lucide:loader-2" class="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Verify DNS
                    </button>
                </div>
            </div>
        </div>

        <!-- Step 2: CNAME Configuration -->
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <div
                    class="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                </div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {{ t('settings.domains.verification.step2') }}
                </h4>
            </div>

            <div
                class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 ml-10">
                <h5 class="font-medium mb-2 text-indigo-900 dark:text-indigo-100">
                    {{ t('settings.domains.verification.cnameTitle') }}
                </h5>
                <p class="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                    {{ t('settings.domains.verification.cnameDescription') }}
                </p>

                <div class="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-sm">
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">Name:</strong><br>
                            <code class="text-indigo-600 dark:text-indigo-400">{{ props.domain.domain }}</code>
                        </div>
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">Type:</strong><br>
                            <code class="text-indigo-600 dark:text-indigo-400">CNAME</code>
                        </div>
                        <div>
                            <strong class="text-gray-900 dark:text-gray-100">{{
                                t('settings.domains.verification.cnameTarget') }}:</strong><br>
                            <code class="text-indigo-600 dark:text-indigo-400">c.eve-kill.com</code>
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <button @click="copyCnameRecord"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                        {{ t('settings.domains.verification.copyCname') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Step 3: Cloudflare Configuration (Recommended) -->
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <div
                    class="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                </div>
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {{ t('settings.domains.verification.step3') }}
                </h4>
                <div
                    class="bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs font-medium">
                    RECOMMENDED
                </div>
            </div>

            <div
                class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 ml-10">
                <h5 class="font-medium mb-2 text-orange-900 dark:text-orange-100">
                    {{ t('settings.domains.verification.cloudflareTitle') }}
                </h5>
                <p class="text-sm text-orange-700 dark:text-orange-300 mb-4">
                    {{ t('settings.domains.verification.cloudflareDescription') }}
                </p>

                <div class="mb-4">
                    <h6 class="font-medium text-orange-900 dark:text-orange-100 mb-2">
                        {{ t('settings.domains.verification.cloudflareSteps') }}:
                    </h6>
                    <ol class="list-decimal list-inside space-y-1 text-sm text-orange-700 dark:text-orange-300">
                        <li>{{ t('settings.domains.verification.cloudflareStep1') }}</li>
                        <li>{{ t('settings.domains.verification.cloudflareStep2') }}</li>
                        <li>{{ t('settings.domains.verification.cloudflareStep3') }}</li>
                        <li>{{ t('settings.domains.verification.cloudflareStep4') }}</li>
                    </ol>
                </div>

                <div class="bg-orange-100 dark:bg-orange-800/20 p-3 rounded border-l-4 border-orange-400">
                    <div class="flex items-start">
                        <UIcon name="lucide:alert-triangle" class="h-5 w-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                        <p class="text-sm font-medium text-orange-800 dark:text-orange-200">
                            {{ t('settings.domains.verification.cloudflareWarning') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Verification Status -->
        <div v-if="verificationResult" class="mt-4">
            <div :class="[
                'rounded-md p-4',
                verificationResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            ]">
                <div class="flex">
                    <UIcon :name="verificationResult.success ? 'lucide:check-circle' : 'lucide:x-circle'" :class="[
                        'h-5 w-5',
                        verificationResult.success ? 'text-green-400' : 'text-red-400'
                    ]" />
                    <div class="ml-3">
                        <h3 :class="[
                            'text-sm font-medium',
                            verificationResult.success
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-red-800 dark:text-red-200'
                        ]">
                            {{ verificationResult.success ? 'Verification Successful' : 'Verification Failed' }}
                        </h3>
                        <div :class="[
                            'mt-1 text-sm',
                            verificationResult.success
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                        ]">
                            {{ verificationResult.message }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button v-if="verificationResult?.success" @click="$emit('verified')"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                Continue
            </button>
            <button @click="$emit('cancel')"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                {{ verificationResult?.success ? 'Close' : 'Cancel' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
    domain: any
}>()

const emit = defineEmits<{
    verified: []
    cancel: []
}>()

const isVerifying = ref(false)
const verificationResult = ref<{ success: boolean; message: string } | null>(null)

// Use the actual verification token from the domain object
const verificationToken = computed(() => {
    return props.domain.verification_token || 'No token available'
})

const copyDnsRecord = async () => {
    const record = `_evekill-verification IN TXT "${verificationToken.value}"`
    await navigator.clipboard.writeText(record)
    // Show toast notification
}

const copyCnameRecord = async () => {
    const record = `${props.domain.domain} IN CNAME c.eve-kill.com`
    await navigator.clipboard.writeText(record)
    // Show toast notification
}

const verifyDns = async () => {
    await performVerification('dns')
}

const performVerification = async (method: string) => {
    isVerifying.value = true
    verificationResult.value = null

    try {
        const response = await $fetch(`/api/user/domains/${props.domain.domain_id}`, {
            method: 'POST',
            body: {
                method,
                token: verificationToken.value
            }
        }) as { verified: boolean; message?: string }

        verificationResult.value = {
            success: response.verified,
            message: response.message || (response.verified ? 'Domain successfully verified!' : 'Verification failed.')
        }

    } catch (error: any) {
        verificationResult.value = {
            success: false,
            message: error.data?.message || 'Failed to verify domain. Please try again.'
        }
    } finally {
        isVerifying.value = false
    }
}
</script>
