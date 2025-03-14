<template>
  <ul class="flex items-center space-x-4">
    <li>
      <a href="/" class="text-white hover:text-background-400 bg-black">Home</a>
    </li>
    <li @mouseenter="openKillsDropdown" @mouseleave="closeKillsDropdown">
      <div class="relative">
        <button class="text-white hover:text-background-400 focus:outline-none">
          Kills
        </button>
        <ul
          v-if="isKillsDropdownOpen"
          class="absolute left-0 mt-2 w-96 bg-black rounded-md shadow-lg z-10 grid grid-cols-3 gap-y-1"
        >
          <li>
            <a
              href="/kills/latest"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Latest
            </a>
          </li>
          <li>
            <a
              href="/kills/abyssal"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Abyssal
            </a>
          </li>
          <li>
            <a
              href="/kills/wspace"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              W-Space
            </a>
          </li>
          <li>
            <a
              href="/kills/highsec"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Highsec
            </a>
          </li>
          <li>
            <a
              href="/kills/lowsec"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Lowsec
            </a>
          </li>
          <li>
            <a
              href="/kills/nullsec"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Nullsec
            </a>
          </li>
          <li>
            <a
              href="/kills/big"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Big
            </a>
          </li>
          <li>
            <a
              href="/kills/solo"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Solo
            </a>
          </li>
          <li>
            <a
              href="/kills/npc"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              NPC
            </a>
          </li>
          <li>
            <a
              href="/kills/5b"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              +5b
            </a>
          </li>
          <li>
            <a
              href="/kills/10b"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              +10b
            </a>
          </li>
          <li>
            <a
              href="/kills/citadels"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Citadels
            </a>
          </li>
          <li>
            <a
              href="/kills/t1"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              T1
            </a>
          </li>
          <li>
            <a
              href="/kills/t2"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              T2
            </a>
          </li>
          <li>
            <a
              href="/kills/t3"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              T3
            </a>
          </li>
          <li>
            <a
              href="/kills/frigate"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Frigate
            </a>
          </li>
          <li>
            <a
              href="/kills/destroyers"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Destroyers
            </a>
          </li>
          <li>
            <a
              href="/kills/cruisers"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Cruisers
            </a>
          </li>
          <li>
            <a
              href="/kills/battlecruisers"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Battlecruisers
            </a>
          </li>
          <li>
            <a
              href="/kills/battleships"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Battleships
            </a>
          </li>
          <li>
            <a
              href="/kills/capitals"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Capitals
            </a>
          </li>
          <li>
            <a
              href="/kills/freighters"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Freighters
            </a>
          </li>
          <li>
            <a
              href="/kills/supercarriers"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Supercarriers
            </a>
          </li>
          <li>
            <a
              href="/kills/titans"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Titans
            </a>
          </li>
        </ul>
      </div>
    </li>
    <li>
      <a href="/lists" class="text-white hover:text-background-400">Lists</a>
    </li>
    <li>
      <a href="/campaigns" class="text-white hover:text-background-400">Campaigns</a>
    </li>
    <li @mouseenter="openHelperDropdown" @mouseleave="closeHelperDropdown">
      <div class="relative">
        <button class="text-white hover:text-background-400 focus:outline-none">
          Lil' Helpers
        </button>
        <ul
          v-if="isHelperDropdownOpen"
          class="absolute left-0 mt-2 w-48 bg-background-800 rounded-md shadow-lg z-10"
        >
          <li>
            <a
              href="/littlehelper/pilotlookup"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Pilot Lookup
            </a>
          </li>
          <li>
            <a
              href="/littlehelper/dscan"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              DScan
            </a>
          </li>
          <li>
            <a
              href="/littlehelper/localscan"
              class="block px-4 py-2 text-sm text-white hover:bg-background-700 hover:text-yellow-500"
            >
              Local Scan
            </a>
          </li>
        </ul>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const isKillsDropdownOpen = ref(false);
const isHelperDropdownOpen = ref(false);
let closeKillsDropdownTimeout: ReturnType<typeof setTimeout>;
let closeHelperDropdownTimeout: ReturnType<typeof setTimeout>;

function openKillsDropdown() {
  clearTimeout(closeKillsDropdownTimeout);
  isKillsDropdownOpen.value = true;
}

function closeKillsDropdown() {
  closeKillsDropdownTimeout = setTimeout(() => {
    isKillsDropdownOpen.value = false;
  }, 200);
}

function openHelperDropdown() {
  clearTimeout(closeHelperDropdownTimeout);
  isHelperDropdownOpen.value = true;
}

function closeHelperDropdown() {
  closeHelperDropdownTimeout = setTimeout(() => {
    isHelperDropdownOpen.value = false;
  }, 200);
}
</script>

<style scoped>
/* Add your component-specific styles here */
</style>
