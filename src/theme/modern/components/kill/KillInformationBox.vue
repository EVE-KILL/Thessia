<template>
    <div class="kill-information-box md:max-w-[325px]" :class="{ 'is-solo-kill': killmail?.is_solo }">
        <!-- 1. Character Info - Revised Layout -->
        <div class="section victim-presentation-block">
            <!-- Kill Labels Overlay -->
            <div class="kill-labels overlay-labels">
                <span v-if="killmail?.is_solo" class="kill-label solo">{{ $t('solo') }}</span>
                <span v-if="killmail?.is_npc" class="kill-label npc">{{ $t('npc') }}</span>
                <span v-if="isHighValue" class="kill-label value">{{ $t('highValue') }}</span>
            </div>
            <!-- Combined Portraits: Character (Left) + Stacked Corp/Alliance (Right) -->
            <div class="victim-portraits-layout">
                <!-- Main Character/NPC Portrait (Left) -->
                <div class="main-portrait-container">
                    <NuxtLink v-if="killmail?.victim?.character_id" :to="`/character/${killmail.victim.character_id}`"
                        class="portrait-link">
                        <Image :type="'character'" :id="killmail.victim.character_id" :size="128"
                            class="portrait-image character-main" />
                    </NuxtLink>
                    <NuxtLink v-else-if="killmail?.victim?.ship_id && !killmail?.victim?.character_id"
                        :to="`/item/${killmail.victim.ship_id}`" class="portrait-link">
                        <Image :type="'type-icon'" :id="killmail.victim.ship_id" :size="128"
                            class="portrait-image structure-npc-main" />
                    </NuxtLink>
                    <div v-else class="portrait-image placeholder-main" style="width: 128px; height: 128px;"></div>
                </div>

                <!-- Stacked Corp and Alliance Icons (Right) -->
                <div class="stacked-icons-container">
                    <NuxtLink v-if="killmail?.victim?.corporation_id"
                        :to="`/corporation/${killmail.victim.corporation_id}`" class="portrait-link">
                        <Image :type="'corporation'" :id="killmail.victim.corporation_id" :size="64"
                            class="portrait-image corporation-stacked" />
                    </NuxtLink>
                    <div v-else-if="killmail?.victim?.corporation_name" class="portrait-image placeholder-stacked"
                        style="width: 64px; height: 64px;"></div>

                    <NuxtLink v-if="killmail?.victim?.alliance_id" :to="`/alliance/${killmail.victim.alliance_id}`"
                        class="portrait-link">
                        <Image :type="'alliance'" :id="killmail.victim.alliance_id" :size="64"
                            class="portrait-image alliance-stacked" />
                    </NuxtLink>
                    <div v-else-if="killmail?.victim?.faction_id || killmail?.victim?.alliance_name"
                        class="portrait-image placeholder-stacked" style="width: 64px; height: 64px;"></div>
                </div>
            </div>

            <!-- Names Below Portraits -->
            <div class="victim-names-block">
                <div class="entity-name-line name-character truncate">
                    <NuxtLink v-if="killmail?.victim?.character_id" :to="`/character/${killmail.victim.character_id}`"
                        class="entity-link">
                        {{ killmail.victim.character_name }}
                    </NuxtLink>
                    <span v-else>{{ killmail?.victim?.character_name || getLocalizedString(killmail?.victim?.ship_name)
                    }}</span>
                </div>
                <div v-if="killmail?.victim?.corporation_name" class="entity-name-line name-corporation truncate">
                    <NuxtLink v-if="killmail.victim.corporation_id"
                        :to="`/corporation/${killmail.victim.corporation_id}`" class="entity-link">
                        {{ killmail.victim.corporation_name }}
                    </NuxtLink>
                    <span v-else>{{ killmail.victim.corporation_name }}</span>
                </div>
                <div v-if="killmail?.victim?.alliance_name || killmail?.victim?.faction_name"
                    class="entity-name-line name-alliance-faction truncate">
                    <NuxtLink v-if="killmail?.victim?.alliance_id" :to="`/alliance/${killmail.victim.alliance_id}`"
                        class="entity-link">
                        {{ killmail.victim.alliance_name }}
                    </NuxtLink>
                    <NuxtLink v-else-if="killmail?.victim?.faction_id" :to="`/faction/${killmail.victim.faction_id}`"
                        class="entity-link">
                        {{ killmail.victim.faction_name }}
                    </NuxtLink>
                    <span v-else-if="killmail?.victim?.alliance_name">{{ killmail.victim.alliance_name }}</span>
                    <!-- Alliance name without ID -->
                </div>
            </div>
        </div>

        <!-- 2. Ship Info - Simplified -->
        <div class="section simple-info-row">
            <span class="info-label">{{ $t('killInfo.ship') }}:</span>
            <NuxtLink v-if="killmail?.victim?.ship_id" :to="`/item/${killmail.victim.ship_id}`"
                class="entity-link truncate">
                {{ getLocalizedString(killmail?.victim?.ship_name) }}
            </NuxtLink>
            <NuxtLink v-if="killmail?.victim?.ship_group_name" :to="`/group/${killmail.victim.ship_group_id}`"
                class="entity-link truncate">
                ({{ getLocalizedString(killmail?.victim?.ship_group_name) }})
            </NuxtLink>
            <span v-else class="truncate">{{ getLocalizedString(killmail?.victim?.ship_name) }}</span>
        </div>

        <!-- 3. System Info - Simplified -->
        <div class="section simple-info-row">
            <span class="info-label">{{ $t('killInfo.system') }}:</span>
            <NuxtLink v-if="killmail?.system_id" :to="`/system/${killmail.system_id}`" class="entity-link truncate">
                {{ killmail?.system_name }}
            </NuxtLink>
            <span v-else class="truncate">{{ killmail?.system_name }}</span>
            <span :class="['security-status', getSecurityClass(killmail?.system_security)]">
                {{ formatSecurity(killmail?.system_security) }}
            </span>
            <span class="region-in-system truncate">
                (<NuxtLink v-if="killmail?.region_id" :to="`/region/${killmail.region_id}`" class="entity-link">
                    {{ getLocalizedString(killmail?.region_name) }}
                </NuxtLink>
                <span v-else>{{ getLocalizedString(killmail?.region_name) }}</span>)
            </span>
        </div>

        <!-- 4. Location Info - Simplified -->
        <div v-if="killmail?.near" class="section simple-info-row">
            <span class="info-label">{{ $t('killInfo.location') }}:</span>
            <span class="truncate">{{ killmail.near }}</span>
        </div>

        <!-- 5. Time Info - Simplified -->
        <div class="section simple-info-row">
            <span class="info-label">{{ $t('killInfo.time') }}:</span>
            <ClientOnly>
                <span class="time-full truncate">{{ formatDateTime(killmail?.kill_time ? new
                    Date(killmail.kill_time).toISOString() : undefined) }}</span>
                <span class="time-ago truncate">({{ formatTimeAgo(killmail?.kill_time ? new
                    Date(killmail.kill_time).toISOString() : undefined) }})</span>
            </ClientOnly>
        </div>

        <!-- 6. Damage Done - Simplified -->
        <div class="section simple-info-row">
            <span class="info-label">{{ $t('killInfo.damageTaken') }}:</span>
            <Icon name="lucide:zap" class="inline-icon damage-icon" />
            <span class="damage-value truncate">{{ formatNumber(totalDamageTaken) }}</span>
        </div>

        <!-- 7. ISK Figures -->
        <div class="section isk-section">
            <h4 class="section-title">{{ $t('killInfo.iskFigures') }}</h4>
            <div class="isk-grid">
                <div class="isk-item">
                    <span class="isk-label">{{ $t('killInfo.destroyedCost') }}:</span>
                    <span class="isk-value">{{ formatIsk(calculatedDestroyedCost) }}</span>
                </div>
                <div class="isk-item">
                    <span class="isk-label">{{ $t('killInfo.droppedCost') }}:</span>
                    <span class="isk-value">{{ formatIsk(calculatedDroppedCost) }}</span>
                </div>
                <div class="isk-item">
                    <span class="isk-label">{{ $t('killInfo.shipCost') }}:</span>
                    <span class="isk-value">{{ formatIsk(props.killmail?.ship_value || 0) }}</span>
                </div>
                <div class="isk-item">
                    <span class="isk-label">{{ $t('killInfo.fittedCost') }}:</span>
                    <span class="isk-value">{{ formatIsk(props.killmail?.fitting_value || 0) }}</span>
                </div>
                <div class="isk-item total-isk-item">
                    <span class="isk-label">{{ $t('killInfo.totalValue') }}:</span>
                    <span class="isk-value">{{ formatIsk(props.killmail?.total_value || 0) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import moment from "moment";
import { computed, watch } from "vue"; // Added watch
import type { IKillmail } from "~/server/interfaces/IKillmail";

// i18n setup
const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Props definition
const props = defineProps<{
    killmail: IKillmail | null;
}>();

// Define formatted headers
const headers = computed(() => ({
    details: t("killInfo.details"),
    victim: t("killInfo.victim"),
    victimCharacter: t("killInfo.victimCharacter"), // Added
    finalBlow: t("killInfo.finalBlow"),
    character: t("killInfo.character"),
    corporation: t("killInfo.corporation"),
    alliance: t("killInfo.alliance"),
    faction: t("killInfo.faction"),
    ship: t("killInfo.ship"),
    time: t("killInfo.time"),
    system: t("killInfo.system"),
    region: t("killInfo.region"),
    attackers: t("killInfo.attackers"),
    solo: t("killInfo.solo"),
    npc: t("killInfo.npc"),
    highValue: t("killInfo.highValue"),
    location: t("killInfo.location"), // Added
    damageTaken: t("killInfo.damageTaken"), // Added
    iskFigures: t("killInfo.iskFigures"), // Added
    destroyedCost: t("killInfo.destroyedCost"), // Added
    droppedCost: t("killInfo.droppedCost"), // Added
    shipCost: t("killInfo.shipCost"), // Added
    fittedCost: t("killInfo.fittedCost"), // Added
    totalValue: t("killInfo.totalValue"), // Added
}));

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

// Calculated ISK values
const calculatedDestroyedCost = computed<number>(() => {
    if (!props.killmail?.items) return 0;
    return props.killmail.items.reduce((sum, item) => {
        const value = item.singleton === 2 ? item.value / 100 : item.value;
        return sum + (value * item.qty_destroyed);
    }, 0);
});

const calculatedDroppedCost = computed<number>(() => {
    if (!props.killmail?.items) return 0;
    return props.killmail.items.reduce((sum, item) => {
        const value = item.singleton === 2 ? item.value / 100 : item.value;
        return sum + (value * item.qty_dropped);
    }, 0);
});


/**
 * Gets the localized string from a translation object using the current locale
 */
const getLocalizedString = (obj: any): string => {
    const locale = currentLocale.value;
    if (!obj) return "";
    if (typeof obj === 'string') return obj; // if already a string
    return obj[locale] || obj.en || "";
};

/**
 * Format a number with commas as thousands separators
 */
function formatNumber(num: number): string {
    if (typeof num !== 'number') return '0';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
}

/**
 * Format security status with proper coloring
 */
function formatSecurity(security: number | undefined): string {
    if (security === undefined) return "?";
    return security.toFixed(1);
}

/**
 * Get CSS class for security status coloring
 */
function getSecurityClass(security: number | undefined): string {
    if (security === undefined) return "unknown";
    if (security >= 0.9) return "highsec-highest"; // Corrected from 0.95
    if (security >= 0.8) return "highsec-high";
    if (security >= 0.7) return "highsec-medium";
    if (security >= 0.6) return "highsec-low";
    if (security >= 0.5) return "lowsec-high"; // Corrected from 0.45
    if (security >= 0.4) return "lowsec-medium"; // Corrected from 0.35
    if (security >= 0.3) return "lowsec-low";    // Corrected from 0.25
    if (security >= 0.1) return "nullsec-high";  // Corrected from 0.05
    return "nullsec-low";
}

/**
 * Format date and time in local format
 */
function formatDateTime(dateTime: string | undefined): string {
    if (!dateTime) return "";
    moment.locale(currentLocale.value);
    return moment.utc(dateTime).local().format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Format time ago (e.g. "2 hours ago")
 */
function formatTimeAgo(dateTime: string | undefined): string {
    if (!dateTime) return "";
    moment.locale(currentLocale.value);
    return moment.utc(dateTime).fromNow();
}

// Watch for locale changes to update moment locale
watch(
    locale,
    (newLocale) => {
        moment.locale(newLocale);
    },
    { immediate: true },
);
</script>

<style scoped>
.kill-information-box {
    display: flex;
    flex-direction: column;
    width: 100%;
    color: light-dark(#111827, white);
    background-color: transparent;
    gap: 0.15rem;
    /* Reduced main gap between sections */
}

/* Universal truncation class */
.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    display: inline-block;
    /* Important for ellipsis to work with max-width */
}

.section {
    padding: 0.6rem 0.85rem;
    /* Reduced vertical padding */
    border-radius: 0.5rem;
    background-color: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
    /* Slightly transparent background */
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    /* Subtle shadow for depth */
}

.section-title {
    /* For sections that still use a title (Location, Damage, ISK) */
    font-size: 0.75rem;
    /* Further reduced title font size */
    font-weight: 500;
    margin: 0 0 0.4rem;
    /* Reduced bottom margin */
    padding-bottom: 0.15rem;
    /* Reduced bottom padding */
    border-bottom: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    text-transform: uppercase;
    color: light-dark(#6b7280, #9ca3af);
}

/* 1. Character Info Section - Revised Layout */
.victim-presentation-block {
    /* This is a .section itself */
    position: relative;
    /* For positioning overlay labels */
    display: flex;
    flex-direction: column;
    /* Stack portraits layout and names block */
    gap: 0.3rem;
    /* Gap between portraits and names */
}

.victim-portraits-layout {
    display: flex;
    align-items: flex-start;
    /* Align top of char portrait with top of stacked icons */
    gap: 0.25rem;
    /* Small gap between character portrait and stacked icons container */
    justify-content: center;
    /* Center the whole portrait group if section is wider */
}

.main-portrait-container {
    flex-shrink: 0;
}

.main-portrait-container .portrait-image {
    /* For character-main and structure-npc-main */
    width: 128px;
    height: 128px;
    border-radius: 0.375rem;
    /* Slightly more rounded for larger image */
    display: block;
    background-color: rgba(0, 0, 0, 0.2);
}

.main-portrait-container .placeholder-main {
    background-color: rgba(128, 128, 128, 0.1);
    border: 1px dashed rgba(128, 128, 128, 0.3);
    border-radius: 0.375rem;
}

.stacked-icons-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    /* Distribute corp and alliance icons vertically */
    width: 64px;
    /* Width of the stacked column */
    height: 128px;
    /* Match main portrait height */
    flex-shrink: 0;
    gap: 0;
    /* No gap between stacked icons themselves */
}

.stacked-icons-container .portrait-link,
.stacked-icons-container .portrait-image {
    /* For corporation-stacked and alliance-stacked */
    width: 64px;
    height: 64px;
    border-radius: 0.25rem;
    display: block;
    background-color: rgba(0, 0, 0, 0.2);
}

.stacked-icons-container .placeholder-stacked {
    background-color: rgba(128, 128, 128, 0.1);
    border: 1px dashed rgba(128, 128, 128, 0.3);
    border-radius: 0.25rem;
}

.victim-names-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* Center the names text block */
    margin-top: 0.2rem;
    /* Small space above names */
    width: 100%;
    /* Take full width for centering text */
}

.entity-name-line {
    width: 100%;
    text-align: center;
    /* Center text within each line */
    font-size: 0.85rem;
    line-height: 1.3;
    color: light-dark(#525252, #b8b8b8);
}

.entity-name-line.name-character {
    font-size: 0.95rem;
    font-weight: 600;
    color: light-dark(#1f2937, #f3f4f6);
}

.entity-name-line.name-corporation {
    font-size: 0.85rem;
    color: light-dark(#374151, #d1d5db);
}

.entity-name-line.name-alliance-faction {
    font-size: 0.8rem;
    color: light-dark(#4b5563, #9ca3af);
}

.entity-name-line .entity-link {
    color: inherit;
    /* Make links inherit color from parent */
    font-weight: inherit;
    /* Make links inherit font-weight */
}

/* Simplified Info Rows (Ship, System, Time, Damage) */
.simple-info-row {
    /* This is a .section itself */
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem 0.4rem;
    font-size: 0.85rem;
}

.section.simple-info-row {
    padding: 0.4rem 0.85rem;
    /* Consistent padding for these rows */
}

.simple-info-row .info-label {
    font-weight: 500;
    color: light-dark(#4b5563, #c7c7c7);
    flex-shrink: 0;
    margin-right: 0.15rem;
}

.simple-info-row .inline-icon {
    width: 18px;
    height: 18px;
    border-radius: 0.125rem;
    flex-shrink: 0;
}

.simple-info-row .damage-icon {
    color: #ef4444;
    /* Red color for damage icon */
    width: 16px;
    /* Slightly smaller for consistency */
    height: 16px;
}

.simple-info-row .damage-value {
    font-weight: 600;
    color: #ef4444;
    /* Red color for damage value */
}

.simple-info-row .entity-link {
    font-weight: 500;
}

.simple-info-row .security-status {
    margin-left: 0.25rem;
    padding: 0.05rem 0.25rem;
    font-size: 0.7rem;
    border-radius: 0.2rem;
}

.simple-info-row .region-in-system {
    color: light-dark(#6b7280, #9ca3af);
    font-size: 0.8rem;
    margin-left: 0.2rem;
}

.simple-info-row .time-full {
    font-weight: 500;
}

.simple-info-row .time-ago {
    color: light-dark(#6b7280, #9ca3af);
    font-size: 0.8rem;
    margin-left: 0.2rem;
}

/* Styling for Location, ISK sections that keep their titles */
.detail-item {
    /* Used inside Location, ISK sections */
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
}

.detail-icon {
    flex-shrink: 0;
    color: light-dark(#6b7280, #9ca3af);
    /* Icon color */
    font-size: 1.1rem;
    /* Icon size */
}

.detail-content {
    min-width: 0;
    /* Allow shrinking */
    flex-grow: 1;
}

.detail-primary {
    font-weight: 500;
    color: light-dark(#1f2937, #f3f4f6);
}

.detail-secondary {
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
}

.system-section .security-status {
    margin-left: 0.5rem;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: bold;
}

/* Security status colors are defined below */

.location-section .location-text {
    font-style: italic;
}


/* 6. Damage Done Section */
.damage-section .damage-value {
    font-weight: 600;
    color: #ef4444;
    /* Red color for damage */
}

/* 7. ISK Figures Section */
.isk-section .isk-grid {
    display: grid;
    grid-template-columns: 1fr;
    /* Single column for now, can be 1fr 1fr for two columns */
    gap: 0.3rem;
    /* Smaller gap between ISK items */
}

.isk-section .isk-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
}

.isk-section .total-isk-item {
    font-weight: bold;
    margin-top: 0.25rem;
    padding-top: 0.25rem;
    border-top: 1px solid light-dark(rgba(229, 231, 235, 0.2), rgba(75, 85, 99, 0.15));
}

.isk-section .isk-label {
    color: light-dark(#4b5563, #d1d5db);
}

.isk-section .isk-value {
    font-weight: 500;
    color: #38bdf8;
    /* Light blue for ISK values */
}

/* Kill Labels (solo, npc, highValue) - now part of ISK section or general meta */
.kill-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    /* Slightly more gap */
}

.kill-label {
    display: inline-flex;
    font-size: 0.7rem;
    /* Smaller labels */
    padding: 0.1rem 0.4rem;
    border-radius: 9999px;
    /* Pill shape */
    font-weight: 500;
    text-transform: uppercase;
}

.kill-label.solo {
    background-color: rgba(16, 185, 129, 0.15);
    color: rgb(5, 150, 105);
}

.kill-label.npc {
    background-color: rgba(245, 158, 11, 0.15);
    color: rgb(217, 119, 6);
}

.kill-label.value {
    /* High Value */
    background-color: rgba(239, 68, 68, 0.15);
    color: rgb(220, 38, 38);
}

/* Styles for overlay kill labels */
.kill-labels.overlay-labels {
    position: absolute;
    top: 0.5rem;
    /* Adjust as needed for vertical position */
    right: 0.5rem;
    /* Adjust as needed for horizontal position */
    z-index: 10;
    display: flex;
    flex-direction: column;
    /* Stack labels vertically if needed */
    align-items: flex-end;
    /* Align labels to the right */
    gap: 0.25rem;
    /* Space between labels if stacked */
}

.overlay-labels .kill-label {
    /* Base style for overlay labels to ensure readability */
    background-color: rgba(0, 0, 0, 0.4);
    /* Semi-transparent dark background */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    /* Subtle shadow for depth */
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    /* Text shadow for contrast */
    padding: 0.2rem 0.45rem;
    /* Adjusted padding */
    font-size: 0.65rem;
    /* Slightly smaller for overlay */
    font-weight: 600;
    /* Good weight for readability */
    /* Specific color and background from .solo, .npc, .value will still apply if more specific */
    /* Ensure text color is light if background is dark from specific classes */
}

/* Ensure specific label colors are still prominent but with better overlay properties */
.overlay-labels .kill-label.solo,
.overlay-labels .kill-label.npc,
.overlay-labels .kill-label.value {
    color: white;
    /* Override default text color from specific classes if they are dark */
}

/* If specific backgrounds are light, this might need adjustment or use their original text color */
.overlay-labels .kill-label.solo {
    background-color: rgba(5, 150, 105, 0.7);
    /* Darker, more opaque version of original */
}

.overlay-labels .kill-label.npc {
    background-color: rgba(217, 119, 6, 0.7);
    /* Darker, more opaque version of original */
}

.overlay-labels .kill-label.value {
    background-color: rgba(220, 38, 38, 0.7);
    /* Darker, more opaque version of original */
}

/* Links styling */
.entity-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;
}

.entity-link:hover {
    color: #4fc3f7;
    /* Standard hover color */
    text-decoration: underline;
}

/* Security Status Colors */
.security-status.highsec-highest {
    background-color: #2F75FE;
    color: white;
}

.security-status.highsec-high {
    background-color: #2F75FE;
    color: white;
}

/* Merged for simplicity */
.security-status.highsec-medium {
    background-color: #44A5FF;
    color: white;
}

.security-status.highsec-low {
    background-color: #59D2FF;
    color: black;
}

.security-status.lowsec-high {
    background-color: #F9A825;
    color: black;
}

.security-status.lowsec-medium {
    background-color: #FBC02D;
    color: black;
}

.security-status.lowsec-low {
    background-color: #FFD54F;
    color: black;
}

.security-status.nullsec-high {
    background-color: #D32F2F;
    color: white;
}

.security-status.nullsec-low {
    background-color: #E53935;
    color: white;
}

.security-status.unknown {
    background-color: #757575;
    color: white;
}

/* Margin top utility */
.mt-2 {
    margin-top: 0.5rem;
    /* 8px */
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-grow: 1;
    /* Allow items to grow */
    max-width: calc(50% - 0.375rem);
    /* Half width minus half the gap */
}

/* Details section styles */
.details-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    width: 100%;
    /* Ensure full width */
}

/* Location container with system and near */
.location-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    /* Ensure full width */
}

.detail-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
    /* Ensure full width */
}

.detail-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: light-dark(#6b7280, #9ca3af);
    margin-top: 2px;
    width: 16px;
    flex-shrink: 0;
    /* Prevent shrinking */
}

.detail-content {
    min-width: 0;
    flex-grow: 1;
    /* Allow to grow and fill space */
    width: calc(100% - 24px);
    /* Account for icon width and gap */
    overflow: hidden;
}

.detail-primary,
.detail-secondary {
    width: 100%;
    /* Ensure full width */
}

/* Security status colors */
.security-status {
    font-weight: 600;
    padding: 0 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
}

.highsec-highest {
    color: #ecc94b;
}

.highsec-high {
    color: #48bb78;
}

.highsec-medium {
    color: #38a169;
}

.highsec-low {
    color: #68d391;
}

.lowsec-high {
    color: #f6ad55;
}

.lowsec-medium {
    color: #ed8936;
}

.lowsec-low {
    color: #f6ad55;
}

.nullsec-high {
    color: #fc8181;
}

.nullsec-low {
    color: #f56565;
}

.unknown {
    color: #a0aec0;
}

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
