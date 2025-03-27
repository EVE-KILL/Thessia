<template>
  <div class="kill-attackers">
    <!-- Key Attackers Tabs -->
    <UTabs
      v-model="activeKeyAttacker"
      :items="keyAttackerTabs"
      class="key-attackers-tabs"
      :ui="tabsUi"
      color="neutral"
    >
      <!-- Final Blow Tab -->
      <template #final-blow="{ item }">
        <div v-if="finalBlowAttacker" class="key-attacker-info">
          <div class="attacker-portrait">
            <!-- Character with Corporation Portrait -->
            <div class="portraits-container">
              <NuxtLink v-if="finalBlowAttacker.character_id" :to="`/character/${finalBlowAttacker.character_id}`">
                <Image :type="'character'" :id="finalBlowAttacker.character_id" :size="64" class="portrait-image" />
              </NuxtLink>
              <NuxtLink v-if="finalBlowAttacker.corporation_id" :to="`/corporation/${finalBlowAttacker.corporation_id}`">
                <Image :type="'corporation'" :id="finalBlowAttacker.corporation_id" :size="32" class="portrait-image corporation-image" />
              </NuxtLink>
            </div>

            <!-- Ship Portrait -->
            <div class="ship-portrait">
              <NuxtLink v-if="finalBlowAttacker.ship_id" :to="`/item/${finalBlowAttacker.ship_id}`">
                <Image :type="'type-render'" :id="finalBlowAttacker.ship_id" :size="64" class="portrait-image ship-image" />
              </NuxtLink>
            </div>
          </div>

          <div class="attacker-details">
            <!-- Character & Corporation -->
            <div class="entity-info">
              <div class="entity-name primary">
                <NuxtLink v-if="finalBlowAttacker.character_id" :to="`/character/${finalBlowAttacker.character_id}`" class="entity-link truncate">
                  {{ finalBlowAttacker.character_name }}
                </NuxtLink>
                <span v-else class="entity-name truncate">{{ finalBlowAttacker.character_name || $t('common.unknown') }}</span>
              </div>
              <div class="entity-name secondary">
                <NuxtLink v-if="finalBlowAttacker.corporation_id" :to="`/corporation/${finalBlowAttacker.corporation_id}`" class="entity-link truncate">
                  {{ finalBlowAttacker.corporation_name }}
                </NuxtLink>
                <span v-else class="truncate">{{ finalBlowAttacker.corporation_name || '' }}</span>
              </div>
            </div>

            <!-- Ship & Damage -->
            <div class="weapon-info">
              <div class="ship-info">
                <NuxtLink v-if="finalBlowAttacker.ship_id" :to="`/item/${finalBlowAttacker.ship_id}`" class="entity-link truncate">
                  {{ getLocalizedString(finalBlowAttacker.ship_name, currentLocale) }}
                </NuxtLink>
                <span v-else class="truncate">{{ getLocalizedString(finalBlowAttacker.ship_name, currentLocale) || $t('common.unknown') }}</span>
              </div>
              <div class="weapon-detail">
                <Icon name="lucide:zap" class="icon-small" />
                <span class="damage-value">{{ formatNumber(finalBlowAttacker.damage_done || 0) }}</span>
                <span class="damage-percent">({{ getDamagePercentage(finalBlowAttacker) }}%)</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          {{ $t('killAttackers.noFinalBlow') }}
        </div>
      </template>

      <!-- Top Damage Tab -->
      <template #top-damage="{ item }">
        <div v-if="topDamageAttacker" class="key-attacker-info">
          <div class="attacker-portrait">
            <!-- Character with Corporation Portrait -->
            <div class="portraits-container">
              <NuxtLink v-if="topDamageAttacker.character_id" :to="`/character/${topDamageAttacker.character_id}`">
                <Image :type="'character'" :id="topDamageAttacker.character_id" :size="64" class="portrait-image" />
              </NuxtLink>
              <NuxtLink v-if="topDamageAttacker.corporation_id" :to="`/corporation/${topDamageAttacker.corporation_id}`">
                <Image :type="'corporation'" :id="topDamageAttacker.corporation_id" :size="32" class="portrait-image corporation-image" />
              </NuxtLink>
            </div>

            <!-- Ship Portrait -->
            <div class="ship-portrait">
              <NuxtLink v-if="topDamageAttacker.ship_id" :to="`/item/${topDamageAttacker.ship_id}`">
                <Image :type="'type-render'" :id="topDamageAttacker.ship_id" :size="64" class="portrait-image ship-image" />
              </NuxtLink>
            </div>
          </div>

          <div class="attacker-details">
            <!-- Character & Corporation -->
            <div class="entity-info">
              <div class="entity-name primary">
                <NuxtLink v-if="topDamageAttacker.character_id" :to="`/character/${topDamageAttacker.character_id}`" class="entity-link truncate">
                  {{ topDamageAttacker.character_name }}
                </NuxtLink>
                <span v-else class="entity-name truncate">{{ topDamageAttacker.character_name || $t('common.unknown') }}</span>
              </div>
              <div class="entity-name secondary">
                <NuxtLink v-if="topDamageAttacker.corporation_id" :to="`/corporation/${topDamageAttacker.corporation_id}`" class="entity-link truncate">
                  {{ topDamageAttacker.corporation_name }}
                </NuxtLink>
                <span v-else class="truncate">{{ topDamageAttacker.corporation_name || '' }}</span>
              </div>
            </div>

            <!-- Ship & Damage -->
            <div class="weapon-info">
              <div class="ship-info">
                <NuxtLink v-if="topDamageAttacker.ship_id" :to="`/item/${topDamageAttacker.ship_id}`" class="entity-link truncate">
                  {{ getLocalizedString(topDamageAttacker.ship_name, currentLocale) }}
                </NuxtLink>
                <span v-else class="truncate">{{ getLocalizedString(topDamageAttacker.ship_name, currentLocale) || $t('common.unknown') }}</span>
              </div>
              <div class="weapon-detail">
                <Icon name="lucide:zap" class="icon-small" />
                <span class="damage-value">{{ formatNumber(topDamageAttacker.damage_done || 0) }}</span>
                <span class="damage-percent">({{ getDamagePercentage(topDamageAttacker) }}%)</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          {{ $t('killAttackers.noTopDamage') }}
        </div>
      </template>
    </UTabs>

    <!-- Organizations Involved - Now Collapsible (Default Collapsed) -->
    <div class="organizations-section">
      <div class="section-header" @click="toggleOrganizations">
        <h3 class="section-title">
          {{ $t('killAttackers.organizationsInvolved') }}
          <span class="org-counts">({{ organizationsTree.alliances.length }}A / {{ getTotalCorporationsCount() }}C)</span>
        </h3>
        <Icon :name="isOrganizationsOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="toggle-icon" />
      </div>

      <div v-if="isOrganizationsOpen" class="organizations-content">
        <!-- Alliances with corporations -->
        <div v-for="(alliance, index) in organizationsTree.alliances" :key="`alliance-${index}`" class="alliance-group">
          <div class="alliance-name">
            <NuxtLink v-if="alliance.id" :to="`/alliance/${alliance.id}`" class="entity-link">
              <Image v-if="alliance.id" :type="'alliance'" :id="alliance.id" :size="24" class="org-icon" />
              <span>{{ alliance.name }}</span>
              <span class="count">({{ alliance.count }})</span>
            </NuxtLink>
            <span v-else>
              <span>{{ alliance.name }}</span>
              <span class="count">({{ alliance.count }})</span>
            </span>
          </div>

          <!-- Corporations in alliance -->
          <div class="corporation-list">
            <div v-for="(corp, corpIndex) in alliance.corporations" :key="`corp-${alliance.id}-${corpIndex}`" class="corporation-item">
              <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`" class="entity-link corporation-name">
                <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24" class="org-icon" />
                <span>{{ corp.name }}</span>
                <span class="count">({{ corp.count }})</span>
              </NuxtLink>
              <span v-else>
                <span>{{ corp.name }}</span>
                <span class="count">({{ corp.count }})</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Corporations without alliance -->
        <div v-if="organizationsTree.noAllianceCorporations.length > 0" class="no-alliance-section">
          <div class="no-alliance-header">{{ $t('killAttackers.corporationsWithoutAlliance') }}</div>

          <div class="corporation-list">
            <div v-for="(corp, index) in organizationsTree.noAllianceCorporations" :key="`no-alliance-corp-${index}`" class="corporation-item standalone">
              <NuxtLink v-if="corp.id" :to="`/corporation/${corp.id}`" class="entity-link corporation-name">
                <Image v-if="corp.id" :type="'corporation'" :id="corp.id" :size="24" class="org-icon" />
                <span>{{ corp.name }}</span>
                <span class="count">({{ corp.count }})</span>
              </NuxtLink>
              <span v-else>
                <span>{{ corp.name }}</span>
                <span class="count">({{ corp.count }})</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Attackers Table - Redesigned for narrower width -->
    <div class="attackers-table">
      <h3 class="section-title">{{ $t('killAttackers.allAttackers') }} ({{ attackers.length }})</h3>

      <div class="table-container">
        <div class="table-body compact-table">
          <div v-for="(attacker, index) in sortedAttackers"
               :key="`attacker-${index}`"
               class="table-row"
               :class="{ 'final-blow': attacker.final_blow, 'top-damage': attacker === topDamageAttacker }">

            <!-- Character portrait column -->
            <div class="body-cell">
              <NuxtLink v-if="attacker.character_id" :to="`/character/${attacker.character_id}`">
                <Image :type="'character'" :id="attacker.character_id" :size="64" class="character-portrait" />
              </NuxtLink>
              <div v-else class="character-portrait placeholder-portrait"></div>
            </div>

            <!-- Ship images column -->
            <div class="body-cell ship-images-cell -ml-1">
              <div class="ship-images-container">
                <NuxtLink v-if="attacker.ship_id" :to="`/item/${attacker.ship_id}`">
                  <Image :type="'type-render'" :id="attacker.ship_id" :size="32" class="ship-render" />
                </NuxtLink>
                <NuxtLink v-if="attacker.weapon_type_id" :to="`/item/${attacker.weapon_type_id}`">
                  <Image :type="'type-icon'" :id="attacker.weapon_type_id" :size="32" class="type-icon" />
                </NuxtLink>
              </div>
            </div>

            <!-- Character/ship info column -->
            <div class="body-cell info-cell">
              <div class="attacker-info">
                <div class="character-line">
                  <NuxtLink v-if="attacker.character_id" :to="`/character/${attacker.character_id}`" class="character-name entity-link">
                    {{ attacker.character_name || $t('common.unknown') }}
                  </NuxtLink>
                  <span v-else class="character-name">{{ attacker.character_name || $t('common.unknown') }}</span>

                  <UBadge v-if="attacker.final_blow" variant="solid" color="primary" size="xs" class="final-blow-badge ml-1">
                    FB
                  </UBadge>
                </div>

                <div class="corporation-line">
                  <NuxtLink v-if="attacker.corporation_id" :to="`/corporation/${attacker.corporation_id}`" class="corporation-name entity-link">
                    {{ attacker.corporation_name }}
                  </NuxtLink>
                  <span v-else class="corporation-name">{{ attacker.corporation_name || '' }}</span>
                </div>

                <!-- Ship name on its own line -->
                <div class="ship-line">
                  <NuxtLink v-if="attacker.ship_id" :to="`/item/${attacker.ship_id}`" class="ship-name entity-link">
                    {{ getLocalizedString(attacker.ship_name, currentLocale) }}
                  </NuxtLink>
                  <span v-else>{{ getLocalizedString(attacker.ship_name, currentLocale) || $t('common.unknown') }}</span>
                </div>
              </div>
            </div>

            <!-- Damage and corp logo column -->
            <div class="body-cell damage-cell">
              <div class="damage-container">
                <div class="damage-value">{{ formatNumber(attacker.damage_done || 0) }}</div>
                <div class="damage-percent">{{ getDamagePercentage(attacker) }}%</div>

                <div class="corporation-logo">
                  <NuxtLink v-if="attacker.corporation_id" :to="`/corporation/${attacker.corporation_id}`">
                    <Image :type="'corporation'" :id="attacker.corporation_id" :size="32" class="corp-logo" />
                  </NuxtLink>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IKillmail, IAttacker } from '~/server/interfaces/IKillmail';

// i18n setup
const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Props definition - accept either full killmail or just attackers array
const props = defineProps<{
  killmail?: IKillmail | null;
  attackers?: IAttacker[];
}>();

// State for collapsible sections - changed to false (collapsed by default)
const isOrganizationsOpen = ref(false);

// Function to toggle organizations visibility
function toggleOrganizations() {
  isOrganizationsOpen.value = !isOrganizationsOpen.value;
}

// Derive attackers from either props source
const attackers = computed<IAttacker[]>(() => {
  if (props.attackers && props.attackers.length > 0) {
    return props.attackers;
  }
  return props.killmail?.attackers || [];
});

// Sort attackers by damage only (don't prioritize final blow)
const sortedAttackers = computed(() => {
  return [...attackers.value].sort((a, b) => {
    // Sort only by damage done (highest first)
    return (b.damage_done || 0) - (a.damage_done || 0);
  });
});

// Calculate total damage for percentages
const totalDamage = computed(() => {
  return attackers.value.reduce((sum, attacker) => sum + (attacker.damage_done || 0), 0);
});

// Find final blow attacker
const finalBlowAttacker = computed<IAttacker | null>(() => {
  return attackers.value.find(attacker => attacker.final_blow) || null;
});

// Find top damage attacker
const topDamageAttacker = computed<IAttacker | null>(() => {
  if (attackers.value.length === 0) return null;

  return attackers.value.reduce((highest, current) => {
    return (current.damage_done || 0) > (highest.damage_done || 0) ? current : highest;
  }, attackers.value[0]);
});

// Tab state for key attackers
const activeKeyAttacker = ref('final-blow');
const keyAttackerTabs = computed(() => [
  {
    label: t('killAttackers.finalBlow'),
    value: 'final-blow',
    slot: 'final-blow'
  },
  {
    label: t('killAttackers.topDamage'),
    value: 'top-damage',
    slot: 'top-damage'
  }
]);

// Tabs UI configuration similar to parent
const tabsUi = {
  list: {
    base: 'mb-1 border-b border-background-700',
    background: '',
    rounded: '',
    shadow: '',
    padding: 'p-0',
    height: 'h-auto',
    width: 'w-full',
    marker: {
      background: 'dark:bg-primary-500 bg-primary-500',
      rounded: 'rounded-none',
      shadow: ''
    }
  },
  tab: {
    base: 'text-sm inline-flex items-center h-9 px-3 cursor-pointer',
    active: 'text-black dark:text-white font-medium',
    inactive: 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
  },
  panel: {
    base: 'p-3 sm:p-3'
  }
};

// Organization tree for the structured organization display
interface Organization {
  id: number;
  name: string;
  count: number;
}

interface Alliance extends Organization {
  corporations: Organization[];
}

interface OrganizationTree {
  alliances: Alliance[];
  noAllianceCorporations: Organization[];
}

// Build organization tree from attackers
const organizationsTree = computed<OrganizationTree>(() => {
  const alliances: Record<string, Alliance> = {};
  const noAllianceCorporations: Record<string, Organization> = {};

  // Process each attacker
  attackers.value.forEach(attacker => {
    // Process alliance
    if (attacker.alliance_id && attacker.alliance_name) {
      const allianceKey = `alliance_${attacker.alliance_id}`;
      if (!alliances[allianceKey]) {
        alliances[allianceKey] = {
          id: attacker.alliance_id,
          name: attacker.alliance_name,
          count: 0,
          corporations: []
        };
      }
      alliances[allianceKey].count++;

      // Process corporation within alliance
      if (attacker.corporation_id && attacker.corporation_name) {
        const corpKey = `corp_${attacker.corporation_id}`;
        const allianceCorporations = alliances[allianceKey].corporations;

        // Check if corp already exists in alliance
        const existingCorp = allianceCorporations.find(corp => corp.id === attacker.corporation_id);

        if (existingCorp) {
          existingCorp.count++;
        } else {
          allianceCorporations.push({
            id: attacker.corporation_id,
            name: attacker.corporation_name,
            count: 1
          });
        }
      }
    }
    // Process corporations without alliance
    else if (attacker.corporation_id && attacker.corporation_name) {
      const corpKey = `corp_${attacker.corporation_id}`;
      if (!noAllianceCorporations[corpKey]) {
        noAllianceCorporations[corpKey] = {
          id: attacker.corporation_id,
          name: attacker.corporation_name,
          count: 0
        };
      }
      noAllianceCorporations[corpKey].count++;
    }
  });

  // Sort corporations within alliances by count
  Object.values(alliances).forEach(alliance => {
    alliance.corporations.sort((a, b) => b.count - a.count);
  });

  // Convert to arrays and sort
  const alliancesArray = Object.values(alliances).sort((a, b) => b.count - a.count);
  const noAllianceCorporationsArray = Object.values(noAllianceCorporations).sort((a, b) => b.count - a.count);

  return {
    alliances: alliancesArray,
    noAllianceCorporations: noAllianceCorporationsArray
  };
});

/**
 * Gets the localized string from a translation object using the current locale
 */
function getLocalizedString(obj: any, locale: string): string {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
}

/**
 * Format a number with commas as thousands separators
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get damage percentage for an attacker
 */
function getDamagePercentage(attacker: IAttacker): string {
  if (!attacker || !attacker.damage_done || totalDamage.value === 0) return '0';
  return ((attacker.damage_done / totalDamage.value) * 100).toFixed(1);
}

/**
 * Gets the total count of corporations across alliances and standalone corps
 */
function getTotalCorporationsCount(): number {
  const allianceCorpsCount = organizationsTree.value.alliances.reduce(
    (sum, alliance) => sum + alliance.corporations.length, 0
  );
  return allianceCorpsCount + organizationsTree.value.noAllianceCorporations.length;
}
</script>

<style scoped>
.kill-attackers {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0 auto;
}

/* Key Attacker Styles */
.key-attackers-tabs {
  width: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.key-attacker-info {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  width: 100%;
}

.attacker-portrait {
  display: flex;
  gap: 0.5rem;
}

.portraits-container {
  position: relative;
  width: 64px;
  height: 64px;
}

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

.corp-small {
  bottom: -2px;
  right: -2px;
  border-width: 1px;
}

.ship-portrait {
  width: 64px;
  height: 64px;
}

.ship-image {
  border-radius: 0.25rem;
}

.attacker-details {
  flex: 1;
  min-width: 0; /* Ensure flexbox respects minimum width */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.entity-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.entity-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-name.primary {
  font-weight: 500;
  font-size: 1rem;
}

.entity-name.secondary {
  font-size: 0.875rem;
  color: light-dark(#6b7280, #9ca3af);
}

.weapon-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.ship-info {
  font-size: 0.875rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weapon-detail {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.damage-value {
  font-weight: 500;
}

.damage-percent {
  color: light-dark(#6b7280, #9ca3af);
  font-size: 0.8rem;
}

.icon-small {
  width: 16px;
  height: 16px;
  color: light-dark(#6b7280, #9ca3af);
}

.empty-state {
  padding: 1rem;
  text-align: center;
  color: light-dark(#6b7280, #9ca3af);
}

/* Organization Section Styles */
.organizations-section {
  margin-top: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.alliance-group {
  margin-bottom: 1rem;
}

.alliance-name {
  font-weight: 500;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.org-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.count {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: light-dark(#6b7280, #9ca3af);
}

.corporation-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 2rem;
}

.corporation-item {
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}

.corporation-item.standalone {
  margin-left: 0;
}

.corporation-name {
  display: flex;
  align-items: center;
}

.no-alliance-section {
  margin-top: 1rem;
}

.no-alliance-header {
  font-weight: 500;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  color: light-dark(#6b7280, #9ca3af);
}

/* Attackers Table Styles */
.attackers-table {
  margin-top: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.table-header {
  display: grid;
  grid-template-columns: minmax(200px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(100px, 0.5fr);
  padding: 0.5rem;
  border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
  background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(26, 26, 26, 0.7));
  color: light-dark(#374151, #d1d5db);
  font-weight: 600;
  font-size: 0.875rem;
}

.table-row {
  display: grid;
  grid-template-columns: minmax(200px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(100px, 0.5fr);
  border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
  align-items: center;
}

.table-row:hover {
  background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(26, 26, 26, 0.5));
}

/* Special rows */
.table-row.final-blow {
  background-color: light-dark(rgba(220, 38, 38, 0.1), rgba(220, 38, 38, 0.1));
}

.table-row.top-damage {
  background-color: light-dark(rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.1));
}

.table-row.final-blow:hover, .table-row.top-damage:hover {
  background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(40, 40, 40, 0.5));
}

/* Table cells */
.header-cell, .body-cell {
  padding: 0.25rem;
  overflow: hidden;
}

.character-cell {
  min-width: 0;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.character-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.character-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  min-width: 0;
}

.final-blow-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  font-size: 0.65rem;
  border-radius: 9999px;
  background-color: rgba(220, 38, 38, 0.2);
  color: rgb(220, 38, 38);
  font-weight: 600;
  white-space: nowrap;
}

.corporation-name {
  font-size: 0.8rem;
  color: light-dark(#6b7280, #9ca3af);
  min-width: 0;
}

.ship-info, .weapon-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ship-icon, .weapon-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.25rem;
}

.ship-name, .weapon-name {
  min-width: 0;
  font-size: 0.875rem;
}

.damage-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
}

.entity-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.entity-link:hover {
  color: #4fc3f7;
  text-decoration: underline;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Responsive styles */
@media (max-width: 768px) {
  .table-header, .table-row {
    grid-template-columns: minmax(150px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, 0.5fr);
    font-size: 0.8rem;
  }

  .portraits-container {
    width: 32px;
    height: 32px;
  }

  .corporation-image {
    width: 16px;
    height: 16px;
  }

  .ship-portrait {
    width: 32px;
    height: 32px;
  }

  .ship-icon, .weapon-icon {
    width: 24px;
    height: 24px;
  }

  .character-name, .ship-name, .weapon-name {
    font-size: 0.8rem;
  }

  .corporation-name {
    font-size: 0.7rem;
  }
}

@media (max-width: 640px) {
  .table-header, .table-row {
    grid-template-columns: minmax(120px, 1.5fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(60px, 0.5fr);
    font-size: 0.7rem;
    padding: 0.25rem;
  }

  .section-title {
    font-size: 0.9rem;
  }

  .alliance-name {
    font-size: 0.85rem;
  }

  .corporation-item {
    font-size: 0.8rem;
  }
}

/* Collapsible section header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
}

.section-header:hover {
  opacity: 0.9;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.org-counts {
  font-size: 0.85rem;
  color: light-dark(#6b7280, #9ca3af);
  font-weight: normal;
}

.toggle-icon {
  width: 18px;
  height: 18px;
  color: light-dark(#6b7280, #9ca3af);
}

.organizations-content {
  margin-top: 0.75rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Compact table styles */
.compact-table {
  width: 100%;
}

.compact-table .table-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  border-bottom: 1px solid light-dark(#e5e7eb, rgb(40, 40, 40));
  align-items: center;
  transition: background-color 0.3s ease;
}

.compact-table .table-row:hover {
  background-color: light-dark(rgba(229, 231, 235, 0.5), rgba(40, 40, 40, 0.5));
}

/* Special row highlighting */
.compact-table .table-row.final-blow {
  background-color: light-dark(rgba(220, 38, 38, 0.05), rgba(220, 38, 38, 0.1));
}

.compact-table .table-row.top-damage {
  background-color: light-dark(rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.1));
}

.character-portrait {
  width: 64px;
  height: 64px;
  border-radius: 0.375rem;
  object-fit: cover;
}

.placeholder-portrait {
  width: 42px;
  height: 42px;
  border-radius: 0.375rem;
  background-color: rgba(100, 100, 100, 0.2);
}

.ship-images-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.ship-render, .ship-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.375rem;
  object-fit: contain;
}

.info-cell {
  padding: 0 0.25rem;
  min-width: 0;
  overflow: hidden;
}

.attacker-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.character-line {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-name {
  font-weight: 500;
}

.ship-reference {
  color: light-dark(#6b7280, #9ca3af);
  font-size: 0.875rem;
}

.ship-name-small {
  color: light-dark(#6b7280, #9ca3af);
}

.corporation-line {
  font-size: 0.75rem;
  color: light-dark(#6b7280, #9ca3af);
}

.damage-cell {
  padding-left: 0.5rem;
  text-align: right;
}

.damage-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.damage-value {
  font-weight: 500;
}

.damage-percent {
  font-size: 0.75rem;
  color: light-dark(#6b7280, #9ca3af);
}

.corporation-logo {
  margin-top: 0.25rem;
}

.corp-logo {
  width: 32px;
  height: 32px;
  border-radius: 0.375rem;
}

.final-blow-badge {
  font-size: 0.65rem;
  padding: 0 0.25rem;
}

/* Responsive adjustments */
@media (max-width: 380px) {
  .compact-table .table-row {
    grid-template-columns: auto 1fr auto;
  }

  .ship-images-cell {
    display: none;
  }

  .character-portrait {
    width: 36px;
    height: 36px;
  }

  .character-line {
    font-size: 0.8rem;
  }

  .ship-reference {
    font-size: 0.75rem;
  }

  .corporation-line {
    font-size: 0.7rem;
  }

  .corp-logo {
    width: 28px;
    height: 28px;
  }
}
</style>
