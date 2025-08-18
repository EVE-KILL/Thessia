<template>
    <div class="killmail-page">
        <!-- Desktop Layout -->
        <div v-if="!isMobile" class="flex flex-wrap mt-4 gap-4">
            <!-- Scroll to comments button -->
            <ScrollTo targetSelector="#comments-section" title="Go to comments" :bottomOffset="80" />
            <KillNavbar :killmail="killmail" :battle="battle" :siblings="siblings" />
            <!-- Left Container -->
            <div class="flex-1 min-w-0 text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
                <!-- Header -->
                <div>
                    <div id="information-area" class="flex flex-col md:flex-row justify-around">
                        <!-- Fitting Wheel - Increased size container -->
                        <div class="w-full flex justify-center items-center">
                            <template v-if="pending">
                                <div class="fitting-wheel-skeleton max-w-[650px]">
                                    <!-- Outer SVG ring -->
                                    <div class="skeleton-outer-ring">
                                        <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
                                            <g>
                                                <circle cx="256" cy="256" r="224"
                                                    style="fill: none; stroke: rgba(40, 40, 40, 0.5); stroke-width: 16;">
                                                </circle>
                                                <rect width="17" height="17" x="98" y="89"
                                                    style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                                <rect width="17" height="17" x="401" y="93"
                                                    style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                                <rect width="17" height="17" x="402" y="401"
                                                    style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                                <rect width="17" height="17" x="94" y="402"
                                                    style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                                <rect width="12" height="12" x="196" y="82" transform="rotate(56)"
                                                    style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                            </g>
                                        </svg>
                                    </div>

                                    <!-- Inner SVG ring -->
                                    <div class="skeleton-inner-ring">
                                        <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <mask id="skeleton-slot-corners">
                                                    <rect width="512" height="512" x="0" y="0"
                                                        style="fill: rgba(255, 255, 255, 0.2);"></rect>
                                                    <rect width="17" height="17" x="133" y="126"
                                                        style="fill: rgb(0, 0, 0);"></rect>
                                                    <rect width="17" height="17" x="366" y="129"
                                                        style="fill: rgb(0, 0, 0);"></rect>
                                                    <rect width="17" height="17" x="366" y="366"
                                                        style="fill: rgb(0, 0, 0);"></rect>
                                                    <rect width="17" height="17" x="132" y="369"
                                                        style="fill: rgb(0, 0, 0);"></rect>
                                                    <rect width="12" height="12" x="230" y="44" transform="rotate(56)"
                                                        style="fill: rgb(0, 0, 0);"></rect>
                                                </mask>
                                            </defs>
                                            <g>
                                                <circle cx="256" cy="256" r="195" mask="url(#skeleton-slot-corners)"
                                                    style="fill: none; stroke: rgba(40, 40, 40, 0.3); stroke-width: 46; stroke-opacity: 0.6;">
                                                </circle>
                                            </g>
                                        </svg>
                                    </div>

                                    <!-- Ship skeleton -->
                                    <div class="skeleton-ship">
                                        <USkeleton class="h-full w-full" />
                                    </div>

                                    <!-- Slot indicators -->
                                    <div class="skeleton-indicator high-indicator"
                                        :style="getSkeletonSlotPosition('indicator', 'top')">
                                        <div class="indicator-svg">
                                            <USkeleton class="h-full w-full rounded-sm" />
                                        </div>
                                    </div>
                                    <div class="skeleton-indicator mid-indicator"
                                        :style="getSkeletonSlotPosition('indicator', 'right')">
                                        <div class="indicator-svg">
                                            <USkeleton class="h-full w-full rounded-sm" />
                                        </div>
                                    </div>
                                    <div class="skeleton-indicator low-indicator"
                                        :style="getSkeletonSlotPosition('indicator', 'bottom')">
                                        <div class="indicator-svg">
                                            <USkeleton class="h-full w-full rounded-sm" />
                                        </div>
                                    </div>

                                    <!-- Slot skeletons for modules -->
                                    <div v-for="i in 8" :key="`high-${i}`"
                                        :style="getSkeletonSlotPosition(i - 1, 8, 'top')"
                                        class="skeleton-slot high-slot">
                                        <USkeleton class="h-full w-full" />
                                    </div>
                                    <div v-for="i in 8" :key="`mid-${i}`"
                                        :style="getSkeletonSlotPosition(i - 1, 8, 'right')"
                                        class="skeleton-slot mid-slot">
                                        <USkeleton class="h-full w-full" />
                                    </div>
                                    <div v-for="i in 8" :key="`low-${i}`"
                                        :style="getSkeletonSlotPosition(i - 1, 8, 'bottom')"
                                        class="skeleton-slot low-slot">
                                        <USkeleton class="h-full w-full" />
                                    </div>
                                    <div v-for="i in 3" :key="`rig-${i}`"
                                        :style="getSkeletonSlotPosition(i - 1, 3, 'left')"
                                        class="skeleton-slot rig-slot">
                                        <USkeleton class="h-full w-full" />
                                    </div>
                                </div>
                            </template>
                            <KillFittingWheel v-else-if="killmail" :killmail="killmail" :hideFitting="shouldHideFitting"
                                :max-width="1000" style="min-width: 350px" />
                            <div v-else class="text-center py-8">
                                <p>{{ t('error.killmail_not_found') }}</p>
                            </div>
                        </div>

                        <!-- Kill Information - Adjusted width -->
                        <div class="information-box ml-0 md:ml-4 md:mt-0 w-full md:w-3/5 lg:w-1/2 max-w-[325px]">
                            <template v-if="pending">
                                <div class="grid gap-4">
                                    <!-- Ship section skeleton -->
                                    <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                                        <div class="flex items-center gap-3">
                                            <USkeleton class="h-16 w-16 rounded-md flex-shrink-0" />
                                            <div class="flex flex-col gap-2 flex-grow min-w-0">
                                                <USkeleton class="h-6 w-full" />
                                                <div class="flex justify-between">
                                                    <USkeleton class="h-5 w-24" />
                                                    <div class="flex gap-1">
                                                        <USkeleton class="h-5 w-12" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Victim section skeleton -->
                                    <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                                        <USkeleton class="h-5 w-24 mb-2" />
                                        <div class="flex items-start gap-3 mb-2">
                                            <div class="relative">
                                                <USkeleton class="h-12 w-12" />
                                                <USkeleton class="h-8 w-8 absolute bottom-[-4px] right-[-4px]" />
                                            </div>
                                            <div class="flex flex-col gap-1 flex-grow min-w-0">
                                                <USkeleton class="h-5 w-32" />
                                                <USkeleton class="h-4 w-28" />
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1 mb-2">
                                            <USkeleton class="h-6 w-6" />
                                            <USkeleton class="h-4 w-32" />
                                        </div>
                                        <div class="grid grid-cols-2 gap-2">
                                            <div class="flex items-center gap-1">
                                                <USkeleton class="h-4 w-4" />
                                                <USkeleton class="h-4 w-full" />
                                            </div>
                                            <div class="flex items-center gap-1">
                                                <USkeleton class="h-4 w-4" />
                                                <USkeleton class="h-4 w-full" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Details section skeleton -->
                                    <div class="section p-3 rounded-lg bg-background-800 bg-opacity-30">
                                        <div class="grid gap-3">
                                            <div class="flex items-start gap-2">
                                                <USkeleton class="h-4 w-4 mt-1 flex-shrink-0" />
                                                <div class="flex flex-col gap-1 min-w-0">
                                                    <USkeleton class="h-5 w-40" />
                                                    <USkeleton class="h-4 w-32" />
                                                </div>
                                            </div>
                                            <div class="flex items-start gap-2">
                                                <USkeleton class="h-4 w-4 mt-1 flex-shrink-0" />
                                                <div class="flex flex-col gap-1 min-w-0">
                                                    <div class="flex items-center gap-1">
                                                        <USkeleton class="h-5 w-28" />
                                                        <USkeleton class="h-5 w-8 rounded-md" />
                                                    </div>
                                                    <USkeleton class="h-4 w-36" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <KillInformationBox v-else :killmail="killmail" />
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="mt-4">
                    <template v-if="pending">
                        <div class="kill-items-skeleton">
                            <!-- Table header skeleton -->
                            <div class="skeleton-header">
                                <div class="skeleton-cell image-cell"></div>
                                <div class="skeleton-cell name-cell">
                                    <USkeleton class="h-5 w-16" />
                                </div>
                                <div class="skeleton-cell quantity-cell">
                                    <USkeleton class="h-5 w-24" />
                                </div>
                                <div class="skeleton-cell value-cell">
                                    <USkeleton class="h-5 w-16" />
                                </div>
                            </div>

                            <!-- Hull section -->
                            <div class="skeleton-row section-header">
                                <div class="skeleton-cell image-cell"></div>
                                <div class="skeleton-cell name-cell">
                                    <USkeleton class="h-5 w-32" />
                                </div>
                                <div class="skeleton-cell quantity-cell"></div>
                                <div class="skeleton-cell value-cell"></div>
                            </div>

                            <!-- Ship row -->
                            <div class="skeleton-row item-row">
                                <div class="skeleton-cell image-cell">
                                    <USkeleton class="h-8 w-8 rounded-md" />
                                </div>
                                <div class="skeleton-cell name-cell">
                                    <USkeleton class="h-5 w-40" />
                                </div>
                                <div class="skeleton-cell quantity-cell">
                                    <div class="badge-container">
                                        <USkeleton class="h-5 w-10" />
                                    </div>
                                </div>
                                <div class="skeleton-cell value-cell">
                                    <USkeleton class="h-5 w-24" />
                                </div>
                            </div>

                            <!-- Repeat for other sections -->
                            <div v-for="section in 3" :key="`section-${section}`">
                                <!-- Section header -->
                                <div class="skeleton-row section-header">
                                    <div class="skeleton-cell image-cell"></div>
                                    <div class="skeleton-cell name-cell">
                                        <USkeleton class="h-5 w-36" />
                                    </div>
                                    <div class="skeleton-cell quantity-cell"></div>
                                    <div class="skeleton-cell value-cell"></div>
                                </div>

                                <!-- Regular items -->
                                <div v-for="i in 3" :key="`item-${section}-${i}`" class="skeleton-row item-row">
                                    <div class="skeleton-cell image-cell">
                                        <USkeleton class="h-6 w-6 rounded-md" />
                                    </div>
                                    <div class="skeleton-cell name-cell">
                                        <USkeleton class="h-5 w-48" />
                                    </div>
                                    <div class="skeleton-cell quantity-cell">
                                        <div class="badge-container">
                                            <USkeleton class="h-5 w-8" />
                                            <USkeleton class="h-5 w-8" />
                                        </div>
                                    </div>
                                    <div class="skeleton-cell value-cell">
                                        <USkeleton class="h-5 w-20" />
                                    </div>
                                </div>

                                <!-- Add one nested item for the second section -->
                                <div v-if="section === 2" class="skeleton-row item-row nested-item">
                                    <div class="skeleton-cell image-cell">
                                        <div class="connector">
                                            <USkeleton class="h-4 w-4" />
                                        </div>
                                        <USkeleton class="h-6 w-6 rounded-md ml-5" />
                                    </div>
                                    <div class="skeleton-cell name-cell">
                                        <USkeleton class="h-5 w-36" />
                                    </div>
                                    <div class="skeleton-cell quantity-cell">
                                        <div class="badge-container">
                                            <USkeleton class="h-5 w-8" />
                                        </div>
                                    </div>
                                    <div class="skeleton-cell value-cell">
                                        <USkeleton class="h-5 w-20" />
                                    </div>
                                </div>

                                <!-- Subtotal row -->
                                <div class="skeleton-row subtotal-row">
                                    <div class="skeleton-cell image-cell"></div>
                                    <div class="skeleton-cell name-cell">
                                        <USkeleton class="h-5 w-20" />
                                    </div>
                                    <div class="skeleton-cell quantity-cell">
                                        <div class="badge-container">
                                            <USkeleton class="h-5 w-8" />
                                            <USkeleton class="h-5 w-8" />
                                        </div>
                                    </div>
                                    <div class="skeleton-cell value-cell">
                                        <USkeleton class="h-5 w-24" />
                                    </div>
                                </div>
                            </div>

                            <!-- Total row -->
                            <div class="skeleton-row total-row">
                                <div class="skeleton-cell image-cell"></div>
                                <div class="skeleton-cell name-cell">
                                    <USkeleton class="h-5 w-16 font-bold" />
                                </div>
                                <div class="skeleton-cell quantity-cell"></div>
                                <div class="skeleton-cell value-cell">
                                    <USkeleton class="h-6 w-28" />
                                </div>
                            </div>
                        </div>
                    </template>
                    <KillItems v-else-if="killmail" :killmail="killmail" :hideFitting="shouldHideFitting" />
                    <div v-else class="text-center py-8">
                        <p>{{ t('error.killmail_not_found') }}</p>
                    </div>
                </div>
            </div>

            <!-- Right Container -->
            <div
                class="w-full md:w-2/5 lg:w-1/3 xl:max-w-md text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
                <template v-if="pending">
                    <!-- Skeleton content for attackers -->
                    <div class="p-4">
                        <div class="grid gap-4">
                            <div v-for="i in 8" :key="i"
                                class="flex items-center gap-3 p-2 border-b border-background-800">
                                <div class="relative">
                                    <USkeleton class="h-10 w-10" />
                                    <USkeleton class="h-6 w-6 absolute -bottom-1 -right-1" />
                                </div>
                                <div class="grid gap-1 flex-1 min-w-0">
                                    <div class="flex justify-between">
                                        <USkeleton class="h-5 w-32" />
                                        <USkeleton class="h-5 w-16" />
                                    </div>
                                    <div class="flex justify-between">
                                        <USkeleton class="h-4 w-24" />
                                        <USkeleton class="h-4 w-12" />
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <USkeleton class="h-4 w-4" />
                                        <USkeleton class="h-4 w-20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                <div v-else-if="killmail">
                    <KillAttackers :killmail="killmail" />
                    <div id="comments-section"></div>
                    <KillComments :killId="killmail.killmail_id" @comment-count-changed="updateCommentCount" />
                </div>
                <div v-else class="text-center py-8">
                    <p>{{ t('error.killmail_not_found') }}</p>
                </div>
            </div>
        </div>

        <!-- Mobile Layout -->
        <div v-else class="mt-4">
            <div class="text-black dark:text-white bg-background-900 rounded-md overflow-hidden">
                <template v-if="pending">
                    <!-- Skeleton tabs -->
                    <div class="border-b border-background-700">
                        <div class="flex gap-2 p-2 overflow-x-auto">
                            <USkeleton v-for="i in 5" :key="i" class="h-8 w-20 flex-shrink-0" />
                        </div>
                    </div>
                    <!-- Skeleton content -->
                    <div class="p-4">
                        <!-- Enhanced fitting wheel skeleton -->
                        <div class="fitting-wheel-skeleton mx-auto mb-4">
                            <!-- Outer SVG ring -->
                            <div class="skeleton-outer-ring">
                                <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
                                    <g>
                                        <circle cx="256" cy="256" r="224"
                                            style="fill: none; stroke: rgba(40, 40, 40, 0.5); stroke-width: 16;">
                                        </circle>
                                        <rect width="17" height="17" x="98" y="89" style="fill: rgba(40, 40, 40, 0.3);">
                                        </rect>
                                        <rect width="17" height="17" x="401" y="93"
                                            style="fill: rgba(40, 40, 40, 0.3);">
                                        </rect>
                                        <rect width="17" height="17" x="402" y="401"
                                            style="fill: rgba(40, 40, 40, 0.3);">
                                        </rect>
                                        <rect width="17" height="17" x="94" y="402"
                                            style="fill: rgba(40, 40, 40, 0.3);">
                                        </rect>
                                        <rect width="12" height="12" x="196" y="82" transform="rotate(56)"
                                            style="fill: rgba(40, 40, 40, 0.3);"></rect>
                                    </g>
                                </svg>
                            </div>

                            <!-- Inner SVG ring -->
                            <div class="skeleton-inner-ring">
                                <svg viewBox="24 24 464 464" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <mask id="skeleton-slot-corners-mobile">
                                            <rect width="512" height="512" x="0" y="0"
                                                style="fill: rgba(255, 255, 255, 0.2);"></rect>
                                            <rect width="17" height="17" x="133" y="126" style="fill: rgb(0, 0, 0);">
                                            </rect>
                                            <rect width="17" height="17" x="366" y="129" style="fill: rgb(0, 0, 0);">
                                            </rect>
                                            <rect width="17" height="17" x="366" y="366" style="fill: rgb(0, 0, 0);">
                                            </rect>
                                            <rect width="17" height="17" x="132" y="369" style="fill: rgb(0, 0, 0);">
                                            </rect>
                                            <rect width="12" height="12" x="230" y="44" transform="rotate(56)"
                                                style="fill: rgb(0, 0, 0);"></rect>
                                        </mask>
                                    </defs>
                                    <g>
                                        <circle cx="256" cy="256" r="195" mask="url(#skeleton-slot-corners-mobile)"
                                            style="fill: none; stroke: rgba(40, 40, 40, 0.3); stroke-width: 46; stroke-opacity: 0.6;">
                                        </circle>
                                    </g>
                                </svg>
                            </div>

                            <!-- Ship skeleton -->
                            <div class="skeleton-ship">
                                <USkeleton class="h-full w-full" />
                            </div>

                            <!-- Slot indicators -->
                            <div class="skeleton-indicator high-indicator"
                                :style="getSkeletonSlotPosition('indicator', 'top')">
                                <div class="indicator-svg">
                                    <USkeleton class="h-full w-full rounded-sm" />
                                </div>
                            </div>
                            <div class="skeleton-indicator mid-indicator"
                                :style="getSkeletonSlotPosition('indicator', 'right')">
                                <div class="indicator-svg">
                                    <USkeleton class="h-full w-full rounded-sm" />
                                </div>
                            </div>
                            <div class="skeleton-indicator low-indicator"
                                :style="getSkeletonSlotPosition('indicator', 'bottom')">
                                <div class="indicator-svg">
                                    <USkeleton class="h-full w-full rounded-sm" />
                                </div>
                            </div>

                            <!-- Slot skeletons for modules -->
                            <div v-for="i in 8" :key="`mobile-high-${i}`"
                                :style="getSkeletonSlotPosition(i - 1, 8, 'top')" class="skeleton-slot high-slot">
                                <USkeleton class="h-full w-full" />
                            </div>
                            <div v-for="i in 8" :key="`mobile-mid-${i}`"
                                :style="getSkeletonSlotPosition(i - 1, 8, 'right')" class="skeleton-slot mid-slot">
                                <USkeleton class="h-full w-full" />
                            </div>
                            <div v-for="i in 8" :key="`mobile-low-${i}`"
                                :style="getSkeletonSlotPosition(i - 1, 8, 'bottom')" class="skeleton-slot low-slot">
                                <USkeleton class="h-full w-full" />
                            </div>
                            <div v-for="i in 3" :key="`mobile-rig-${i}`"
                                :style="getSkeletonSlotPosition(i - 1, 3, 'left')" class="skeleton-slot rig-slot">
                                <USkeleton class="h-full w-full" />
                            </div>
                        </div>
                    </div>
                </template>
                <Tabs v-else-if="killmail" v-model="activeTabId" :items="mobileTabs" :class="tabsUi">
                    <!-- Fitting Wheel Tab -->
                    <template #fitting="{ item }">
                        <div class="flex justify-center">
                            <KillFittingWheel :key="killmail.killmail_id" :killmail="killmail"
                                :hideFitting="shouldHideFitting" />
                        </div>
                    </template>

                    <!-- Items Tab -->
                    <template #items="{ item }">
                        <div class="">
                            <KillItems :killmail="killmail" :hideFitting="shouldHideFitting" />
                        </div>
                    </template>

                    <!-- Info Tab -->
                    <template #info="{ item }">
                        <div class="p-4">
                            <KillInformationBox :killmail="killmail" />
                        </div>
                    </template>

                    <!-- Attackers Tab -->
                    <template #attackers="{ item }">
                        <div class="p-2">
                            <KillAttackers :killmail="killmail" />
                        </div>
                    </template>

                    <!-- Comments Tab -->
                    <template #comments="{ item }">
                        <div class="">
                            <div id="comments-section"></div>
                            <KillComments :killId="killmail.killmail_id" @comment-count-changed="updateCommentCount" />
                        </div>
                    </template>
                </Tabs>
                <div v-else class="text-center py-8">
                    <p>{{ t('error.killmail_not_found') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const { generateKillmailDatasetStructuredData, addStructuredDataToHead } = useStructuredData();
const commentCount = ref(0);
const configStore = useConfigurationStore();

// Responsive layout
const { isMobile } = useResponsive();

// Common UI configuration for tabs
const tabsUi = {
    list: "mb-0 border-b border-background-700",
    tab: {
        base: "text-sm inline-flex items-center h-10 px-4 cursor-pointer",
        active: "text-black dark:text-white font-medium",
        inactive: "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white",
    },
    panel: "p-0 sm:p-0",
};

// Mobile tabs
const mobileTabs = computed(() => [
    {
        id: "fitting",
        label: "Fitting",
        slot: "fitting",
        icon: "i-lucide-circle",
    },
    {
        id: "items",
        label: "Items",
        slot: "items",
        icon: "i-lucide-package",
    },
    {
        id: "info",
        label: "Info",
        slot: "info",
        icon: "i-lucide-info",
    },
    {
        id: "attackers",
        label: "Attackers",
        slot: "attackers",
        icon: "i-lucide-users",
        trailing: killmail.value?.attackers?.length
            ? `(${killmail.value.attackers.length})`
            : undefined,
    },
    {
        id: "comments",
        label: "Comments",
        slot: "comments",
        icon: "i-lucide-message-square",
        trailing: commentCount.value ? `(${commentCount.value})` : undefined,
    },
]);

// Fetch killmail with proper SSR blocking
const { data: fetchedKillmail, pending } = await useAsyncData<IKillmail | null>(
    `killmail-${route.params.id || "none"}`,
    async () => {
        if (!route.params.id) return null;

        try {
            const response = await $fetch<IKillmail>(`/api/killmail/${route.params.id}`);
            return response;
        } catch (error) {
            console.error("Error fetching killmail:", error);
            return null;
        }
    },
    {
        server: true, // Ensure this runs on the server
        lazy: false, // Don't delay the initial render
    },
);

// Fetch battle status independently
const { data: battleStatus } = await useAsyncData<{ inBattle: boolean }>(
    `battle-status-${route.params.id || "none"}`,
    async () => {
        if (!route.params.id) return { inBattle: false };
        try {
            const result = await $fetch<{ inBattle: boolean }>(`/api/battles/killmail/${route.params.id}/inbattle`);
            return result;
        } catch (error) {
            return { inBattle: false };
        }
    },
    {
        server: true,
        lazy: false,
    },
);

// Fetch sibling killmails during SSR to prevent hydration mismatches
const { data: fetchedSiblings } = await useAsyncData<Array<{ killmail_id: number; victim: { ship_id: number; ship_name: any } }>>(
    `siblings-${route.params.id || "none"}`,
    async () => {
        if (!route.params.id) return [];
        try {
            const siblingResponse = await $fetch<Array<{ killmail_id: number; victim: { ship_id: number; ship_name: any } }>>(
                `/api/killmail/${route.params.id}/sibling`
            );
            return Array.isArray(siblingResponse) ? siblingResponse : [];
        } catch (error) {
            console.error("Error fetching sibling killmails:", error);
            return [];
        }
    },
    {
        server: true,
        lazy: false,
    },
);

// Fetch configuration data during SSR to prevent flash of unhidden content
const { data: configurationData } = await useAsyncData<{ configurations: any[] }>(
    `configuration-${route.params.id || "none"}`,
    async () => {
        if (!route.params.id) return { configurations: [] };

        try {
            // First get the killmail to extract the victim's character ID
            const killmailResponse = await $fetch<IKillmail>(`/api/killmail/${route.params.id}`);
            if (!killmailResponse?.victim?.character_id) {
                return { configurations: [] };
            }

            // Then fetch configurations for that character
            const configResponse = await $fetch<{ configurations: any[] }>(`/api/configurations`, {
                query: {
                    characterId: killmailResponse.victim.character_id
                }
            });

            return configResponse;
        } catch (error) {
            console.error("Error fetching configuration data:", error);
            return { configurations: [] };
        }
    },
    {
        server: true,
        lazy: false,
    },
);

const battle = computed(() => battleStatus.value?.inBattle ?? false);
const siblings = computed(() => fetchedSiblings.value || []);

// Use the fetched killmail directly instead of a separate reactive ref
const killmail = computed(() => {
    const result = fetchedKillmail.value || null;
    return result;
});

// Privacy settings computed property - use SSR data directly to prevent flash
const shouldHideFitting = computed(() => {
    // First try to get from SSR configuration data
    const configs = configurationData.value?.configurations || [];
    const hideFittingConfig = configs.find(config => config.key === 'hideFitting');

    if (hideFittingConfig) {
        return hideFittingConfig.value;
    }

    // Fallback to store (for when store is populated on client)
    return configStore.getConfiguration('hideFitting', false);
});

// Set up configuration store for client-side use (settings pages, etc.)
if (import.meta.client) {
    watch(killmail, async (newKillmail) => {
        if (newKillmail?.victim?.character_id) {
            configStore.setContext({
                characterId: newKillmail.victim.character_id,
                corporationId: null,
                allianceId: null
            });
            await configStore.loadConfigurations();
        }
    }, { immediate: true });
}

// Set up SEO meta tags using a computed property that handles null/undefined values safely
const seoData = computed(() => {
    if (!fetchedKillmail.value) return null;

    const data = fetchedKillmail.value as IKillmail;
    const finalAttacker =
        data.attackers.length > 0 ? data.attackers[data.attackers.length - 1] : null;

    return {
        title: `${data.killmail_id} | ${data.victim.character_name || "Unknown"} | ${data.victim.ship_name?.en || "Unknown Ship"} | ${data.system_name}`,
        ogImage: `https://images.evetech.net/types/${data.victim.ship_id}/render?size=512`,
        description: finalAttacker
            ? `${data.victim.character_name || "Unknown"} lost ${data.victim.ship_name?.en || "Unknown Ship"} in ${data.system_name} to ${finalAttacker.character_name || "Unknown"} in ${finalAttacker.ship_name?.en || "Unknown Ship"} - ${formatIsk(data.total_value)}`
            : `${data.victim.character_name || "Unknown"} lost ${data.victim.ship_name?.en || "Unknown Ship"} in ${data.system_name} - ${formatIsk(data.total_value)}`,
    };
});

// Apply SEO meta tags when available
useSeoMeta({
    title: computed(() => seoData.value?.title || "Killmail | EVE-KILL"),
    ogTitle: computed(() => seoData.value?.title || "Killmail | EVE-KILL"),
    twitterTitle: computed(() => seoData.value?.title || "Killmail | EVE-KILL"),

    description: computed(() => seoData.value?.description || "EVE Online killmail details"),
    ogDescription: computed(() => seoData.value?.description || "EVE Online killmail details"),
    twitterDescription: computed(() => seoData.value?.description || "EVE Online killmail details"),

    ogImage: computed(() => seoData.value?.ogImage || "https://eve-kill.com/icon.png"),
    twitterImage: computed(() => seoData.value?.ogImage || "https://eve-kill.com/icon.png"),

    // Keep the rest of your meta tags
    ogType: "website",
    ogSiteName: "EVE-KILL",
    ogUrl: computed(() =>
        fetchedKillmail.value ? `/kill/${(fetchedKillmail.value as IKillmail).killmail_id}` : "",
    ),
    ogLocale: "en_US",
    twitterCard: "summary_large_image",
    twitterSite: "@eve_kill",
    twitterImageAlt: computed(() =>
        fetchedKillmail.value ? (fetchedKillmail.value as IKillmail).victim?.ship_name?.en || "EVE Ship" : "EVE Ship"
    ),
    twitterImageWidth: "512",
    twitterImageHeight: "512",
    twitterCreator: "@eve_kill",
});

// Add structured data when killmail is available
watch(
    () => killmail.value,
    async (newKillmail) => {
        if (newKillmail && import.meta.client) {
            // Generate and add dataset structured data
            try {
                const killmailWithUrl = {
                    ...newKillmail,
                    url: `https://eve-kill.com/kill/${newKillmail.killmail_id}`
                };

                const datasetStructuredData = generateKillmailDatasetStructuredData(killmailWithUrl);
                addStructuredDataToHead(datasetStructuredData);
            } catch (error) {
                console.error("Error generating killmail structured data:", error);
            }

            // Handle comment fragment navigation
            nextTick(() => {
                handleCommentFragment();
            });
        }
    },
    { immediate: true },
);

// Update comment count from child component
function updateCommentCount(count: number) {
    commentCount.value = count;
}

/**
 * Calculates the position for skeleton slots
 */
function getSkeletonSlotPosition(
    index: number | string,
    total?: number | string,
    position?: string,
): Record<string, string> {
    // Use the same radius as the actual component for consistency
    const radius = 42;
    let angle = 0;

    // Handle the case where index is 'indicator'
    if (index === "indicator" && typeof total === "string") {
        // In this case, total is actually the position ('top', 'right', 'bottom')
        switch (total) {
            case "top":
                angle = -125 - 9;
                break;
            case "right":
                angle = -35 - 10;
                break;
            case "bottom":
                angle = 90 - 35 - 10;
                break;
            default:
                angle = 0;
        }
    }
    // Handle normal slot positioning - exactly matching the KillFittingWheel component logic
    else if (typeof index === "number" && typeof total === "number" && position) {
        switch (position) {
            case "top":
                angle = -125 + index * 10.5;
                break;
            case "right":
                angle = 0 - 37 + index * 10.5;
                break;
            case "bottom":
                angle = 90 - 36 + index * 10.5;
                break;
            case "left":
                angle = 218 - 22 + index * 10.5;
                break;
            default:
                angle = 0;
        }
    }

    const rad = angle * (Math.PI / 180);
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);

    // Round to prevent hydration mismatches due to floating-point precision
    const roundedX = Math.round(x * 1000) / 1000;
    const roundedY = Math.round(y * 1000) / 1000;

    return {
        left: `${roundedX}%`,
        top: `${roundedY}%`,
        transform: "translate(-50%, -50%)",
    };
}

// Default tab selection for mobile
const activeTabId = ref("fitting");

// Handle comment fragment navigation
function handleCommentFragment() {
    if (import.meta.client) {
        const fragment = window.location.hash;
        if (fragment?.startsWith("#comment-")) {
            // If we have a comment fragment, switch to the comments tab
            if (isMobile.value) {
                activeTabId.value = "comments";
            }
        }
    }
}

// Update Tabs to use the activeTabId
watch(
    () => killmail.value,
    () => {
        if (killmail.value && import.meta.client) {
            nextTick(() => {
                handleCommentFragment();
            });
        }
    },
    { immediate: true },
);

// Listen for hash changes to update tab selection when fragments change
onMounted(() => {
    if (import.meta.client) {
        window.addEventListener("hashchange", handleCommentFragment);
    }
});

onBeforeUnmount(() => {
    if (import.meta.client) {
        window.removeEventListener("hashchange", handleCommentFragment);
    }
});
</script>

<style scoped>
@media (min-width: 768px) {
    .information-box {
        flex: 1;
        flex-basis: 70%;
    }
}

:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

:deep(tbody tr + tr) {
    border-top: 1px solid rgb(40, 40, 40) !important;
}

:deep(tbody tr):hover {
    background: light-dark(#e5e7eb, #1a1a1a);
}

/* Fix tab overflow scrolling on mobile */
:deep(.u-tabs-list) {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
}

/* Mobile specific styles */
@media (max-width: 767px) {
    :deep(.u-tabs-list) {
        justify-content: flex-start;
    }

    :deep(.u-tab-item) {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
    }
}

/* Simplified fitting wheel skeleton styles */
.fitting-wheel-skeleton {
    position: relative;
    width: 100%;
    max-width: 600px;
    /* Increased from 500px */
    height: 0;
    padding-bottom: 100%;
    /* Maintain 1:1 aspect ratio */
    margin: 0 auto;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(128, 128, 128, 0.1);
}

.skeleton-ring {
    position: absolute;
    border-radius: 50%;
    background-color: transparent;
}

.outer-skeleton-ring {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 8px solid rgba(128, 128, 128, 0.2);
}

.inner-skeleton-ring {
    top: 15%;
    left: 15%;
    width: 70%;
    height: 70%;
    border: 6px solid rgba(128, 128, 128, 0.15);
}

.skeleton-ship {
    position: absolute;
    top: 20%;
    left: 20%;
    width: 60%;
    height: 60%;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(128, 128, 128, 0.1);
}

.skeleton-slot {
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: transparent;
}

.skeleton-slot.high-slot {
    border: 1px solid rgba(180, 60, 60, 0.2);
}

.skeleton-slot.mid-slot {
    border: 1px solid rgba(60, 120, 180, 0.2);
}

.skeleton-slot.low-slot {
    border: 1px solid rgba(180, 140, 60, 0.2);
}

.skeleton-slot.rig-slot {
    border: 1px solid rgba(150, 150, 150, 0.2);
}

.skeleton-indicator {
    position: absolute;
    width: 18px;
    height: 18px;
    z-index: 6;
    transform-origin: center;
}

/* Custom table skeleton styles */
.custom-table-skeleton {
    width: 100%;
}

.table-header-skeleton {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgb(40, 40, 40);
    background-color: rgba(26, 26, 26, 0.5);
}

.table-row-skeleton {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px;
    padding: 0.4rem 1rem;
    border-bottom: 1px solid rgb(40, 40, 40);
    align-items: center;
}

.table-row-skeleton.header-row {
    background-color: rgba(26, 26, 26, 0.7);
    padding: 0.3rem 1rem;
    height: 2rem;
}

.table-row-skeleton.value-row {
    background-color: rgba(40, 40, 40, 0.3);
    font-weight: 600;
}

.cell.value-cell {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

/* Responsive adjustments */
@media (max-width: 500px) {
    .skeleton-slot {
        width: 24px;
        height: 24px;
    }
}

@media (max-width: 768px) {
    .fitting-wheel-skeleton {
        max-width: 400px;
        /* Increased from 300px */
    }
}

/* Enhanced fitting wheel skeleton styles */
.fitting-wheel-skeleton {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: 0;
    padding-bottom: 100%;
    /* Maintain 1:1 aspect ratio */
    margin: 0 auto;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(30, 30, 30, 0.05);
}

.skeleton-outer-ring,
.skeleton-inner-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.skeleton-outer-ring {
    z-index: 4;
}

.skeleton-inner-ring {
    z-index: 3;
}

.skeleton-ship {
    position: absolute;
    top: 20%;
    left: 20%;
    width: 60%;
    height: 60%;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(40, 40, 40, 0.1);
    z-index: 1;
}

.skeleton-slot {
    position: absolute;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    overflow: hidden;
    background-color: rgba(30, 30, 30, 0.1);
    z-index: 5;
}

.skeleton-slot.high-slot {
    border: 1px solid rgba(180, 60, 60, 0.2);
}

.skeleton-slot.mid-slot {
    border: 1px solid rgba(60, 120, 180, 0.2);
}

.skeleton-slot.low-slot {
    border: 1px solid rgba(180, 140, 60, 0.2);
}

.skeleton-slot.rig-slot {
    border: 1px solid rgba(150, 150, 150, 0.2);
}

.skeleton-indicator {
    position: absolute;
    width: 18px;
    height: 18px;
    z-index: 6;
    transform-origin: center;
}

.skeleton-indicator.high-indicator .indicator-svg {
    background-color: rgba(180, 60, 60, 0.2);
    height: 100%;
    width: 100%;
    transform: rotate(-125deg);
}

.skeleton-indicator.mid-indicator .indicator-svg {
    background-color: rgba(60, 120, 180, 0.2);
    height: 100%;
    width: 100%;
    transform: rotate(-35deg);
}

.skeleton-indicator.low-indicator .indicator-svg {
    background-color: rgba(180, 140, 60, 0.2);
    height: 100%;
    width: 100%;
    transform: rotate(55deg);
}

/* Remove duplicate style blocks */
.outer-skeleton-ring,
.inner-skeleton-ring,
.skeleton-ring {
    display: none;
}

/* Responsive adjustments */
@media (max-width: 500px) {
    .skeleton-slot {
        width: 36px;
        height: 36px;
    }
}

@media (max-width: 768px) {
    .fitting-wheel-skeleton {
        max-width: 400px;
    }
}

/* Enhanced KillItems skeleton styles */
.kill-items-skeleton {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
}

.skeleton-header,
.skeleton-row {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px;
    padding: 0.5rem 1rem;
    align-items: center;
    border-bottom: 1px solid rgba(40, 40, 40, 0.5);
}

.skeleton-header {
    background-color: rgba(26, 26, 26, 0.5);
}

.section-header {
    background-color: rgba(26, 26, 26, 0.7);
    padding: 0.3rem 1rem;
    margin-top: 0.5rem;
    height: 2.2rem;
}

.item-row {
    background-color: transparent;
}

.nested-item {
    background-color: rgba(40, 40, 40, 0.15);
    position: relative;
}

.nested-item .image-cell {
    position: relative;
}

.connector {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 16px;
    width: 16px;
    opacity: 0.7;
}

.subtotal-row {
    background-color: rgba(40, 40, 40, 0.2);
    font-weight: 500;
}

.total-row {
    background-color: rgba(40, 40, 40, 0.3);
    font-weight: 600;
    margin-top: 0.5rem;
}

.skeleton-cell.value-cell {
    display: flex;
    justify-content: flex-end;
}

.badge-container {
    display: flex;
    gap: 0.35rem;
    justify-content: flex-start;
}

/* Responsive adjustments for mobile */
@media (max-width: 640px) {

    .skeleton-header,
    .skeleton-row {
        grid-template-columns: 50px 1fr 80px 80px;
        padding: 0.5rem;
    }

    .badge-container {
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
    }
}
</style>
