<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                {{ t('settings.domains.verification.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
                {{ t('settings.domains.verification.description') }}
            </p>
        </div>

        <Tabs v-model="selectedMethod" :items="verificationMethods" class="w-full">
            <!-- DNS TXT Record -->
            <template #dns>
                <div class="space-y-4">
                    <div
                        class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 class="font-medium mb-2 text-blue-900 dark:text-blue-100">
                            {{ t('settings.domains.verification.dnsTitle') }}
                        </h4>
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
                                    <code
                                        class="text-blue-600 dark:text-blue-400 break-all">{{ verificationToken }}</code>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-3">
                            <button @click="copyDnsRecord"
                                class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                                Copy Record
                            </button>
                            <button @click="verifyDns" :disabled="isVerifying"
                                class="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors">
                                <UIcon v-if="isVerifying" name="lucide:loader-2"
                                    class="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Verify DNS
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Meta Tag -->
            <template #meta>
                <div class="space-y-4">
                    <div
                        class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 class="font-medium mb-2 text-green-900 dark:text-green-100">
                            {{ t('settings.domains.verification.metaTitle') }}
                        </h4>
                        <p class="text-sm text-green-700 dark:text-green-300 mb-3">
                            {{ t('settings.domains.verification.metaDescription') }}
                        </p>

                        <div class="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-sm overflow-x-auto">
                            <code
                                class="text-green-600 dark:text-green-400">&lt;meta name="evekill-verification" content="{{ verificationToken }}" /&gt;</code>
                        </div>

                        <div class="flex gap-2 mt-3">
                            <button @click="copyMetaTag"
                                class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                                Copy Meta Tag
                            </button>
                            <button @click="verifyMeta" :disabled="isVerifying"
                                class="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-md transition-colors">
                                <UIcon v-if="isVerifying" name="lucide:loader-2"
                                    class="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Verify Meta Tag
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- File Upload -->
            <template #file>
                <div class="space-y-4">
                    <div
                        class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 class="font-medium mb-2 text-purple-900 dark:text-purple-100">
                            {{ t('settings.domains.verification.fileTitle') }}
                        </h4>
                        <p class="text-sm text-purple-700 dark:text-purple-300 mb-3">
                            {{ t('settings.domains.verification.fileDescription') }}
                        </p>

                        <div class="space-y-3">
                            <div>
                                <strong class="text-purple-900 dark:text-purple-100">{{
                                    t('settings.domains.verification.fileName') }}:</strong>
                                <div class="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-sm mt-1">
                                    <code class="text-purple-600 dark:text-purple-400">evekill-verification.txt</code>
                                </div>
                            </div>

                            <div>
                                <strong class="text-purple-900 dark:text-purple-100">{{
                                    t('settings.domains.verification.fileContent') }}:</strong>
                                <div class="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-sm mt-1">
                                    <code
                                        class="text-purple-600 dark:text-purple-400 break-all">{{ verificationToken }}</code>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-3">
                            <button @click="downloadVerificationFile"
                                class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                                Download File
                            </button>
                            <button @click="verifyFile" :disabled="isVerifying"
                                class="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-md transition-colors">
                                <UIcon v-if="isVerifying" name="lucide:loader-2"
                                    class="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Verify File
                            </button>
                        </div>

                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            The file should be accessible at: https://{{ domain.domain }}/evekill-verification.txt
                        </p>
                    </div>
                </div>
            </template>
        </Tabs>

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

const selectedMethod = ref('dns')
const isVerifying = ref(false)
const verificationResult = ref<{ success: boolean; message: string } | null>(null)

const verificationMethods = [
    { id: 'dns', label: t('settings.domains.verification.dns'), slot: 'dns' },
    { id: 'meta', label: t('settings.domains.verification.meta'), slot: 'meta' },
    { id: 'file', label: t('settings.domains.verification.file'), slot: 'file' }
]

// Generate a consistent verification token based on domain
const verificationToken = computed(() => {
    const domainId = props.domain.domain_id || props.domain.domain
    // Use a hash of the domain ID to create a consistent token
    const hash = btoa(domainId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase()
    return `evekill-${domainId}-${hash}`
})

const copyDnsRecord = async () => {
    const record = `_evekill-verification IN TXT "${verificationToken.value}"`
    await navigator.clipboard.writeText(record)
    // Show toast notification
}

const copyMetaTag = async () => {
    const metaTag = `<meta name="evekill-verification" content="${verificationToken.value}" />`
    await navigator.clipboard.writeText(metaTag)
    // Show toast notification
}

const downloadVerificationFile = () => {
    const content = verificationToken.value
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'evekill-verification.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const verifyDns = async () => {
    await performVerification('dns')
}

const verifyMeta = async () => {
    await performVerification('meta')
}

const verifyFile = async () => {
    await performVerification('file')
}

const performVerification = async (method: string) => {
    isVerifying.value = true
    verificationResult.value = null

    try {
        const response = await $fetch(`/api/user/domains/${props.domain.domain_id}/verify`, {
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
