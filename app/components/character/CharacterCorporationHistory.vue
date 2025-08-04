<template>
    <Card class="corporation-history-card">
        <template #header>
            <div class="header-container">
                <h3 class="header-title">{{ $t('character.corporationHistory') }}</h3>
            </div>
        </template>

        <div v-if="pending" class="loading-state">
            <UIcon name="i-lucide-loader-2" class="loading-icon" size="lg" />
            <span class="loading-text">{{ $t('loading') }}</span>
        </div>

        <div v-else-if="history.length > 0" class="history-content">
            <Table :columns="tableColumns" :items="history" background="transparent" density="compact" :bordered="true"
                :striped="true" :special-header="true" :link-fn="generateCorporationLink">

                <template #cell-corporation="{ item }">
                    <div class="corporation-cell">
                        <span class="corporation-name">{{ (item as ICorporationHistoryEntry).corporation_name }}</span>
                        <span v-if="(item as ICorporationHistoryEntry).alliance_id" class="alliance-info">
                            &nbsp;(
                            <NuxtLink :to="`/alliance/${(item as ICorporationHistoryEntry).alliance_id}`"
                                class="alliance-link" @click.stop>
                                {{ (item as ICorporationHistoryEntry).alliance_name }}
                            </NuxtLink>
                            )
                        </span>
                    </div>
                </template>

                <template #cell-joinDate="{ item }">
                    <div class="date-cell">{{ formatDate((item as ICorporationHistoryEntry).start_date) }}</div>
                </template>

                <template #cell-leaveDate="{ item }">
                    <div class="date-cell">
                        <span v-if="(item as ICorporationHistoryEntry).end_date">{{ formatDate((item as
                            ICorporationHistoryEntry).end_date!) }}</span>
                        <span v-else class="present-text">{{ $t('present') }}</span>
                    </div>
                </template>

                <!-- Mobile view template -->
                <template #mobile-content="{ item }">
                    <div class="mobile-content">
                        <div class="mobile-header">
                            <span class="mobile-corporation">{{ (item as ICorporationHistoryEntry).corporation_name
                                }}</span>
                            <span v-if="(item as ICorporationHistoryEntry).alliance_id" class="mobile-alliance">
                                ({{ (item as ICorporationHistoryEntry).alliance_name }})
                            </span>
                        </div>
                        <div class="mobile-dates">
                            <div class="mobile-date-row">
                                <span class="date-label">{{ $t('joinDate') }}:</span>
                                <span class="date-value">{{ formatDate((item as ICorporationHistoryEntry).start_date)
                                    }}</span>
                            </div>
                            <div class="mobile-date-row">
                                <span class="date-label">{{ $t('leaveDate') }}:</span>
                                <span v-if="(item as ICorporationHistoryEntry).end_date" class="date-value">
                                    {{ formatDate((item as ICorporationHistoryEntry).end_date!) }}
                                </span>
                                <span v-else class="present-text">{{ $t('present') }}</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Table>
        </div>

        <div v-else class="empty-state">
            <div class="empty-content">
                <UIcon name="i-lucide-building" class="empty-icon" />
                <p class="empty-text">{{ $t('character.noCorporationHistory') }}</p>
            </div>
        </div>
    </Card>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

interface ICorporationHistoryEntry {
    record_id: number;
    corporation_id: number;
    corporation_name: string;
    corporation_ticker?: string;
    alliance_id?: number;
    alliance_name?: string;
    start_date: string;
    end_date?: string | null;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const characterId = route.params.id;

const { data: historyRaw, pending } = useFetch<ICorporationHistoryEntry[] | { error: string }>(
    `/api/characters/${characterId}/corporationhistory`,
    { default: () => [] }
);

const history = computed(() => {
    if (Array.isArray(historyRaw.value)) {
        return historyRaw.value as ICorporationHistoryEntry[];
    }
    return [];
});

// Table columns
const tableColumns = [
    {
        id: "corporation",
        header: t('corporation'),
        width: "50%"
    },
    {
        id: "joinDate",
        header: t('joinDate'),
        width: "25%"
    },
    {
        id: "leaveDate",
        header: t('leaveDate'),
        width: "25%"
    }
];

// Helper functions
function goToCorporation(corporationId: number) {
    router.push(`/corporation/${corporationId}`);
}

function formatDate(dateString: string) {
    if (!dateString) return '';
    return format(new Date(dateString), 'yyyy-MM-dd');
}

function generateCorporationLink(item: any): string | null {
    return `/corporation/${item.corporation_id}`;
}
</script>

<style scoped>
/* Card styling */
.corporation-history-card {
    overflow: hidden;
}

/* Header */
.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-title {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
}

/* Loading state */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-8) 0;
    gap: var(--space-2);
}

.loading-icon {
    animation: spin var(--duration-slow) linear infinite;
    color: var(--color-text-muted);
}

.loading-text {
    color: var(--color-text-muted);
}

/* History content */
.history-content {
    overflow-x: auto;
}

/* Corporation cell */
.corporation-cell {
    padding: var(--space-2);
    white-space: nowrap;
}

.corporation-name {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
}

.alliance-info {
    color: var(--color-text-secondary);
}

.alliance-link {
    color: var(--color-brand-primary);
    text-decoration: none;
    transition: color var(--duration-normal) ease;
}

.alliance-link:hover {
    text-decoration: underline;
    color: var(--color-brand-600);
}

/* Date cells */
.date-cell {
    padding: var(--space-2);
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.present-text {
    font-style: italic;
    color: var(--color-text-tertiary);
}

/* Mobile view styling */
.mobile-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: var(--space-3);
    gap: var(--space-3);
}

.mobile-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border-default);
}

.mobile-corporation {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
}

.mobile-alliance {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

.mobile-dates {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.mobile-date-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.date-label {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
}

.date-value {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
}

/* Empty state styling */
.empty-state {
    text-align: center;
    padding: var(--space-8) 0;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
}

.empty-icon {
    width: var(--space-12);
    height: var(--space-12);
    color: var(--color-text-muted);
}

.empty-text {
    color: var(--color-text-muted);
    margin: 0;
}

/* Row hover effect */
:deep(tbody tr:hover) {
    background: var(--color-surface-hover);
    transition: background-color var(--duration-normal) ease;
    cursor: pointer;
}

/* Animations */
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
