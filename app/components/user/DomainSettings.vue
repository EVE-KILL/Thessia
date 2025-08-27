<template>
    <div class="domain-settings space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ t('settings.domains.title') }}
                </h2>
                <p class="text-gray-600 dark:text-gray-400 mt-1">
                    {{ t('settings.domains.description') }}
                </p>
            </div>
            <button @click="showCreateModal = true" :disabled="isLoadingDomains"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors">
                <UIcon name="lucide:plus" class="h-4 w-4" />
                {{ t('settings.domains.addDomain') }}
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingDomains" class="flex items-center justify-center py-12">
            <div class="text-center">
                <UIcon name="lucide:loader-2" class="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p class="text-gray-600 dark:text-gray-400">{{ t('loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="domainsError" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div class="flex">
                <UIcon name="lucide:alert-circle" class="h-5 w-5 text-red-400" />
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                        {{ t('error.loadingFailed') }}
                    </h3>
                    <div class="mt-1 text-sm text-red-700 dark:text-red-300">
                        {{ domainsError }}
                    </div>
                </div>
            </div>
        </div>

        <!-- No Domains State -->
        <div v-else-if="!domains || domains.length === 0" class="text-center py-12">
            <UIcon name="lucide:globe" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ t('settings.domains.noDomains') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                {{ t('settings.domains.noDomainsDescription') }}
            </p>
            <button @click="showCreateModal = true"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                <UIcon name="lucide:plus" class="h-4 w-4" />
                {{ t('settings.domains.addFirstDomain') }}
            </button>
        </div>

        <!-- Domains List -->
        <div v-else class="space-y-4">
            <DomainCard v-for="domain in domains" :key="domain.domain_id" :domain="domain" @edit="editDomain"
                @delete="deleteDomain" @verify="verifyDomain" @toggle-status="toggleDomainStatus" />
        </div>

        <!-- Create Domain Modal -->
        <Modal :is-open="showCreateModal" :title="t('settings.domains.createDomain')" size="2xl"
            @close="showCreateModal = false">
            <CreateDomainForm @created="handleDomainCreated" @cancel="showCreateModal = false" />
        </Modal>

        <!-- Edit Domain Modal -->
        <Modal :is-open="showEditModal" :title="t('settings.domains.editDomain')" size="2xl"
            @close="showEditModal = false">
            <EditDomainForm v-if="editingDomain" :domain="editingDomain" @updated="handleDomainUpdated"
                @cancel="showEditModal = false" />
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal :is-open="showDeleteModal" :title="t('settings.domains.deleteDomain')" size="md"
            @close="showDeleteModal = false">
            <div class="space-y-4">
                <p class="text-gray-900 dark:text-gray-100">
                    {{ t('settings.domains.deleteConfirmation', { domain: deletingDomain?.domain }) }}
                </p>
                <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div class="flex">
                        <UIcon name="lucide:alert-triangle" class="h-5 w-5 text-red-400" />
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                                {{ t('warning') }}
                            </h3>
                            <div class="mt-1 text-sm text-red-700 dark:text-red-300">
                                {{ t('settings.domains.deleteWarning') }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <button @click="showDeleteModal = false" :disabled="isDeleting"
                        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                        {{ t('cancel') }}
                    </button>
                    <button @click="confirmDelete" :disabled="isDeleting"
                        class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-md transition-colors">
                        <UIcon v-if="isDeleting" name="lucide:loader-2" class="animate-spin -ml-1 mr-2 h-4 w-4" />
                        {{ t('delete') }}
                    </button>
                </div>
            </template>
        </Modal>

        <!-- Verification Modal -->
        <Modal :is-open="showVerificationModal" :title="t('settings.domains.verifyDomain')" size="3xl"
            @close="showVerificationModal = false">
            <DomainVerification v-if="verifyingDomain" :domain="verifyingDomain" @verified="handleDomainVerified"
                @cancel="showVerificationModal = false" />
        </Modal>
    </div>
</template>

<script setup lang="ts">
import Modal from '~/components/common/Modal.vue';

const { t } = useI18n();
const toast = useToast();

// State
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showVerificationModal = ref(false);
const editingDomain = ref(null);
const deletingDomain = ref(null);
const verifyingDomain = ref(null);
const isDeleting = ref(false);

// Fetch domains
const {
    data: domainsData,
    pending: isLoadingDomains,
    error: domainsError,
    refresh: refreshDomains
} = await useFetch('/api/user/domains', {
    default: () => ({ domains: [], total: 0 })
});

const domains = computed(() => domainsData.value?.domains || []);

// Handlers
const editDomain = (domain: any) => {
    editingDomain.value = domain;
    showEditModal.value = true;
};

const deleteDomain = (domain: any) => {
    deletingDomain.value = domain;
    showDeleteModal.value = true;
};

const verifyDomain = (domain: any) => {
    verifyingDomain.value = domain;
    showVerificationModal.value = true;
};

const toggleDomainStatus = async (domain: any) => {
    try {
        await $fetch(`/api/user/domains/${domain.domain_id}/toggle`, {
            method: 'POST'
        });

        toast.add({
            title: t('success'),
            description: t('settings.domains.statusUpdated'),
            color: 'success'
        });

        await refreshDomains();
    } catch (error: any) {
        toast.add({
            title: t('error.updateFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'error'
        });
    }
};

const handleDomainCreated = async (domain: any) => {
    showCreateModal.value = false;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainCreated'),
        color: 'success'
    });

    await refreshDomains();

    // Show verification modal for new domain
    verifyingDomain.value = domain;
    showVerificationModal.value = true;
};

const handleDomainUpdated = async () => {
    showEditModal.value = false;
    editingDomain.value = null;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainUpdated'),
        color: 'success'
    });

    await refreshDomains();
};

const handleDomainVerified = async () => {
    showVerificationModal.value = false;
    verifyingDomain.value = null;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainVerified'),
        color: 'success'
    });

    await refreshDomains();
};

const confirmDelete = async () => {
    if (!deletingDomain.value) return;

    isDeleting.value = true;

    try {
        await $fetch(`/api/user/domains/${deletingDomain.value.domain_id}`, {
            method: 'DELETE'
        });

        toast.add({
            title: t('success'),
            description: t('settings.domains.domainDeleted'),
            color: 'success'
        });

        showDeleteModal.value = false;
        deletingDomain.value = null;
        await refreshDomains();
    } catch (error: any) {
        toast.add({
            title: t('error.deleteFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'error'
        });
    } finally {
        isDeleting.value = false;
    }
};
</script>

<style scoped>
.domain-settings {
    max-width: 4xl;
}
</style>
