<template>
    <div class="space-y-6">
        <!-- Current Entities -->
        <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {{ t('settings.domains.manageEntities.currentEntities') }}
            </h3>

            <div v-if="entities.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                {{ t('settings.domains.manageEntities.noEntities') }}
            </div>

            <div v-else class="space-y-3">
                <div v-for="(entity, index) in entities"
                    :key="`${entity._config.entity_type}-${entity._config.entity_id}`"
                    class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex items-center gap-3">
                        <Image :type="entity._config.entity_type" :id="entity._config.entity_id" :size="32" />
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">
                                {{ getEntityDisplayName(entity) }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {{ entity._config.entity_type }}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-4">
                            <UBadge v-if="entity._config.primary" color="blue" size="xs">
                                {{ t('settings.domains.manageEntities.primary') }}
                            </UBadge>
                            <UBadge v-if="entity._config.show_in_nav" color="green" size="xs">
                                {{ t('settings.domains.manageEntities.inNav') }}
                            </UBadge>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Primary Entity Toggle -->
                        <UButton v-if="!entity._config.primary" @click="setPrimaryEntity(index)" variant="outline"
                            size="xs">
                            {{ t('settings.domains.manageEntities.makePrimary') }}
                        </UButton>

                        <!-- Navigation Toggle -->
                        <UToggle v-model="entity._config.show_in_nav"
                            @update:model-value="updateEntityConfig(index, 'show_in_nav', $event)" size="sm" />

                        <!-- Remove Entity -->
                        <UButton v-if="entities.length > 1" @click="removeEntity(index)" color="red" variant="outline"
                            size="xs" icon="i-heroicons-trash">
                            {{ t('remove') }}
                        </UButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add New Entity -->
        <div v-if="entities.length < 10" class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {{ t('settings.domains.manageEntities.addEntity') }}
            </h3>

            <div class="space-y-4">
                <Search v-model="entitySearchQuery" :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
                    :transform-response="(data) => data?.hits?.filter(hit => ['character', 'corporation', 'alliance'].includes(hit.type)) || []"
                    :result-name="(result) => formatSearchResultDisplayName(result)" :min-length="2"
                    :placeholder="t('settings.domains.form.entitySearchPlaceholder')"
                    input-class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    dropdown-class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
                    @select="selectEntityToAdd">

                    <template #results="{ results, selectResult }">
                        <a v-for="result in results" :key="result.id" @click="selectResult(result)"
                            class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                            <div class="flex-shrink-0 mr-3">
                                <Image :type="result.type" :id="result.id" :size="24" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium truncate">{{ formatSearchResultDisplayName(result) }}</div>
                                <div class="text-xs text-gray-500 truncate capitalize">{{ result.type }}</div>
                            </div>
                        </a>
                    </template>

                    <template #loading>
                        <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {{ t('search.searching') }}...
                        </div>
                    </template>

                    <template #no-results>
                        <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {{ t('search.noResults') }}
                        </div>
                    </template>
                </Search>

                <!-- Selected Entity to Add -->
                <div v-if="selectedEntityToAdd"
                    class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <Image :type="selectedEntityToAdd.type" :id="selectedEntityToAdd.id" :size="32" />
                            <div>
                                <div class="font-medium text-blue-900 dark:text-blue-100">
                                    {{ formatSearchResultDisplayName(selectedEntityToAdd) }}
                                </div>
                                <div class="text-sm text-blue-700 dark:text-blue-300 capitalize">
                                    {{ selectedEntityToAdd.type }}
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="flex items-center gap-1">
                                <UCheckbox v-model="newEntityConfig.show_in_nav" size="sm" />
                                <span class="text-xs text-gray-600 dark:text-gray-400">
                                    {{ t('settings.domains.manageEntities.showInNav') }}
                                </span>
                            </div>

                            <UButton @click="addEntity" :disabled="isAddingEntity" color="blue" size="xs">
                                <UIcon v-if="isAddingEntity" name="i-heroicons-arrow-path"
                                    class="animate-spin w-3 h-3 mr-1" />
                                {{ t('settings.domains.manageEntities.add') }}
                            </UButton>

                            <button type="button" @click="clearSelectedEntityToAdd"
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Entity Limit Warning -->
        <div v-else class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div
                class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                        <h3 class="font-medium text-orange-900 dark:text-orange-100 mb-1">
                            {{ t('settings.domains.manageEntities.limitReached') }}
                        </h3>
                        <p class="text-sm text-orange-800 dark:text-orange-200">
                            {{ t('settings.domains.manageEntities.limitReachedDescription') }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton variant="outline" @click="$emit('cancel')" :disabled="isSaving">
                {{ t('cancel') }}
            </UButton>
            <UButton @click="saveChanges" :disabled="isSaving" color="primary">
                <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="animate-spin w-4 h-4 mr-2" />
                {{ t('settings.domains.manageEntities.saveChanges') }}
            </UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();

interface Props {
    domain: any;
}

interface Emits {
    (e: 'updated'): void;
    (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const entities = ref<any[]>([]);
const entitySearchQuery = ref('');
const selectedEntityToAdd = ref<any>(null);
const newEntityConfig = ref({
    show_in_nav: true
});
const isAddingEntity = ref(false);
const isSaving = ref(false);
const hasChanges = ref(false);

// Initialize entities from domain data
onMounted(() => {
    if (props.domain.entities_info) {
        entities.value = [...props.domain.entities_info];
    } else if (props.domain.entity_info) {
        // Convert single entity to multi-entity format
        entities.value = [{
            ...props.domain.entity_info,
            _config: {
                entity_type: props.domain.entity_type,
                entity_id: props.domain.entity_id,
                primary: true,
                show_in_nav: true
            }
        }];
    }
});

// Helper functions
const formatSearchResultDisplayName = (result: any) => {
    let displayName = result.name;
    if (result.ticker && (result.type === 'alliance' || result.type === 'corporation')) {
        displayName = `${result.name} [${result.ticker}]`;
    }
    return displayName;
};

const getEntityDisplayName = (entity: any) => {
    let displayName = entity.name || 'Unknown Entity';
    if (entity.ticker && (entity._config.entity_type === 'alliance' || entity._config.entity_type === 'corporation')) {
        displayName = `${displayName} [${entity.ticker}]`;
    }
    return displayName;
};

const selectEntityToAdd = (result: any) => {
    // Check if entity is already added
    const existingEntity = entities.value.find(e =>
        e._config.entity_type === result.type && e._config.entity_id === result.id
    );

    if (existingEntity) {
        toast.add({
            title: t('error.entityAlreadyAdded'),
            description: t('error.entityAlreadyAddedDescription'),
            color: 'orange'
        });
        return;
    }

    selectedEntityToAdd.value = result;
    entitySearchQuery.value = '';
};

const clearSelectedEntityToAdd = () => {
    selectedEntityToAdd.value = null;
    entitySearchQuery.value = '';
    newEntityConfig.value = { show_in_nav: true };
};

const addEntity = async () => {
    if (!selectedEntityToAdd.value) return;

    isAddingEntity.value = true;

    try {
        await $fetch(`/api/user/domains/${props.domain.domain_id}/entities`, {
            method: 'POST',
            body: {
                entity_type: selectedEntityToAdd.value.type,
                entity_id: selectedEntityToAdd.value.id,
                show_in_nav: newEntityConfig.value.show_in_nav
            }
        });

        // Add to local entities list
        entities.value.push({
            ...selectedEntityToAdd.value,
            name: selectedEntityToAdd.value.name,
            ticker: selectedEntityToAdd.value.ticker,
            _config: {
                entity_type: selectedEntityToAdd.value.type,
                entity_id: selectedEntityToAdd.value.id,
                primary: false,
                show_in_nav: newEntityConfig.value.show_in_nav
            }
        });

        hasChanges.value = true;
        clearSelectedEntityToAdd();

        toast.add({
            title: t('success'),
            description: t('settings.domains.manageEntities.entityAdded'),
            color: 'green'
        });
    } catch (error: any) {
        toast.add({
            title: t('error.addEntityFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    } finally {
        isAddingEntity.value = false;
    }
};

const removeEntity = async (index: number) => {
    const entity = entities.value[index];

    try {
        await $fetch(`/api/user/domains/${props.domain.domain_id}/entities?entity_type=${entity._config.entity_type}&entity_id=${entity._config.entity_id}`, {
            method: 'DELETE'
        });

        entities.value.splice(index, 1);
        hasChanges.value = true;

        toast.add({
            title: t('success'),
            description: t('settings.domains.manageEntities.entityRemoved'),
            color: 'green'
        });
    } catch (error: any) {
        toast.add({
            title: t('error.removeEntityFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    }
};

const setPrimaryEntity = async (index: number) => {
    const oldPrimaryIndex = entities.value.findIndex(e => e._config.primary);

    try {
        // Update via API
        const entity = entities.value[index];
        await $fetch(`/api/user/domains/${props.domain.domain_id}/entities/${entity._config.entity_type}/${entity._config.entity_id}`, {
            method: 'PATCH',
            body: {
                primary: true
            }
        });

        // Update locally after successful API call
        entities.value.forEach(e => {
            e._config.primary = false;
        });
        entities.value[index]._config.primary = true;
        hasChanges.value = true;

        toast.add({
            title: t('success'),
            description: 'Primary entity updated successfully',
            color: 'green'
        });
    } catch (error: any) {
        // Revert changes on error
        entities.value.forEach(entity => {
            entity._config.primary = false;
        });
        if (oldPrimaryIndex !== -1) {
            entities.value[oldPrimaryIndex]._config.primary = true;
        }

        toast.add({
            title: t('error.saveChangesFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    }
};

const updateEntityConfig = async (index: number, key: string, value: any) => {
    const oldValue = entities.value[index]._config[key];

    try {
        // Update via API
        const entity = entities.value[index];
        await $fetch(`/api/user/domains/${props.domain.domain_id}/entities/${entity._config.entity_type}/${entity._config.entity_id}`, {
            method: 'PATCH',
            body: {
                [key]: value
            }
        });

        // Update locally after successful API call
        entities.value[index]._config[key] = value;
        hasChanges.value = true;

        toast.add({
            title: t('success'),
            description: 'Entity configuration updated successfully',
            color: 'green'
        });
    } catch (error: any) {
        // Revert on error
        entities.value[index]._config[key] = oldValue;

        toast.add({
            title: t('error.saveChangesFailed'),
            description: error.data?.message || t('error.generic'),
            color: 'red'
        });
    }
};

const saveChanges = async () => {
    // Individual changes are now handled immediately via API,
    // this function mainly serves to close the form
    emit('updated');
};
</script>
