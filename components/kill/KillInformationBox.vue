<template>
  <div class="kill-information-box md:max-w-[325px]" :class="{ 'is-solo-kill': killmail?.is_solo }">
    <!-- Ship & Basic Info Section (combined) -->
    <div class="section ship-section">
      <div class="ship-image-container">
        <NuxtLink v-if="killmail?.victim?.ship_id" :to="`/item/${killmail.victim.ship_id}`">
          <EveImage
             :type="'type-render'"
             :id="killmail.victim.ship_id"
             :size="96"
             :alt="getLocalizedString(killmail?.victim?.ship_name, currentLocale.value)"
             class="ship-image" />
        </NuxtLink>
      </div>
      <div class="ship-info">
        <h3 class="ship-name">
          <NuxtLink v-if="killmail?.victim?.ship_id" :to="`/item/${killmail.victim.ship_id}`" class="entity-link truncate">
            {{ getLocalizedString(killmail?.victim?.ship_name, currentLocale.value) }}
          </NuxtLink>
          <span v-else class="truncate">{{ getLocalizedString(killmail?.victim?.ship_name, currentLocale.value) }}</span>
        </h3>
        <div class="meta-row">
          <div class="kill-value">{{ formatIsk(killmail?.total_value || 0) }}</div>
          <div class="kill-labels">
            <span v-if="killmail?.is_solo" class="kill-label solo">{{ $t('killInfo.solo') }}</span>
            <span v-if="killmail?.is_npc" class="kill-label npc">{{ $t('killInfo.npc') }}</span>
            <span v-if="isHighValue" class="kill-label value">{{ $t('killInfo.highValue') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Combined Victim/Final Blow Section -->
    <div class="section entity-section">
      <div class="section-grid">
        <!-- Victim Column -->
        <div class="entity-column">
          <h4 class="column-title">{{ $t('killInfo.victim') }}</h4>

          <div class="entity-info">
            <!-- Character with Corp -->
            <div v-if="killmail?.victim?.character_id" class="compact-entity-row">
              <div class="entity-portraits">
                <NuxtLink :to="`/character/${killmail.victim.character_id}`">
                  <EveImage :type="'character'" :id="killmail.victim.character_id" :size="48" class="portrait-image" />
                </NuxtLink>
                <NuxtLink v-if="killmail.victim.corporation_id" :to="`/corporation/${killmail.victim.corporation_id}`">
                  <EveImage :type="'corporation'" :id="killmail.victim.corporation_id" :size="32" class="portrait-image corporation-image" />
                </NuxtLink>
              </div>
              <div class="entity-details">
                <div class="entity-name primary">
                  <NuxtLink :to="`/character/${killmail.victim.character_id}`" class="entity-link truncate">
                    {{ killmail.victim.character_name }}
                  </NuxtLink>
                </div>
                <div v-if="killmail.victim.corporation_name" class="entity-name secondary">
                  <NuxtLink v-if="killmail.victim.corporation_id" :to="`/corporation/${killmail.victim.corporation_id}`" class="entity-link truncate">
                    {{ killmail.victim.corporation_name }}
                  </NuxtLink>
                  <span v-else class="truncate">{{ killmail.victim.corporation_name }}</span>
                </div>
              </div>
            </div>

            <!-- Alliance -->
            <div v-if="killmail?.victim?.alliance_id" class="alliance-row">
              <NuxtLink :to="`/alliance/${killmail.victim.alliance_id}`">
                <EveImage :type="'alliance'" :id="killmail.victim.alliance_id" :size="24" class="small-icon" />
              </NuxtLink>
              <NuxtLink :to="`/alliance/${killmail.victim.alliance_id}`" class="entity-link alliance-name truncate">
                {{ killmail.victim.alliance_name }}
              </NuxtLink>
            </div>

            <!-- Damage Taken + Attackers Count (combined) -->
            <div class="stats-row">
              <div class="stat-item">
                <div class="detail-icon"><Icon name="lucide:zap" /></div>
                <div class="stat-info">
                  <span class="stat-label">{{ $t('killInfo.damageTaken') }}:&nbsp;</span>
                  <span class="damage-value">{{ formatNumber(totalDamageTaken) }}</span>
                </div>
              </div>
            </div>
            <div class="stats-row">
              <div class="stat-item">
                <div class="detail-icon"><Icon name="lucide:users" /></div>
                <div class="stat-info">
                  <span class="stat-label">{{ $t('killInfo.attackers') }}:&nbsp;</span>
                  <span class="attackers-value">{{ killmail?.attackers?.length || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kill Details Section -->
    <div class="section details-section">
      <div class="details-grid">
        <!-- Time -->
        <div class="detail-item">
          <div class="detail-icon"><Icon name="lucide:clock" /></div>
          <div class="detail-content">
            <ClientOnly>
              <div class="detail-primary">{{ formatDateTime(killmail?.kill_time) }}</div>
              <div class="detail-secondary">{{ formatTimeAgo(killmail?.kill_time) }}</div>
            </ClientOnly>
          </div>
        </div>

        <!-- System & Location (combined) -->
        <div class="location-container">
          <!-- System -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="lucide:map-pin" /></div>
            <div class="detail-content">
              <div class="detail-primary">
                <NuxtLink v-if="killmail?.system_id" :to="`/system/${killmail.system_id}`" class="entity-link truncate">
                  {{ killmail?.system_name }}
                </NuxtLink>
                <span v-else class="truncate">{{ killmail?.system_name }}</span>
                <span :class="['security-status', getSecurityClass(killmail?.system_security)]">
                  {{ formatSecurity(killmail?.system_security) }}
                </span>
              </div>
              <div class="detail-secondary">
                <NuxtLink v-if="killmail?.region_id" :to="`/region/${killmail.region_id}`" class="entity-link truncate">
                  {{ getLocalizedString(killmail?.region_name, currentLocale.value) }}
                </NuxtLink>
                <span v-else class="truncate">{{ getLocalizedString(killmail?.region_name, currentLocale.value) }}</span>
              </div>
            </div>
          </div>

          <!-- Location (if available) -->
          <div v-if="killmail?.near" class="detail-item">
            <div class="detail-icon"><Icon name="lucide:compass" /></div>
            <div class="detail-content">
              <div class="detail-secondary location-text truncate">{{ killmail.near }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IKillmail, IAttacker } from '~/server/interfaces/IKillmail';
import moment from 'moment';

// i18n setup
const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Props definition
const props = defineProps<{
    killmail: IKillmail | null;
}>();

// Define formatted headers
const headers = computed(() => ({
    details: t('killInfo.details'),
    victim: t('killInfo.victim'),
    finalBlow: t('killInfo.finalBlow'),
    character: t('killInfo.character'),
    corporation: t('killInfo.corporation'),
    alliance: t('killInfo.alliance'),
    faction: t('killInfo.faction'),
    ship: t('killInfo.ship'),
    time: t('killInfo.time'),
    system: t('killInfo.system'),
    region: t('killInfo.region'),
    attackers: t('killInfo.attackers'),
    solo: t('killInfo.solo'),
    npc: t('killInfo.npc'),
    highValue: t('killInfo.highValue')
}));

// Find the final blow attacker
const finalBlowAttacker = computed<IAttacker | null>(() => {
    if (!props.killmail || !props.killmail.attackers) return null;
    return props.killmail.attackers.find(attacker => attacker.final_blow) || null;
});

// Calculate total damage taken
const totalDamageTaken = computed<number>(() => {
    if (!props.killmail || !props.killmail.attackers) return 0;

    return props.killmail.attackers.reduce((sum, attacker) => {
        return sum + (attacker.damage_done || 0);
    }, 0);
});

// Check if this is a high value kill (over 1 billion ISK)
const isHighValue = computed(() => {
    return (props.killmail?.total_value || 0) >= 1000000000;
});

/**
 * Gets the localized string from a translation object using the current locale
 */
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return '';
    return obj[locale] || obj['en'] || '';
};

/**
 * Format a number with commas as thousands separators
 */
function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format security status with proper coloring
 */
function formatSecurity(security: number | undefined): string {
    if (security === undefined) return '?';
    return security.toFixed(1);
}

/**
 * Get CSS class for security status coloring
 */
function getSecurityClass(security: number | undefined): string {
    if (security === undefined) return 'unknown';
    if (security >= 0.9) return 'highsec-highest';
    if (security >= 0.8) return 'highsec-high';
    if (security >= 0.7) return 'highsec-medium';
    if (security >= 0.6) return 'highsec-low';
    if (security >= 0.5) return 'lowsec-high';
    if (security >= 0.4) return 'lowsec-medium';
    if (security >= 0.3) return 'lowsec-low';
    if (security >= 0.1) return 'nullsec-high';
    return 'nullsec-low';
}

/**
 * Format date and time in local format
 */
function formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return '';
    moment.locale(currentLocale.value);
    return moment.utc(dateTime).local().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format time ago (e.g. "2 hours ago")
 */
function formatTimeAgo(dateTime: string | undefined): string {
    if (!dateTime) return '';
    moment.locale(currentLocale.value);
    return moment.utc(dateTime).fromNow();
}

// Watch for locale changes to update moment locale
watch(locale, (newLocale) => {
    moment.locale(newLocale);
}, { immediate: true });
</script>

<style scoped>
.kill-information-box {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: light-dark(#111827, white);
  background-color: transparent;
  gap: 0.25rem;
}

/* Universal truncation class */
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: inline-block;
}

.section {
  padding: 0.85rem;
  border-radius: 0.5rem;
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Ship section styles */
.ship-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ship-image-container {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
}

.ship-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0.25rem;
}

.ship-info {
  flex-grow: 1;
  min-width: 0;
}

.ship-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  width: 100%;
}

/* Links styling */
.entity-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
  max-width: 100%;
}

.entity-link:hover {
  color: #4fc3f7;
  text-decoration: underline;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.kill-value {
  font-size: 1rem;
  font-weight: 500;
  color: #4fc3f7;
}

.kill-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.kill-label {
  display: inline-flex;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
}

.kill-label.solo {
  background-color: rgba(16, 185, 129, 0.2);
  color: rgb(16, 185, 129);
}

.kill-label.npc {
  background-color: rgba(245, 158, 11, 0.2);
  color: rgb(245, 158, 11);
}

.kill-label.value {
  background-color: rgba(239, 68, 68, 0.2);
  color: rgb(239, 68, 68);
}

/* Combined entity section */
.section-grid {
  display: grid;
  grid-template-columns: 1fr; /* Single column layout */
  gap: 1rem;
}

.entity-column {
  width: 100%; /* Ensure column takes full width */
}

.column-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.6rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.entity-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%; /* Ensure it takes full width */
}

.compact-entity-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%; /* Ensure full width */
}

.entity-portraits {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0; /* Prevent shrinking */
}

.entity-details {
  min-width: 0;
  flex-grow: 1; /* Allow to grow and fill space */
  width: calc(100% - 60px); /* Account for portrait width and gap */
}

.entity-name {
  font-size: 0.95rem;
  width: 100%; /* Ensure full width */
}

.entity-name.primary {
  font-weight: 500;
}

.entity-name.secondary {
  font-size: 0.85rem;
  color: light-dark(#6b7280, #9ca3af);
}

/* Alliance row specific */
.alliance-row, .ship-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: light-dark(#4b5563, #d1d5db);
  width: 100%; /* Ensure full width */
  overflow: hidden;
}

.alliance-name {
  max-width: calc(100% - 30px); /* Account for icon and gap */
}

/* Stats row for damage & attackers */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.25rem;
  width: 100%; /* Ensure full width */
  justify-content: space-between; /* Distribute items evenly */
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-grow: 1; /* Allow items to grow */
  max-width: calc(50% - 0.375rem); /* Half width minus half the gap */
}

/* Details section styles */
.details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  width: 100%; /* Ensure full width */
}

/* Location container with system and near */
.location-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%; /* Ensure full width */
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%; /* Ensure full width */
}

.detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: light-dark(#6b7280, #9ca3af);
  margin-top: 2px;
  width: 16px;
  flex-shrink: 0; /* Prevent shrinking */
}

.detail-content {
  min-width: 0;
  flex-grow: 1; /* Allow to grow and fill space */
  width: calc(100% - 24px); /* Account for icon width and gap */
  overflow: hidden;
}

.detail-primary, .detail-secondary {
  width: 100%; /* Ensure full width */
}

/* Security status colors */
.security-status {
  font-weight: 600;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.highsec-highest { color: #ecc94b; }
.highsec-high { color: #48bb78; }
.highsec-medium { color: #38a169; }
.highsec-low { color: #68d391; }
.lowsec-high { color: #f6ad55; }
.lowsec-medium { color: #ed8936; }
.lowsec-low { color: #f6ad55; }
.nullsec-high { color: #fc8181; }
.nullsec-low { color: #f56565; }
.unknown { color: #a0aec0; }

/* Image sizes and positioning */
.portrait-image {
  border-radius: 50%;
}

.corporation-image {
  position: absolute;
  bottom: -5px;
  right: -5px;
  border: 2px solid light-dark(white, #1a1a1a);
  border-radius: 50%;
  background-color: light-dark(white, #1a1a1a);
}

.small-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .section-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .entity-column:not(:first-child) {
    border-top: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    padding-top: 0.75rem;
  }
}
</style>
