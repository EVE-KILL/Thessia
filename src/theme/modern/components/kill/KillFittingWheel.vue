<template>
  <div class="fitting-wheel-container" :style="containerStyle">
    <div class="fitting-wheel">
      <!-- Outer SVG Ring -->
      <div class="outer-ring">
        <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
          <g>
            <circle cx="256" cy="256" r="224" style="fill: none; stroke: rgb(0, 0, 0); stroke-width: 16;"></circle>
            <rect width="17" height="17" x="98" y="89" style="fill: rgb(0, 0, 0);"></rect>
            <rect width="17" height="17" x="401" y="93" style="fill: rgb(0, 0, 0);"></rect>
            <rect width="17" height="17" x="402" y="401" style="fill: rgb(0, 0, 0);"></rect>
            <rect width="17" height="17" x="94" y="402" style="fill: rgb(0, 0, 0);"></rect>
            <rect width="12" height="12" x="196" y="82" transform="rotate(56)" style="fill: rgb(0, 0, 0);"></rect>
          </g>
        </svg>
      </div>

      <!-- Inner SVG Ring -->
      <div class="inner-ring">
        <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="slot-corners">
              <rect width="512" height="512" x="0" y="0" style="fill: rgb(255, 255, 255);"></rect>
              <rect width="17" height="17" x="133" y="126" style="fill: rgb(0, 0, 0);"></rect>
              <rect width="17" height="17" x="366" y="129" style="fill: rgb(0, 0, 0);"></rect>
              <rect width="17" height="17" x="366" y="366" style="fill: rgb(0, 0, 0);"></rect>
              <rect width="17" height="17" x="132" y="369" style="fill: rgb(0, 0, 0);"></rect>
              <rect width="12" height="12" x="230" y="44" transform="rotate(56)" style="fill: rgb(0, 0, 0);"></rect>
            </mask>
          </defs>
          <g>
            <circle cx="256" cy="256" r="195" mask="url(#slot-corners)" style="fill: none; stroke: rgb(0, 0, 0); stroke-width: 46; stroke-opacity: 0.6;"></circle>
          </g>
        </svg>
      </div>

      <!-- Ship image -->
      <div class="ship-container" :class="{ 'darkened': activeTooltip.visible }">
        <Image
          v-if="killmail && killmail.victim"
          :type="'type-render'"
          :id="killmail.victim.ship_id"
          :size="1024"
          class="ship-image"
        />
        <div v-else class="empty-ship"></div>

        <!-- Center tooltip overlay -->
        <div v-if="activeTooltip.visible" class="center-tooltip-overlay" @mouseenter="keepTooltipVisible" @mouseleave="prepareToHideTooltip">
          <div class="center-tooltip">
            <div class="tooltip-name">{{ activeTooltip.name }}</div>
            <div class="tooltip-value">{{ activeTooltip.value }} {{ $t('common.isk') }}</div>
            <div class="tooltip-status" v-if="activeTooltip.status" v-html="activeTooltip.status"></div>
          </div>
        </div>
      </div>

      <!-- Module slots container -->
      <div class="slots-container">
        <!-- Slot indicators -->
        <div class="slot-indicator high-indicator" :style="getIndicatorPosition('top')">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="radial-menu-high">
                <rect width="12" height="12" x="0" y="0" style="fill: rgb(255, 255, 255); fill-opacity: 0.5;"></rect>
                <rect width="12" height="3" x="0" y="0" style="fill: rgb(255, 255, 255);"></rect>
                <circle cx="6" cy="6" r="5" style="fill: rgb(0, 0, 0);"></circle>
                <rect width="3" height="3" x="0" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="3" x="9" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="3" height="4" x="0" y="9" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="4" x="9" y="9" style="fill: rgb(0, 0, 0);"></rect>
              </mask>
            </defs>
            <g>
              <rect width="12" height="12" x="0" y="0" mask="url(#radial-menu-high)" style="fill: rgb(180, 60, 60);"></rect>
            </g>
          </svg>
        </div>

        <div class="slot-indicator mid-indicator" :style="getIndicatorPosition('right')">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="radial-menu-mid">
                <rect width="12" height="12" x="0" y="0" style="fill: rgb(255, 255, 255); fill-opacity: 0.5;"></rect>
                <rect width="12" height="3" x="0" y="0" style="fill: rgb(255, 255, 255);"></rect>
                <circle cx="6" cy="6" r="5" style="fill: rgb(0, 0, 0);"></circle>
                <rect width="3" height="3" x="0" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="3" x="9" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="3" height="4" x="0" y="9" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="4" x="9" y="9" style="fill: rgb(0, 0, 0);"></rect>
              </mask>
            </defs>
            <g>
              <rect width="12" height="12" x="0" y="0" mask="url(#radial-menu-mid)" style="fill: rgb(60, 120, 180);"></rect>
            </g>
          </svg>
        </div>

        <div class="slot-indicator low-indicator" :style="getIndicatorPosition('bottom')">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="radial-menu-low">
                <rect width="12" height="12" x="0" y="0" style="fill: rgb(255, 255, 255); fill-opacity: 0.5;"></rect>
                <rect width="12" height="3" x="0" y="0" style="fill: rgb(255, 255, 255);"></rect>
                <circle cx="6" cy="6" r="5" style="fill: rgb(0, 0, 0);"></circle>
                <rect width="3" height="3" x="0" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="3" x="9" y="0" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="3" height="4" x="0" y="9" style="fill: rgb(0, 0, 0);"></rect>
                <rect width="4" height="4" x="9" y="9" style="fill: rgb(0, 0, 0);"></rect>
              </mask>
            </defs>
            <g>
              <rect width="12" height="12" x="0" y="0" mask="url(#radial-menu-low)" style="fill: rgb(180, 140, 60);"></rect>
            </g>
          </svg>
        </div>

        <!-- High slots -->
        <div v-for="(item, index) in highSlots" :key="`high-${index}`"
             class="slot high-slot"
             :style="getSlotPosition(index, highSlots.length, 'top')"
             :class="{ 'empty-slot-container': !item }">
          <div v-if="item"
               class="module-container"
               @mouseenter="showTooltip(item)"
               @mouseleave="prepareToHideTooltip"
               @click="togglePinnedTooltip(item)">
            <Image
              :type="'item'"
              :id="item.type_id"
              :name="getLocalizedString(item.name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(item.name, currentLocale.value)"
              class="module-icon"
            />
          </div>
          <div v-else class="empty-slot"></div>

          <!-- Ammo for high slots -->
          <div v-if="getAmmoForSlot(index, 'high')"
               class="ammo-container"
               @mouseenter="showTooltip(getAmmoForSlot(index, 'high'))"
               @mouseleave="prepareToHideTooltip">
            <Image
              :type="'item'"
              :id="getAmmoForSlot(index, 'high').type_id"
              :name="getLocalizedString(getAmmoForSlot(index, 'high').name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(getAmmoForSlot(index, 'high').name, currentLocale.value)"
              class="ammo-icon"
            />
          </div>
        </div>

        <!-- Mid slots -->
        <div v-for="(item, index) in midSlots" :key="`mid-${index}`"
             class="slot mid-slot"
             :style="getSlotPosition(index, midSlots.length, 'right')"
             :class="{ 'empty-slot-container': !item }">
          <div v-if="item"
               class="module-container"
               @mouseenter="showTooltip(item)"
               @mouseleave="prepareToHideTooltip"
               @click="togglePinnedTooltip(item)">
            <Image
              :type="'item'"
              :id="item.type_id"
              :name="getLocalizedString(item.name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(item.name, currentLocale.value)"
              class="module-icon"
            />
          </div>
          <div v-else class="empty-slot"></div>

          <div v-if="getAmmoForSlot(index, 'mid')"
               class="ammo-container"
               @mouseenter="showTooltip(getAmmoForSlot(index, 'mid'))"
               @mouseleave="prepareToHideTooltip">
            <Image
              :type="'item'"
              :id="getAmmoForSlot(index, 'mid').type_id"
              :name="getLocalizedString(getAmmoForSlot(index, 'mid').name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(getAmmoForSlot(index, 'mid').name, currentLocale.value)"
              class="ammo-icon"
            />
          </div>
        </div>

        <!-- Low slots -->
        <div v-for="(item, index) in lowSlots" :key="`low-${index}`"
             class="slot low-slot"
             :style="getSlotPosition(index, lowSlots.length, 'bottom')"
             :class="{ 'empty-slot-container': !item }">
          <div v-if="item"
               class="module-container"
               @mouseenter="showTooltip(item)"
               @mouseleave="prepareToHideTooltip"
               @click="togglePinnedTooltip(item)">
            <Image
              :type="'item'"
              :id="item.type_id"
              :name="getLocalizedString(item.name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(item.name, currentLocale.value)"
              class="module-icon"
            />
          </div>
          <div v-else class="empty-slot"></div>

          <div v-if="getAmmoForSlot(index, 'low')"
               class="ammo-container"
               @mouseenter="showTooltip(getAmmoForSlot(index, 'low'))"
               @mouseleave="prepareToHideTooltip">
            <Image
              :type="'item'"
              :id="getAmmoForSlot(index, 'low').type_id"
              :name="getLocalizedString(getAmmoForSlot(index, 'low').name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(getAmmoForSlot(index, 'low').name, currentLocale.value)"
              class="ammo-icon"
            />
          </div>
        </div>

        <!-- Rig slots -->
        <div v-for="(item, index) in rigSlots" :key="`rig-${index}`"
             class="slot rig-slot"
             :style="getSlotPosition(index, rigSlots.length, 'left')"
             :class="{ 'empty-slot-container': !item }">
          <div v-if="item"
               class="module-container"
               @mouseenter="showTooltip(item)"
               @mouseleave="prepareToHideTooltip"
               @click="togglePinnedTooltip(item)">
            <Image
              :type="'item'"
              :id="item.type_id"
              :name="getLocalizedString(item.name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(item.name, currentLocale.value)"
              class="module-icon"
            />
          </div>
          <div v-else class="empty-slot"></div>
        </div>

        <!-- Subsystem slots for T3 Cruisers -->
        <div v-if="hasSubsystems" v-for="(item, index) in subsystemSlots" :key="`subsystem-${index}`"
             class="slot subsystem-slot"
             :style="getSlotPosition(index, subsystemSlots.length, 'subsystem')"
             :class="{ 'empty-slot-container': !item }">
          <div v-if="item"
               class="module-container"
               @mouseenter="showTooltip(item)"
               @mouseleave="prepareToHideTooltip"
               @click="togglePinnedTooltip(item)">
            <Image
              :type="'item'"
              :id="item.type_id"
              :name="getLocalizedString(item.name, currentLocale.value)"
              :size="64"
              :alt="getLocalizedString(item.name, currentLocale.value)"
              class="module-icon subsystem-icon"
            />
          </div>
          <div v-else class="empty-slot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IKillmail, IItem } from '~/server/interfaces/IKillmail';

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

const props = defineProps<{
  killmail: IKillmail | null;
  maxWidth?: number;
}>();

// Computed style for container to allow dynamic sizing
const containerStyle = computed(() => {
  return {
    maxWidth: props.maxWidth ? `${props.maxWidth}px` : '500px'
  };
});

// EVE Online flag values for different slot types
const HIGH_SLOT_FLAGS = [27, 28, 29, 30, 31, 32, 33, 34];
const MID_SLOT_FLAGS = [19, 20, 21, 22, 23, 24, 25, 26];
const LOW_SLOT_FLAGS = [11, 12, 13, 14, 15, 16, 17, 18];
const RIG_SLOT_FLAGS = [92, 93, 94];
const SUBSYSTEM_FLAGS = [125, 126, 127, 128];

// Item category IDs
const MODULE_CATEGORY_ID = 7; // Modules/Equipment
const AMMO_CATEGORY_ID = 8;   // Charges/Ammo

// Ammo lookup map by flag
const ammoByFlag = ref<Record<number, IItem>>({});

/**
 * Gets the localized string from a translation object using the current locale
 */
const getLocalizedString = (obj: any, locale: string): string => {
  if (!obj) return '';
  return obj[locale] || obj['en'] || '';
};

/**
 * Organizes items into slot positions based on flag values
 * Only returns module items (not ammo)
 */
function organizeSlots(flagRange: number[], maxSlots: number): (IItem | null)[] {
  const slots = Array(maxSlots).fill(null);

  if (!props.killmail || !props.killmail.items || !Array.isArray(props.killmail.items)) {
    return slots;
  }

  props.killmail.items.forEach(item => {
    if (!item) return;

    // Skip ammo items (category_id: 8)
    if (item.category_id === AMMO_CATEGORY_ID) return;

    const flagIndex = flagRange.indexOf(item.flag);
    if (flagIndex !== -1 && flagIndex < maxSlots) {
      slots[flagIndex] = item;
    }
  });

  return slots;
}

/**
 * Organizes all ammo items and maps them by flag
 */
function organizeAmmo() {
  if (!props.killmail || !props.killmail.items || !Array.isArray(props.killmail.items)) {
    return;
  }

  // Clear previous ammo data
  ammoByFlag.value = {};

  // Organize ammo by flag
  props.killmail.items.forEach(item => {
    if (!item || item.category_id !== AMMO_CATEGORY_ID) return;

    // Store ammo by its flag
    ammoByFlag.value[item.flag] = item;
  });
}

/**
 * Gets ammo for a specific slot position
 */
function getAmmoForSlot(slotIndex: number, slotType: 'high' | 'mid' | 'low'): IItem | null {
  let flagValue: number;

  // Get the flag value for this slot
  switch (slotType) {
    case 'high':
      flagValue = HIGH_SLOT_FLAGS[slotIndex];
      break;
    case 'mid':
      flagValue = MID_SLOT_FLAGS[slotIndex];
      break;
    case 'low':
      flagValue = LOW_SLOT_FLAGS[slotIndex];
      break;
    default:
      return null;
  }

  // Return the ammo for this flag (if it exists)
  return ammoByFlag.value[flagValue] || null;
}

/**
 * Calculates the position of a slot in the circular layout
 */
function getSlotPosition(index: number, total: number, position: string): Record<string, string> {
  // Adjust radius to ensure proper curve
  let radius = 42;
  let angle = 0;

  // Fine-tune angles for each slot type to create a smoother curve
  switch (position) {
    case 'top':
      angle = -125 + (index * 10.5);
      break;
    case 'right':
      angle = 0 - 37 + (index * 10.5);
      break;
    case 'bottom':
      angle = 90 - 36 + (index * 10.5);
      break;
    case 'left':
      angle = 218 - 22 + (index * 10.5);
      break;
    case 'subsystem':
      angle = 170 - 30 + (index * 10.5);
      break;
    default:
      angle = 0;
  }

  const rad = angle * (Math.PI / 180);
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  };
}

/**
 * Calculates the position for slot type indicators
 */
function getIndicatorPosition(position: string): Record<string, string> {
  const radius = 42;
  let angle = 0;

  switch (position) {
    case 'top':
      angle = -125 - 9;
      break;
    case 'right':
      angle = -35 - 10;
      break;
    case 'bottom':
      angle = 90 - 35 - 10;
      break;
    default:
      angle = 0;
  }

  const rad = angle * (Math.PI / 180);
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  };
}

// Group items by slot type
const highSlots = computed(() => organizeSlots(HIGH_SLOT_FLAGS, 8));
const midSlots = computed(() => organizeSlots(MID_SLOT_FLAGS, 8));
const lowSlots = computed(() => organizeSlots(LOW_SLOT_FLAGS, 8));
const rigSlots = computed(() => organizeSlots(RIG_SLOT_FLAGS, 3));
const subsystemSlots = computed(() => organizeSlots(SUBSYSTEM_FLAGS, 4));
const hasSubsystems = computed(() => {
  if (!props.killmail || !props.killmail.items) return false;
  return subsystemSlots.value.some(item => item !== null);
});

// Initialize ammo when killmail changes
watch(() => props.killmail, () => {
  if (props.killmail) {
    organizeAmmo();
  }
}, { immediate: true });

/**
 * Formats a number with commas as thousands separators
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Tooltip state with enhanced reactive properties
const activeTooltip = reactive({
  visible: false,
  name: '',
  value: '',
  status: '',
  isPinned: false // Property to track if tooltip is pinned (clicked)
});

// Tooltip handling
let tooltipTimer: NodeJS.Timeout | null = null;
let currentItem: IItem | null = null;
const HIDE_DELAY = 150; // Short delay before hiding tooltip to prevent flickering

// Create reactive tooltip translations for dropped/destroyed text
const tooltipText = computed(() => ({
  dropped: t('killFittingWheel.dropped'),
  destroyed: t('killFittingWheel.destroyed')
}));

// Update tooltip properties when locale changes
watch(locale, () => {
  if (activeTooltip.visible && currentItem) {
    // Rebuild the status text with new translations and simplified format
    let status = '';
    if (currentItem.qty_dropped > 0 && currentItem.qty_destroyed > 0) {
      status = `<span class="status-dropped">${tooltipText.value.dropped}</span> & <span class="status-destroyed">${tooltipText.value.destroyed}</span>`;
    } else if (currentItem.qty_dropped > 0) {
      status = `<span class="status-dropped">${tooltipText.value.dropped}</span>`;
    } else if (currentItem.qty_destroyed > 0) {
      status = `<span class="status-destroyed">${tooltipText.value.destroyed}</span>`;
    }

    // Update tooltip with new localized content
    activeTooltip.name = getLocalizedString(currentItem.name, currentLocale.value);
    activeTooltip.status = status;
  }
});

/**
 * Shows the tooltip for an item
 */
function showTooltip(item: IItem) {
  // Clear any existing hide timer
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }

  // If a different item is being displayed, update immediately
  if (currentItem !== item || !activeTooltip.visible) {
    // Store current item for reference
    currentItem = item;

    // Calculate item status text - SIMPLIFIED to just show "Dropped" or "Destroyed" without quantities
    let status = '';
    if (item.qty_dropped > 0 && item.qty_destroyed > 0) {
      status = `<span class="status-dropped">${tooltipText.value.dropped}</span> & <span class="status-destroyed">${tooltipText.value.destroyed}</span>`;
    } else if (item.qty_dropped > 0) {
      status = `<span class="status-dropped">${tooltipText.value.dropped}</span>`;
    } else if (item.qty_destroyed > 0) {
      status = `<span class="status-destroyed">${tooltipText.value.destroyed}</span>`;
    }

    // Set tooltip content
    activeTooltip.name = getLocalizedString(item.name, currentLocale.value);
    activeTooltip.value = formatNumber(item.value);
    activeTooltip.status = status;
    activeTooltip.visible = true;
  }
}

/**
 * Toggles pinning the tooltip when an item is clicked
 */
function togglePinnedTooltip(item: IItem) {
  if (currentItem === item && activeTooltip.visible) {
    // Toggle pinned state
    activeTooltip.isPinned = !activeTooltip.isPinned;
  } else {
    // Show the tooltip and pin it
    showTooltip(item);
    activeTooltip.isPinned = true;
  }
}

/**
 * Keep tooltip visible when hovering over it
 */
function keepTooltipVisible() {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
}

/**
 * Prepares to hide the tooltip with a short delay
 * This prevents flickering when moving between items
 */
function prepareToHideTooltip() {
  // Don't hide if tooltip is pinned
  if (activeTooltip.isPinned) return;

  // Set a timer to hide the tooltip
  if (tooltipTimer) clearTimeout(tooltipTimer);

  tooltipTimer = setTimeout(() => {
    if (!activeTooltip.isPinned) {
      currentItem = null;
      activeTooltip.visible = false;
    }
  }, HIDE_DELAY);
}

// Add a click handler to unpin tooltip when clicking outside
onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', (e) => {
      // If clicking outside the fitting wheel, unpin the tooltip
      const target = e.target as HTMLElement;
      const isOutsideWheel = !target.closest('.fitting-wheel');

      if (isOutsideWheel && activeTooltip.isPinned) {
        activeTooltip.isPinned = false;
        prepareToHideTooltip();
      }
    });
  }
});

// Clean up on component unmount
onBeforeUnmount(() => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
  }

  // Remove document click handler
  if (import.meta.client) {
    document.removeEventListener('click', () => {});
  }
});
</script>

<style scoped>
.fitting-wheel-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 0 auto;
}

.fitting-wheel {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 50%;
  background-color: transparent;
  border: none;
  overflow: hidden;
}

.fitting-wheel::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 1px;
  right: 1px;
  bottom: 1px;
  border-radius: 50%;
  border: 1px solid rgba(40, 40, 40, 0.8);
  z-index: 2;
  pointer-events: none;
}

.outer-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 4;
  pointer-events: none;
}

.inner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  pointer-events: none;
}

.ship-container {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  border-radius: 50%;
  overflow: hidden;
  background-color: transparent;
  transition: filter 0.2s ease-in-out;
}

.ship-container.darkened .ship-image {
  filter: brightness(0.4) blur(1px);
  transition: filter 0.2s ease-in-out;
}

.ship-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  clip-path: circle(49%);
}

.empty-ship {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  border: 2px dashed rgba(60, 60, 60, 0.5);
}

.slots-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
}

.slot {
  position: absolute;
  width: 42px;
  height: 42px;
  background-color: rgba(20, 20, 20, 0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 6;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.module-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 7;
  position: relative;
}

.module-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0% 50% 50% 50%;
  transition: transform 0.1s ease-in-out;
  position: relative;
  z-index: 8;
}

.module-icon:hover {
  transform: scale(1.05);
  cursor: pointer;
}

/* Ammo styling */
.ammo-container {
  position: absolute;
  width: 24px;
  height: 24px;
  background-color: rgba(20, 20, 20, 0.3);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  border: 1px solid rgba(80, 80, 80, 0.3);
  transition: transform 0.1s ease-in-out;
}

.ammo-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  position: relative;
  z-index: 10;
}

.ammo-container:hover {
  transform: scale(1.1);
}

/* Position adjustments for different slot types */
.high-slot .ammo-container {
  bottom: -12px;
  left: 50%;
  transform: translateX(-80%);
}

.mid-slot .ammo-container {
  left: -12px;
  top: 50%;
  transform: translateY(-80%);
}

.low-slot .ammo-container {
  top: -12px;
  left: 50%;
  transform: translateX(-80%);
}

/* Position adjustments for ammo containers */
.high-slot .ammo-container {
  top: 28px;
  left: 30px;
  background-color: rgba(0, 0, 0, 0.3)
}

.mid-slot .ammo-container {
  top: 35px;
  left: -5px;
}

.low-slot .ammo-container {
  top: 16px;
  right: -16px;
}

.empty-slot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(10, 10, 10, 0.15);
  border: 1px dashed rgba(60, 60, 60, 0.3);
}

.high-slot {
  border-color: rgba(180, 60, 60, 0.4);
}

.mid-slot {
  border-color: rgba(60, 120, 180, 0.4);
}

.low-slot {
  border-color: rgba(180, 140, 60, 0.4);
}

.rig-slot {
  border-color: rgba(150, 150, 150, 0.4);
  background-color: rgba(40, 40, 40, 0.2);
  box-shadow: 0 0 6px rgba(100, 100, 100, 0.3);
}

.subsystem-slot {
  border-color: rgba(140, 60, 140, 0.4);
  background-color: rgba(40, 20, 40, 0.2);
  box-shadow: 0 0 6px rgba(120, 40, 120, 0.3);
}

.slot-indicator {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 6;
  transform-origin: center;
  pointer-events: none;
}

.high-indicator svg {
  transform: rotate(-125deg);
}

.mid-indicator svg {
  transform: rotate(-35deg);
}

.low-indicator svg {
  transform: rotate(55deg);
}

.empty-slot-container {
  opacity: 0;
  pointer-events: none;
}

/* Make sure tooltips appear above everything */
:deep(.u-tooltip) {
  z-index: 100;
}

/* Override button styles to preserve icon appearance */
:deep(.u-button) {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

:deep(.u-button):hover, :deep(.u-button):focus {
  background: transparent;
  transform: none;
}

/* Center tooltip overlay */
.center-tooltip-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  backdrop-filter: blur(3px);
  transition: all 0.2s ease-in-out;
}

/* Enhanced tooltip with sophisticated fade-to-transparent effect */
.center-tooltip {
  width: 80%;
  max-width: 280px;
  padding: 1.25rem;
  background: radial-gradient(
    circle,
    rgba(26, 32, 44, 0.85) 0%,      /* Dark center with high opacity */
    rgba(22, 28, 40, 0.7) 50%,       /* Mid-fade */
    rgba(15, 23, 42, 0.4) 80%,       /* More faded */
    rgba(15, 23, 42, 0) 100%         /* Completely transparent at edges */
  );
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  animation: fadeIn 0.15s ease-out;
  color: #e2e8f0;
}

/* Add glow effect behind the tooltip text for better readability */
.tooltip-name {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.tooltip-value {
  font-size: 1rem;
  color: #4fc3f7;
  margin-bottom: 10px;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

.tooltip-status {
  font-size: 0.95rem;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

/* Add subtle text outline to status colors for better visibility */
.status-dropped, .status-destroyed {
  font-weight: 500;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.status-dropped {
  color: #81c784;
}

.status-destroyed {
  color: #e57373;
}

/* Override deep selectors for nested status spans */
:deep(.tooltip-status .status-dropped),
:deep(.tooltip-status .status-destroyed) {
  font-weight: 500;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

:deep(.tooltip-status .status-dropped) {
  color: #81c784;
}

:deep(.tooltip-status .status-destroyed) {
  color: #e57373;
}

/* Fade-in animation for the tooltip */
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Module and ammo hover effects */
.module-container:hover .module-icon,
.ammo-container:hover .ammo-icon {
  transform: scale(1.1);
  filter: brightness(1.1);
  transition: all 0.1s ease;
}

/* Add a subtle pulsing effect to the active module */
@keyframes subtlePulse {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
  100% { filter: brightness(1); }
}

.module-icon.active,
.ammo-icon.active {
  animation: subtlePulse 1.5s infinite;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
}

/* Mobile responsive adjustments */
@media (max-width: 500px) {
  .slot {
    width: 36px;
    height: 36px;
  }

  .ammo-container {
    width: 20px;
    height: 20px;
  }

  .high-slot .ammo-container {
    top: 25px;
    right: -20px;
  }

  .mid-slot .ammo-container {
    top: 25px;
    right: -20px;
  }

  .low-slot .ammo-container {
    top: 14px;
    right: -14px;
  }
}
</style>
