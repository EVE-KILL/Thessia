<template>
  <div class="fitting-wheel-container">
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
      <div class="ship-container">
        <img
          v-if="killmail && killmail.victim"
          :src="`https://images.evetech.net/types/${killmail.victim.ship_id}/render?size=1024`"
          :alt="getLocalizedName(killmail?.victim?.ship_name)"
          class="ship-image"
        />
        <div v-else class="empty-ship"></div>
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
          <img v-if="item"
               :src="`https://images.evetech.net/types/${item.type_id}/icon?size=64`"
               :alt="getLocalizedName(item.name)"
               class="module-icon" />
          <div v-else class="empty-slot"></div>
        </div>

        <!-- Mid slots -->
        <div v-for="(item, index) in midSlots" :key="`mid-${index}`"
             class="slot mid-slot"
             :style="getSlotPosition(index, midSlots.length, 'right')"
             :class="{ 'empty-slot-container': !item }">
          <img v-if="item"
               :src="`https://images.evetech.net/types/${item.type_id}/icon?size=64`"
               :alt="getLocalizedName(item.name)"
               class="module-icon" />
          <div v-else class="empty-slot"></div>
        </div>

        <!-- Low slots -->
        <div v-for="(item, index) in lowSlots" :key="`low-${index}`"
             class="slot low-slot"
             :style="getSlotPosition(index, lowSlots.length, 'bottom')"
             :class="{ 'empty-slot-container': !item }">
          <img v-if="item"
               :src="`https://images.evetech.net/types/${item.type_id}/icon?size=64`"
               :alt="getLocalizedName(item.name)"
               class="module-icon" />
          <div v-else class="empty-slot"></div>
        </div>

        <!-- Rig slots -->
        <div v-for="(item, index) in rigSlots" :key="`rig-${index}`"
             class="slot rig-slot"
             :style="getSlotPosition(index, rigSlots.length, 'left')"
             :class="{ 'empty-slot-container': !item }">
          <img v-if="item"
               :src="`https://images.evetech.net/types/${item.type_id}/icon?size=64`"
               :alt="getLocalizedName(item.name)"
               class="module-icon" />
          <div v-else class="empty-slot"></div>
        </div>

        <!-- Subsystem slots for T3 cruisers -->
        <template v-if="hasSubsystems">
          <div v-for="(item, index) in subsystemSlots" :key="`subsystem-${index}`"
               class="slot subsystem-slot"
               :style="getSlotPosition(index, subsystemSlots.length, 'subsystem')"
               :class="{ 'empty-slot-container': !item }">
            <img v-if="item"
                 :src="`https://images.evetech.net/types/${item.type_id}/icon?size=64`"
                 :alt="getLocalizedName(item.name)"
                 class="module-icon" />
            <div v-else class="empty-slot"></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IKillmail, IItem } from '~/server/interfaces/IKillmail';
import type { ITranslation } from '~/server/interfaces/ITranslation';

const props = defineProps<{
  killmail: IKillmail | null;
}>();

// EVE Online flag values for different slot types
const HIGH_SLOT_FLAGS = [27, 28, 29, 30, 31, 32, 33, 34];
const MID_SLOT_FLAGS = [19, 20, 21, 22, 23, 24, 25, 26];
const LOW_SLOT_FLAGS = [11, 12, 13, 14, 15, 16, 17, 18];
const RIG_SLOT_FLAGS = [92, 93, 94];
const SUBSYSTEM_FLAGS = [125, 126, 127, 128];

/**
 * Gets the localized name from a translation object
 */
const getLocalizedName = (translation: ITranslation | string | undefined): string => {
  if (!translation) return 'Unknown';

  if (typeof translation === 'string') {
    return translation;
  }

  if (translation.en) {
    return translation.en;
  }

  const keys = Object.keys(translation);
  if (keys.length > 0) {
    return translation[keys[0]];
  }

  return 'Unknown';
};

/**
 * Organizes items into slot positions based on flag values
 */
function organizeSlots(flagRange: number[], maxSlots: number): (IItem | null)[] {
  const slots = Array(maxSlots).fill(null);

  if (!props.killmail || !props.killmail.items || !Array.isArray(props.killmail.items)) {
    return slots;
  }

  props.killmail.items.forEach(item => {
    if (!item) return;

    const flagIndex = flagRange.indexOf(item.flag);
    if (flagIndex !== -1 && flagIndex < maxSlots) {
      slots[flagIndex] = item;
    }
  });

  return slots;
}

/**
 * Calculates the position of a slot in the circular layout
 */
function getSlotPosition(index: number, total: number, position: string): Record<string, string> {
  let radius = 42;
  let angle = 0;

  switch (position) {
    case 'top':
      angle = -125 + (index * 10);
      break;
    case 'right':
      angle = 0 - 35 + (index * 10);
      break;
    case 'bottom':
      angle = 90 - 35 + (index * 10);
      break;
    case 'left':
      angle = 218 - 20 + (index * 10);
      break;
    case 'subsystem':
      angle = 170 - 25 + (index * 12);
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
</script>

<style scoped>
.fitting-wheel-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 500px;
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
  background-color: rgba(20, 20, 20, 1);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 6;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.module-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
}

.empty-slot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(10, 10, 10, 0.3);
  border: 1px dashed rgba(60, 60, 60, 0.5);
}

.high-slot {
  border-color: rgba(180, 60, 60, 0.8);
}

.mid-slot {
  border-color: rgba(60, 120, 180, 0.8);
}

.low-slot {
  border-color: rgba(180, 140, 60, 0.8);
}

.rig-slot {
  border-color: rgba(150, 150, 150, 0.9);
  background-color: rgba(40, 40, 40, 0.7);
  box-shadow: 0 0 6px rgba(100, 100, 100, 0.5);
}

.subsystem-slot {
  border-color: rgba(140, 60, 140, 0.9);
  background-color: rgba(40, 20, 40, 0.7);
  box-shadow: 0 0 6px rgba(120, 40, 120, 0.5);
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

@media (max-width: 500px) {
  .slot {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 350px) {
  .slot {
    width: 30px;
    height: 30px;
  }
}
</style>
