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
                <!-- PHASE 2: Usage Status -->
                <div v-if="domainsData?.usage" class="mt-2 flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 text-blue-600" />
                        <span class="text-gray-600 dark:text-gray-400">
                            {{ domainsData.usage.domains_count }} / {{ domainsData.usage.domains_limit }} domains used
                        </span>
                    </div>
                    <div v-if="domainsData.usage.domains_count >= domainsData.usage.domains_limit"
                        class="text-orange-600 dark:text-orange-400 text-xs">
                        Domain limit reached
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <UButton @click="showCreateModal = true" :disabled="isLoadingDomains || isAtDomainLimit" color="primary"
                    size="sm">
                    <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
                    {{ t('settings.domains.addDomain') }}
                </UButton>
            </div>
        </div>

        <!-- PHASE 2: Multi-Entity Info -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
                <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Multi-Entity Custom Domains
                    </h3>
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        Create powerful custom domains showcasing multiple characters, corporations, and alliances with
                        advanced branding and configuration options.
                    </p>
                    <div class="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300">
                        <div>• Up to 10 mixed entities per domain (characters, corps, alliances)</div>
                        <div>• Advanced branding with banner images and custom CSS</div>
                        <div>• Flexible component selection and page layouts</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingDomains" class="flex items-center justify-center py-12">
            <div class="text-center">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p class="text-gray-600 dark:text-gray-400">{{ t('loading') }}</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="domainsError" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div class="flex">
                <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
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
            <UIcon name="i-heroicons-globe-alt" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {{ t('settings.domains.noDomains') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                {{ t('settings.domains.noDomainsDescription') }}
            </p>
            <UButton @click="showCreateModal = true" :disabled="isAtDomainLimit" color="primary">
                <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-2" />
                {{ t('settings.domains.addFirstDomain') }}
            </UButton>
        </div>

        <!-- Domains List -->
        <div v-else class="space-y-4">
            <DomainCard v-for="domain in domains" :key="domain.domain_id" :domain="domain" @edit="editDomain"
                @delete="deleteDomain" @verify="verifyDomain" @toggle-status="toggleDomainStatus"
                @manage-entities="manageEntities" />
        </div>

        <!-- PHASE 2: Create Domain Modal -->
        <Modal :is-open="showCreateModal" title="Create Multi-Entity Domain" size="2xl"
            @close="showCreateModal = false">
            <CreateDomainForm @created="handleDomainCreated" @cancel="showCreateModal = false" />
        </Modal>

        <!-- Edit Domain Modal -->
        <Modal :is-open="showEditModal" title="Edit Domain" size="2xl" @close="showEditModal = false">
            <EditDomainForm v-if="editingDomain" :domain="editingDomain" @updated="handleDomainUpdated"
                @cancel="showEditModal = false" />
        </Modal>

        <!-- PHASE 2: Manage Entities Modal -->
        <Modal :is-open="showManageEntitiesModal" :title="t('settings.domains.manageEntities')" size="3xl"
            @close="showManageEntitiesModal = false">
            <ManageEntitiesForm v-if="managingDomain" :domain="managingDomain" @updated="handleEntitiesUpdated"
                @cancel="showManageEntitiesModal = false" />
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
                        <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
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
                    <UButton variant="outline" @click="showDeleteModal = false" :disabled="isDeleting">
                        {{ t('cancel') }}
                    </UButton>
                    <UButton color="red" @click="confirmDelete" :disabled="isDeleting">
                        <UIcon v-if="isDeleting" name="i-heroicons-arrow-path" class="animate-spin w-4 h-4 mr-2" />
                        {{ t('delete') }}
                    </UButton>
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

// PHASE 2: Multi-entity mode is always enabled

// State
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showVerificationModal = ref(false);
const showManageEntitiesModal = ref(false); // PHASE 2: New modal for entity management
const editingDomain = ref(null);
const deletingDomain = ref(null);
const verifyingDomain = ref(null);
const managingDomain = ref(null); // PHASE 2: Domain for entity management
const isDeleting = ref(false);

// Fetch domains
const {
    data: domainsData,
    pending: isLoadingDomains,
    error: domainsError,
    refresh: refreshDomains
} = await useFetch('/api/user/domains', {
    default: () => ({ domains: [], total: 0, usage: { domains_count: 0, domains_limit: 10 } })
});

// Computed properties
const domains = computed(() => domainsData.value?.domains || []);

const isAtDomainLimit = computed(() => {
    const usage = domainsData.value?.usage;
    return usage ? usage.domains_count >= usage.domains_limit : false;
});

// Removed createModalTitle - now using static title

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

// PHASE 2: New handler for entity management
const manageEntities = (domain: any) => {
    managingDomain.value = domain;
    showManageEntitiesModal.value = true;
};

const toggleDomainStatus = async (domain: any) => {
    try {
        await $fetch(`/api/user/domains/${domain.domain_id}/toggle`, {
            method: 'POST'
        });

        toast.add({
            title: t('success'),
            description: t('settings.domains.statusUpdated'),
            color: 'green'
        });

        await refreshDomains();
    } catch (error: any) {
        toast.add({
            title: t('error.updateFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    }
};

const handleDomainCreated = async (domain: any) => {
    showCreateModal.value = false;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainCreated'),
        color: 'green'
    });

    await refreshDomains();

    // Show verification modal for new domain
    verifyingDomain.value = domain;
    showVerificationModal.value = true;
};

const handleDomainUpdated = async () => {
    showEditModal.value = false;
    const domain = editingDomain.value?.domain;
    editingDomain.value = null;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainUpdated'),
        color: 'green'
    });

    // Trigger comprehensive cache invalidation for the domain
    if (domain) {
        const { invalidateDomainAfterSettingsChange } = useDomainCacheInvalidation();
        await invalidateDomainAfterSettingsChange(domain);
    }

    await refreshDomains();
};

// PHASE 2: New handler for entity updates
const handleEntitiesUpdated = async () => {
    showManageEntitiesModal.value = false;
    const domain = managingDomain.value?.domain;
    managingDomain.value = null;

    toast.add({
        title: t('success'),
        description: t('settings.domains.entitiesUpdated'),
        color: 'green'
    });

    // Trigger comprehensive cache invalidation for the domain
    if (domain) {
        const { invalidateDomainAfterEntityChange } = useDomainCacheInvalidation();
        await invalidateDomainAfterEntityChange(domain);
    }

    await refreshDomains();
};

const handleDomainVerified = async () => {
    showVerificationModal.value = false;
    verifyingDomain.value = null;

    toast.add({
        title: t('success'),
        description: t('settings.domains.domainVerified'),
        color: 'green'
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
            color: 'green'
        });

        showDeleteModal.value = false;
        deletingDomain.value = null;
        await refreshDomains();
    } catch (error: any) {
        toast.add({
            title: t('error.deleteFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    } finally {
        isDeleting.value = false;
    }
};

// PHASE 2: Multi-entity mode is always enabled - no need for preference storage
</script>

<style scoped>
.domain-settings {
    max-width: 6xl;
}
</style>
