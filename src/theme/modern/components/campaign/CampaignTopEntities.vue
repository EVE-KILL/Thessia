<template>
    <div class="p-4 bg-background-800 shadow-lg rounded-lg border border-gray-700/30">
        <h2 class="text-lg font-bold mb-4">{{ title }}</h2>

        <div v-if="characters.length" class="top-entities-grid">
            <div v-for="(character, index) in characters" :key="character.character_id" class="top-entity-card">
                <div class="rank">{{ index + 1 }}</div>
                <div class="entity-details">
                    <div class="entity-avatar">
                        <Image type="character" :id="character.character_id" :size="32" class="avatar" />
                    </div>
                    <div class="entity-name">
                        {{ character.character_name }}
                        <div class="entity-value">
                            {{ showKills ? character.kills : formatNumber(character.damageDone) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="empty-state">
            {{ t('campaign.no_data_available') }}
        </div>
    </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps<{
    title: string;
    characters: Array<{
        character_id: number;
        character_name: string;
        kills?: number;
        damageDone?: number;
    }>;
    showKills: boolean;
}>();

// Composables
const { t } = useI18n();
const { locale } = useI18n();

// Helpers
const formatNumber = (value: number): string => {
    if (!value) return '0';

    return new Intl.NumberFormat(locale.value).format(value);
};
</script>

<style scoped>
.top-entities-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 0.75rem;
}

@media (min-width: 768px) {
    .top-entities-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (min-width: 1024px) {
    .top-entities-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

.top-entity-card {
    background-color: var(--background-700);
    padding: 0.5rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
}

.rank {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    background-color: var(--background-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 700;
    margin-right: 0.5rem;
    flex-shrink: 0;
}

.entity-details {
    display: flex;
    align-items: center;
    flex: 1;
}

.entity-avatar {
    margin-right: 0.5rem;
}

.avatar {
    border-radius: 9999px;
}

.entity-name {
    font-size: 0.875rem;
    display: flex;
    flex-direction: column;
}

.entity-value {
    font-size: 0.75rem;
    color: #9ca3af;
}

.empty-state {
    text-align: center;
    color: #9ca3af;
    padding-top: 1rem;
    padding-bottom: 1rem;
}
</style>
