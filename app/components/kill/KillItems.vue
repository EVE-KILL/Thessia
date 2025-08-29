<template>
    <!-- Custom inline table implementation -->
    <div class="kill-items-table">
        <!-- Desktop view -->
        <div class="desktop-table" v-show="!isMobile">
            <!-- Table header -->
            <div class="table-header">
                <div class="header-cell image-cell"><!-- Image column --></div>
                <div class="header-cell name-cell">{{ t("item") }}</div>
                <div class="header-cell dropped-cell">
                    <span class="header-label">{{ t("dropped") }}</span>
                </div>
                <div class="header-cell destroyed-cell">
                    <span class="header-label">{{ t("destroyed") }}</span>
                </div>
                <div class="header-cell value-cell">
                    <span class="header-label">{{ t("value") }}</span>
                </div>
            </div>

            <!-- Table body -->
            <div class="table-body">
                <TransitionGroup name="table-row" tag="div" class="transition-group">
                    <template v-for="(item, index) in data" :key="`item-${index}`">
                        <div class="table-row" :class="getRowClasses(item)">
                        <!-- Image cell -->
                        <div class="body-cell image-cell">
                            <div class="image-cell-content" :class="{
                                'indented-image': item.isNested,
                                'privacy-blur': props.hideFitting && isFittingItem(item) && (item.type === 'item' || item.type === 'container-item')
                            }">
                                <template v-if="item.isNested">
                                    <div class="connector-line">
                                        <Icon name="lucide:corner-down-right" class="connector-icon" />
                                    </div>
                                </template>

                                <!-- Show collapse icon for headers if collapsible -->
                                <Icon v-if="item.type === 'header' && item.itemName && isCollapsible(item.itemName)"
                                    :name="item.itemName && isSectionCollapsed(item.itemName) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                                    class="collapse-icon"
                                    :class="{ 'rotate-icon': item.itemName && !isSectionCollapsed(item.itemName) }"
                                    @click.stop="item.itemName && toggleSectionCollapse(item.itemName)" />

                                <!-- Show image only when not a skin -->
                                <Image
                                    v-if="(item.type === 'item' || item.type === 'container-item') && item.itemId && !isSkin(item.itemName || '')"
                                    :type="isBlueprint(item.itemName || '') ? 'blueprint-copy' : 'item'"
                                    :id="item.itemId" size="24" class="w-7 h-7"
                                    :alt="props.hideFitting && isFittingItem(item) ? '[REDACTED]' : (item.itemName || '')" />
                            </div>
                        </div>

                        <!-- Name cell with click handler only for non-header rows, or header rows that are collapsible -->
                        <div class="body-cell name-cell" 
                             @click="(item.type !== 'header' || (item.itemName && isCollapsible(item.itemName))) && handleRowClick(item, $event)">
                            <div v-if="item.type === 'header'" class="font-bold text-sm uppercase section-header-name">
                                {{ item.itemName }}
                                <span v-if="item.itemName && isCollapsible(item.itemName)" class="section-count">
                                    ({{ getSectionItemCount(item.itemName) }})
                                </span>
                            </div>
                            <div v-else-if="item.type === 'item' || item.type === 'container-item'" class="font-medium"
                                :class="{ 'privacy-blur': props.hideFitting && isFittingItem(item) }">
                                <!-- Add click handler directly to the name wrapper for containers -->
                                <div class="item-name-wrapper" :class="{ 'container-name': item.isContainer }"
                                    @click.stop="item.isContainer && item.containerId && toggleContainerCollapse(item.containerId)">
                                    <!-- Container name first, then the icon -->
                                    {{ props.hideFitting && isFittingItem(item) ? '[REDACTED]' : item.itemName }}
                                    <!-- Add collapse/expand control for containers after name -->
                                    <Icon v-if="item.isContainer && item.containerId"
                                        :name="isContainerCollapsed(item.containerId) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                                        class="container-collapse-icon"
                                        @click.stop="item.containerId && toggleContainerCollapse(item.containerId, $event)" />
                                </div>
                            </div>
                            <div v-else-if="item.type === 'value'" class="font-medium">{{ item.itemName }}</div>
                        </div>

                        <!-- Dropped cell -->
                        <div class="body-cell dropped-cell">
                            <template v-if="item.type === 'header' && item.itemName">
                                <!-- Show sorting controls for sections with more than 1 item -->
                                <div v-if="getSectionItemCount(item.itemName) > 1"
                                    class="sort-column-header text-center sortable-header"
                                    @click.stop="handleHeaderClick('dropped', item.itemName)">
                                    <span class="sort-label">{{ t('dropped') }}</span>
                                    <Icon v-if="currentSortColumn === 'dropped' && currentSortSection === item.itemName"
                                        :name="currentSortDirection === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                                        class="sort-icon active" />
                                    <Icon v-else name="lucide:arrow-up-down" class="sort-icon inactive" />
                                </div>
                                <!-- Empty div for non-sortable sections to maintain grid layout -->
                                <div v-else class="header-cell-spacer"></div>
                            </template>
                            <template
                                v-else-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'">
                                <div class="badge-container">
                                    <UBadge v-if="item.dropped && item.dropped > 0" variant="solid" color="success"
                                        class="item-badge modern-badge dropped-badge">
                                        <Icon name="lucide:package-check" class="badge-icon dropped-icon" />
                                        <span class="badge-text">{{ item.dropped }}</span>
                                    </UBadge>
                                </div>
                            </template>
                        </div>

                        <!-- Destroyed cell -->
                        <div class="body-cell destroyed-cell">
                            <template v-if="item.type === 'header' && item.itemName">
                                <!-- Show sorting controls for sections with more than 1 item -->
                                <div v-if="getSectionItemCount(item.itemName) > 1"
                                    class="sort-column-header text-center sortable-header"
                                    @click.stop="handleHeaderClick('destroyed', item.itemName)">
                                    <span class="sort-label">{{ t('destroyed') }}</span>
                                    <Icon
                                        v-if="currentSortColumn === 'destroyed' && currentSortSection === item.itemName"
                                        :name="currentSortDirection === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                                        class="sort-icon active" />
                                    <Icon v-else name="lucide:arrow-up-down" class="sort-icon inactive" />
                                </div>
                                <!-- Empty div for non-sortable sections to maintain grid layout -->
                                <div v-else class="header-cell-spacer"></div>
                            </template>
                            <template
                                v-else-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'">
                                <div class="badge-container">
                                    <UBadge v-if="item.destroyed && item.destroyed > 0" variant="solid" color="error"
                                        class="item-badge modern-badge destroyed-badge">
                                        <Icon name="lucide:package-x" class="badge-icon destroyed-icon" />
                                        <span class="badge-text">{{ item.destroyed }}</span>
                                    </UBadge>
                                </div>
                            </template>
                        </div>

                        <!-- Value cell -->
                        <div class="body-cell value-cell">
                            <template v-if="item.type === 'header' && item.itemName">
                                <!-- Show sorting controls for sections with more than 1 item -->
                                <div v-if="getSectionItemCount(item.itemName) > 1"
                                    class="sort-column-header text-right sortable-header"
                                    @click.stop="handleHeaderClick('value', item.itemName)">
                                    <span class="sort-label">{{ t('value') }}</span>
                                    <Icon v-if="currentSortColumn === 'value' && currentSortSection === item.itemName"
                                        :name="currentSortDirection === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                                        class="sort-icon active" />
                                    <Icon v-else name="lucide:arrow-up-down" class="sort-icon inactive" />
                                </div>
                                <!-- Empty div for non-sortable sections to maintain grid layout -->
                                <div v-else class="header-cell-spacer"></div>
                            </template>
                            <template
                                v-else-if="item.type === 'item' || item.type === 'value' || item.type === 'container-item'">
                                <div v-if="item.value" class="text-right font-medium">
                                    {{ formatIsk(item.value) }}
                                </div>
                                <div v-else class="text-right">-</div>
                            </template>
                        </div>
                    </div>
                </template>
                </TransitionGroup>
            </div>
        </div>

        <!-- Mobile view -->
        <div class="mobile-table" v-show="isMobile">
            <template v-for="(item, index) in data" :key="`mobile-${index}`">
                <div class="mobile-container" :class="{
                    'mobile-header-container': item.type === 'header',
                    'mobile-nested-item': item.isNested,
                    'mobile-container-item': item.isContainer,
                    ...getRowClasses(item).split(' ').reduce((acc, cls) => { acc[cls] = true; return acc; }, {})
                }" @click="isRowClickable(item) && handleRowClick(item, $event)">
                    <!-- Header items get special treatment -->
                    <template v-if="item.type === 'header'">
                        <div class="mobile-header-content">
                            <div class="mobile-header-row">
                                <Icon v-if="item.itemName && isCollapsible(item.itemName)"
                                    :name="isSectionCollapsed(item.itemName) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                                    class="mobile-collapse-icon" />
                                <h3 class="mobile-header-title">{{ item.itemName }}</h3>
                                <span v-if="item.itemName && isCollapsible(item.itemName)" class="mobile-section-count">
                                    ({{ getSectionItemCount(item.itemName) }})
                                </span>
                            </div>
                        </div>
                    </template>

                    <!-- Regular items get improved single row layout -->
                    <template v-else>
                        <div class="mobile-item-card">
                            <!-- Single row: Image, name, and stacked quantity/value -->
                            <div class="mobile-item-row">
                                <!-- Image and connector section -->
                                <div class="mobile-image-section" :class="{ 'mobile-nested': item.isNested }">
                                    <!-- Connector line for nested items -->
                                    <div v-if="item.isNested" class="mobile-connector">
                                        <Icon name="lucide:corner-down-right" class="mobile-connector-icon" />
                                    </div>

                                    <!-- Item image -->
                                    <div class="mobile-item-image">
                                        <Image
                                            v-if="(item.type === 'item' || item.type === 'container-item') && item.itemId && !isSkin(item.itemName || '')"
                                            :type="isBlueprint(item.itemName || '') ? 'blueprint-copy' : 'item'"
                                            :id="item.itemId" size="28" class="w-7 h-7 rounded-md"
                                            :alt="props.hideFitting && isFittingItem(item) ? '[REDACTED]' : (item.itemName || '')" />
                                    </div>
                                </div>

                                <!-- Item name with container controls -->
                                <div class="mobile-item-name-section">
                                    <div class="mobile-item-name" :class="{
                                        'mobile-container-name': item.isContainer,
                                        'privacy-blur': props.hideFitting && isFittingItem(item)
                                    }"
                                        @click.stop="item.isContainer && item.containerId && toggleContainerCollapse(item.containerId)">
                                        {{ props.hideFitting && isFittingItem(item) ? '[REDACTED]' : item.itemName }}
                                        <Icon v-if="item.isContainer && item.containerId"
                                            :name="isContainerCollapsed(item.containerId) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                                            class="mobile-container-icon" />
                                    </div>
                                </div>

                                <!-- Right side: Stacked quantity and value -->
                                <div v-if="(item.dropped && item.dropped > 0) || (item.destroyed && item.destroyed > 0) || item.value"
                                    class="mobile-meta-stack">
                                    <!-- Quantity badges row -->
                                    <div v-if="(item.dropped && item.dropped > 0) || (item.destroyed && item.destroyed > 0)"
                                        class="mobile-quantity-row">
                                        <UBadge v-if="item.dropped && item.dropped > 0" variant="solid" color="success"
                                            class="mobile-quantity-badge modern-badge dropped-badge">
                                            <Icon name="lucide:package-check"
                                                class="mobile-badge-icon badge-icon dropped-icon" />
                                            <span class="mobile-badge-text badge-text">{{ item.dropped }}</span>
                                        </UBadge>
                                        <UBadge v-if="item.destroyed && item.destroyed > 0" variant="solid"
                                            color="error" class="mobile-quantity-badge modern-badge destroyed-badge">
                                            <Icon name="lucide:package-x"
                                                class="mobile-badge-icon badge-icon destroyed-icon" />
                                            <span class="mobile-badge-text badge-text">{{ item.destroyed }}</span>
                                        </UBadge>
                                    </div>

                                    <!-- Value row -->
                                    <div v-if="item.value" class="mobile-value-row">
                                        <span class="mobile-value">{{ formatIsk(item.value) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from "vue";

// Helper function to parse human-readable ISK strings (e.g., "1.4b", "79m", "1,500.5k")
const parseHumanReadableIsk = (val: any): number => {
    if (typeof val === 'number') {
        return val;
    }
    if (val === null || val === undefined) {
        return 0;
    }

    let s = String(val).toLowerCase().trim();
    s = s.replace(/,/g, ''); // Remove commas

    let multiplier = 1;
    if (s.endsWith('k')) {
        multiplier = 1000;
        s = s.slice(0, -1);
    } else if (s.endsWith('m')) {
        multiplier = 1000000;
        s = s.slice(0, -1);
    } else if (s.endsWith('b')) {
        multiplier = 1000000000;
        s = s.slice(0, -1);
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num * multiplier;
};

const { t, locale } = useI18n();
const currentLocale = computed(() => locale.value);

// Mobile detection
const isMobile = ref(false);

// Check if we're on mobile on mount
onMounted(() => {
    const checkMobile = () => {
        isMobile.value = window.innerWidth < 768;
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    onUnmounted(() => window.removeEventListener('resize', checkMobile));
});

// Helper function to format ISK values
const formatIsk = (value: number | null | undefined): string => {
    if (!value || value === 0) return '0 ISK';
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B ISK`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ISK`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K ISK`;
    return `${value.toLocaleString()} ISK`;
};

const props = defineProps<{
    killmail: IKillmail | null;
    hideFitting?: boolean;
}>();

// Sorting state
const currentSortColumn = ref<string | null>(null);
const currentSortDirection = ref<'asc' | 'desc'>('desc');
const currentSortSection = ref<string | null>(null);

const groupedItems = ref();
const data = ref<Item[]>();

// Combined slot type configuration with collapsible settings and localized labels
const slotTypeConfig = {
    highSlot: {
        flags: [27, 28, 29, 30, 31, 32, 33, 34],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.highSlot"),
    },
    mediumSlot: {
        flags: [19, 20, 21, 22, 23, 24, 25, 26],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.mediumSlot"),
    },
    lowSlot: {
        flags: [11, 12, 13, 14, 15, 16, 17, 18],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.lowSlot"),
    },
    rigSlot: {
        flags: [92, 93, 94, 95, 96, 97, 98, 99],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.rigSlot"),
    },
    subsystem: {
        flags: [125, 126, 127, 128, 129, 130, 131, 132],
        collapsible: false,
        defaultCollapsed: false,
        label: () => t("slots.subsystem"),
    },
    droneBay: {
        flags: [87],
        collapsible: true,
        defaultCollapsed: false,
        label: () => t("slots.droneBay"),
    },
    cargoBay: {
        flags: [5],
        collapsible: true,
        defaultCollapsed: false,
        label: () => t("slots.cargoBay"),
    },
    fuelBay: {
        flags: [133],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fuelBay"),
    },
    fleetHangar: {
        flags: [155],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fleetHangar"),
    },
    fighterBay: {
        flags: [158],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fighterBay"),
    },
    fighterLaunchTubes: {
        flags: [159, 160, 161, 162, 163],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.fighterLaunchTubes"),
    },
    shipHangar: {
        flags: [90],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.shipHangar"),
    },
    oreHold: {
        flags: [134],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.oreHold"),
    },
    gasHold: {
        flags: [135],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.gasHold"),
    },
    mineralHold: {
        flags: [136],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.mineralHold"),
    },
    salvageHold: {
        flags: [137],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.salvageHold"),
    },
    shipHold: {
        flags: [138],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.shipHold"),
    },
    smallShipHold: {
        flags: [139],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.smallShipHold"),
    },
    mediumShipHold: {
        flags: [140],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.mediumShipHold"),
    },
    largeShipHold: {
        flags: [141],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.largeShipHold"),
    },
    industrialShipHold: {
        flags: [142],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.industrialShipHold"),
    },
    ammoHold: {
        flags: [143],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.ammoHold"),
    },
    quafeBay: {
        flags: [154],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.quafeBay"),
    },
    structureServices: {
        flags: [164, 165, 166, 167, 168, 169, 170, 171],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.structureServices"),
    },
    structureFuel: {
        flags: [172],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.structureFuel"),
    },
    implants: {
        flags: [89],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.implants"),
    },
    infrastructureHangar: {
        flags: [185],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.infrastructureHangar"),
    },
    coreRoom: {
        flags: [180],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.coreRoom"),
    },
    moonMaterialBay: {
        flags: [186],
        collapsible: true,
        defaultCollapsed: true,
        label: () => t("slots.moonMaterialBay"),
    },
    unflagged: {
        flags: [0],
        collapsible: true,
        defaultCollapsed: false,
        label: () => t('slots.unflagged')
    }
};

// Track which sections are collapsed
const collapsedSections = ref<Record<string, boolean>>({});
const collapsedContainers = ref<Record<string, boolean>>({});
const isInitialized = ref(false);

// Store section item counts and values separately to show when collapsed
const sectionItemCounts = ref<Record<string, number>>({});
const sectionValues = ref<Record<string, number>>({});

// Initialize collapsed state based on default settings
function initializeCollapsedState() {
    // Only initialize if not already initialized
    if (isInitialized.value) return;

    // Create a fresh object with default states
    const initialState: Record<string, boolean> = {};

    Object.entries(slotTypeConfig).forEach(([key, config]) => {
        // Use the label function to get the translated name
        const translatedKey = config.label();
        if (config.collapsible) {
            initialState[translatedKey] = config.defaultCollapsed;
        }
    });

    // Set the initial collapsed state
    collapsedSections.value = initialState;
    collapsedContainers.value = {}; // Initialize empty container state
    isInitialized.value = true;
}

// Check if a section is collapsible
function isCollapsible(sectionName: string): boolean {
    // Try to find the section in our config by translated name
    for (const [key, config] of Object.entries(slotTypeConfig)) {
        const translatedKey = config.label();
        if (translatedKey === sectionName) {
            return config.collapsible;
        }
    }
    return false;
}

// Check if a section is currently collapsed
function isSectionCollapsed(sectionName: string): boolean {
    return collapsedSections.value[sectionName] || false;
}

// Check if a container is currently collapsed
function isContainerCollapsed(containerId: string): boolean {
    return collapsedContainers.value[containerId] || false;
}

// Check if an item is in a fitting section (should be hidden when hideFitting is true)
function isFittingItem(item: any): boolean {
    if (!item.sectionName) return false;

    // Fitting sections that should be hidden
    const fittingSections = ['highSlot', 'mediumSlot', 'lowSlot', 'rigSlot', 'subsystem'];

    // Find the section by translated name
    for (const [key, config] of Object.entries(slotTypeConfig)) {
        const translatedKey = config.label();
        if (translatedKey === item.sectionName && fittingSections.includes(key)) {
            return true;
        }
    }
    return false;
}

// Toggle collapsed state for a section with animation support
function toggleSectionCollapse(sectionName: string) {
    if (isCollapsible(sectionName)) {
        // Add a small delay to ensure the icon animation shows properly
        // Set timeout to make the transition work better
        collapsedSections.value[sectionName] = !collapsedSections.value[sectionName];

        // Reprocess the data structure to update what's shown
        if (props.killmail) {
            processKillmailData(props.killmail);
        }
    }
}

// Toggle collapsed state for a container
function toggleContainerCollapse(containerId: string, event?: Event) {
    if (!containerId) return;

    if (event) {
        event.stopPropagation(); // Prevent triggering item link/click
    }

    // Toggle the collapsed state
    collapsedContainers.value[containerId] = !collapsedContainers.value[containerId];

    // Unlike sections, we don't need to reprocess all data
    // We need to reprocess the data to update visibility of container contents
    if (props.killmail) {
        processKillmailData(props.killmail);
    }
}

/**
 * Handle row clicks - used to toggle containers and section headers
 */
function handleRowClick(item: Item, event: Event) {
    // If this is a collapsible section header, toggle its collapsed state
    if (item.type === 'header' && item.itemName && isCollapsible(item.itemName)) {
        event.preventDefault();
        event.stopPropagation();
        toggleSectionCollapse(item.itemName);
        return;
    }

    // If this is a container, toggle its collapsed state
    if (item.isContainer && item.containerId) {
        toggleContainerCollapse(item.containerId, event);
    }

    // If this is a clickable item, navigate to it
    if (item.type === 'item' && item.itemId && !item.isContainer) {
        const link = generateItemLink(item);
        if (link) {
            window.location.href = link;
        }
    }
}

// Check if a row is clickable
function isRowClickable(item: Item): boolean {
    // Headers are clickable if they're collapsible
    if (item.type === 'header' && item.itemName && isCollapsible(item.itemName)) {
        return true;
    }

    // Containers are clickable
    if (item.isContainer) {
        return true;
    }

    // Items are clickable if they have an itemId and aren't containers
    if (item.type === 'item' && item.itemId && !item.isContainer) {
        return true;
    }

    return false;
}

// Get CSS classes for each row
function getRowClasses(item: Item) {
    const classes = [];

    // Add class based on row type
    if (item.type) {
        classes.push(item.type);
    }

    // Add clickable class for items with itemId or containers
    if ((item.type === "item" && item.itemId && !item.isContainer) || item.type === "container-item") {
        classes.push("cursor-pointer");
    }

    // Add container class to make it visually clear it's collapsible
    if (item.isContainer) {
        classes.push("container-row", "cursor-pointer");
    }

    // Add header click indicator for collapsible headers
    if (item.type === "header" && isCollapsible(item.itemName)) {
        classes.push("cursor-pointer", "section-header-row");
    }

    // Add nested item class
    if (item.isNested) {
        classes.push("container-item-row");
    }

    // Add section header class
    if (item.type === "header") {
        classes.push("section-header-row");
    }

    // Add section total class
    if (item.type === "value" && item.itemName !== t("total")) {
        classes.push("section-total-row");
    }

    // Add dropped/destroyed coloring for item and container-item rows
    if (item.type === "item" || item.type === "container-item") {
        const dropped = Number(item.dropped) || 0;
        const destroyed = Number(item.destroyed) || 0;

        if (dropped > 0) {
            classes.push("row-dropped");
        } else if (destroyed > 0) {
            classes.push("row-destroyed");
        }
    }

    return classes.join(" ");
}

// Get the count of items in a section for display
function getSectionItemCount(sectionName: string): number {
    // Return from our stored counts instead of calculating from the visible items
    return sectionItemCounts.value[sectionName] || 0;
}

/**
 * Gets the localized string from a translation object using the current locale
 */
const getLocalizedString = (obj: any, locale: string): string => {
    if (!obj) return "";
    return obj[locale] || obj.en || "";
};

/**
 * Determines if an item is a blueprint based on its name
 */
function isBlueprint(itemName: string): boolean {
    if (!itemName) return false;
    return itemName.includes("Blueprint");
}

/**
 * Determines if an item is a skin (no image available)
 */
function isSkin(itemName: string): boolean {
    return !!itemName && itemName.toLowerCase().includes('skin');
}

// Watch for locale changes and reprocess data when language changes
watch(
    currentLocale,
    () => {
        if (props.killmail) {
            // Re-process data with new locale
            processKillmailData(props.killmail);
        }
    },
    { immediate: false },
);

// Watch for changes to the killmail and process data
watch(
    () => props.killmail,
    (killmail: IKillmail | null) => {
        // Initialize collapsed state before first data processing
        if (!isInitialized.value) {
            initializeCollapsedState();
        }

        if (killmail) {
            processKillmailData(killmail);
        }
    },
    { immediate: true },
);

/**
 * Handle column header click for sorting
 * @param columnId The ID of the column to sort by
 * @param sectionName The name of the section to sort
 */
function handleHeaderClick(columnId: string, sectionName: string) {
    // Only enable sorting for sections with more than 1 item
    if (!columnId || !sectionName || getSectionItemCount(sectionName) <= 1) {
        return;
    }

    // If clicking the same column in the same section, toggle direction
    if (currentSortColumn.value === columnId && currentSortSection.value === sectionName) {
        currentSortDirection.value = currentSortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
        // New column or section, set defaults
        currentSortColumn.value = columnId;
        currentSortDirection.value = 'desc'; // Default to descending
        currentSortSection.value = sectionName;
    }

    // Reprocess data to apply the sort
    if (props.killmail) {
        processKillmailData(props.killmail);
    }
}

/**
 * Sort items within a section based on current sort settings
 */
function sortSectionItems(items: any[], sectionName: string) {
    // If global sorting is active (no currentSortSection), apply global sort to all sections
    // If section-specific sorting is active, only sort the matching section
    const shouldSort = !currentSortColumn.value ||
        (currentSortSection.value === null) || // Global sorting
        (currentSortSection.value === sectionName); // Section-specific sorting

    if (!shouldSort || items.length <= 1) {
        return items;
    }

    return [...items].sort((a, b) => {
        let valueA, valueB;

        if (currentSortColumn.value === 'dropped') {
            // Sort by dropped quantity
            valueA = Number(a.qty_dropped) || 0;
            valueB = Number(b.qty_dropped) || 0;
        } else if (currentSortColumn.value === 'destroyed') {
            // Sort by destroyed quantity
            valueA = Number(a.qty_destroyed) || 0;
            valueB = Number(b.qty_destroyed) || 0;
        } else if (currentSortColumn.value === 'value') {
            // Calculate total value including container contents
            // First calculate the base item value (price × quantity)
            const totalValueA = (Number(a.value) || 0) * ((Number(a.qty_dropped) || 0) + (Number(a.qty_destroyed) || 0));
            const totalValueB = (Number(b.value) || 0) * ((Number(b.qty_dropped) || 0) + (Number(b.qty_destroyed) || 0));

            // Add container items value if any
            valueA = totalValueA + (Number(a.containerItemsValue) || 0);
            valueB = totalValueB + (Number(b.containerItemsValue) || 0);
        } else {
            return 0;
        }

        // Apply sort direction
        return currentSortDirection.value === 'asc'
            ? valueA - valueB
            : valueB - valueA;
    });
}

/**
 * Creates a stable ID for containers based on item properties
 * @param item The container item
 * @param sectionName The section name for additional uniqueness
 * @param index The index of the container within its section
 */
function createStableContainerId(item: any, sectionName: string, index: number): string {
    // Create a unique ID using multiple factors:
    // 1. type_id - The item type
    // 2. flag - The slot where it's located
    // 3. index - Position in the list
    // 4. item.id - The unique item ID if available
    // 5. sectionName - The section it belongs to
    const itemId = item.id || item.itemId || '';
    return `container-${item.type_id}-${item.flag}-${index}-${itemId}-${sectionName}`;
}

/**
 * Calculates the total quantities and values for container contents
 * @param containerItems The items inside a container
 */
function calculateContainerTotals(containerItems: any[]) {
    if (!containerItems || !containerItems.length) {
        return { dropped: 0, destroyed: 0, value: 0 };
    }

    return containerItems.reduce(
        (totals, item) => {
            totals.dropped += Number(item.qty_dropped) || 0;
            totals.destroyed += Number(item.qty_destroyed) || 0;
            totals.value += (Number(item.value) || 0) * ((Number(item.qty_dropped) || 0) + (Number(item.qty_destroyed) || 0));
            return totals;
        },
        { dropped: 0, destroyed: 0, value: 0 }
    );
}

// Extract killmail data processing into a separate function for reusability
function processKillmailData(killmail: IKillmail) {
    if (!killmail) return;

    // Clear section data
    sectionItemCounts.value = {};
    sectionValues.value = {};

    const allItems = [];

    // Process each item to identify containers and their contents
    killmail.items?.forEach((item) => {
        // Calculate container items value properly
        const containerItemsValue = item.items
            ? item.items.reduce(
                (sum, containerItem) =>
                    sum + (containerItem.value || 0) * ((containerItem.qty_dropped || 0) + (containerItem.qty_destroyed || 0)),
                0,
            )
            : 0;

        allItems.push({
            ...item,
            isContainer: !!item.items,
            items: item.items || [],
            containerItemsValue,
        });
    });

    // Group items by slot type using the combined config
    groupedItems.value = Object.entries(slotTypeConfig)
        .map(([slotType, config]) => ({
            slotType,
            items: groupByQty(allItems.filter((item) => config.flags.includes(item.flag))),
        }))
        .filter((group) => group.items.length > 0);

    // Start building the display data
    data.value = [];
    let totalValue = killmail.ship_value || 0;

    // Add hull section
    data.value?.push({
        type: "header",
        itemName: t("hull"),
        dropped: null,
        destroyed: null,
        value: null,
    });

    // Add ship item (always visible)
    data.value?.push({
        type: "item",
        itemName: getLocalizedString(killmail.victim.ship_name, currentLocale.value),
        dropped: 0,
        destroyed: 1,
        value: killmail.ship_value,
        itemId: killmail.victim.ship_id,
    });

    // Process each slot group
    groupedItems.value.forEach((group) => {
        const items = group.items;
        // Use the label function directly from config to get the translated name
        const sectionName = slotTypeConfig[group.slotType].label();

        // Skip empty sections
        if (items.length === 0) return;

        // Calculate and store the count for this section (regardless of collapsed state)
        let itemCount = 0;
        // Count both regular items and their container contents
        items.forEach((item) => {
            itemCount++; // Count the item itself
            if (item.isContainer && item.items && item.items.length > 0) {
                itemCount += item.items.length; // Count container items
            }
        });
        sectionItemCounts.value[sectionName] = itemCount;

        // Add group header with localized slot type name
        data.value?.push({
            type: "header",
            itemName: sectionName,
            dropped: null,
            destroyed: null,
            value: null,
            sectionName: sectionName,
        });

        let innerValue = 0;
        const sectionCollapsed = isSectionCollapsed(sectionName);

        // Process each item in the group - hide if section is collapsed
        if (!sectionCollapsed) {
            // Sort items if needed
            const processedItems = sortSectionItems(items, sectionName);

            processedItems.forEach((item, index) => {
                // Generate a stable ID for this container using multiple factors including the index
                const containerId = item.isContainer ? createStableContainerId(item, sectionName, index) : null;

                // Calculate container totals if this is a container
                let containerTotals = { dropped: 0, destroyed: 0, value: 0 };
                if (item.isContainer && item.items && item.items.length > 0) {
                    containerTotals = calculateContainerTotals(item.items);
                }

                // Add the main item
                data.value?.push({
                    type: "item",
                    itemName: getLocalizedString(item.name, currentLocale.value),
                    // For containers, show total quantities including contained items
                    dropped: item.isContainer
                        ? item.qty_dropped + containerTotals.dropped
                        : item.qty_dropped,
                    destroyed: item.isContainer
                        ? item.qty_destroyed + containerTotals.destroyed
                        : item.qty_destroyed,
                    // For containers, add value of the container itself plus all contained items
                    value: item.isContainer
                        ? (item.value * (item.qty_dropped + item.qty_destroyed)) + containerTotals.value
                        : item.value * (item.qty_dropped + item.qty_destroyed),
                    itemId: item.type_id,
                    sectionName: sectionName,
                    isContainer: item.isContainer && item.items && item.items.length > 0,
                    containerId: containerId,
                    containerState: item.isContainer && item.items && item.items.length > 0 ?
                        (isContainerCollapsed(containerId) ? 'collapsed' : 'expanded') : null
                });

                // If this is a container with items, sort and add all contained items with indentation
                if (item.isContainer && item.items && item.items.length > 0 && !isContainerCollapsed(containerId)) {
                    // Sort container items using the same criteria as parent items
                    const sortedContainerItems = [...item.items].sort((a, b) => {
                        let valueA, valueB;

                        if (currentSortColumn.value === 'dropped') {
                            // Sort by dropped quantity
                            valueA = Number(a.qty_dropped) || 0;
                            valueB = Number(b.qty_dropped) || 0;
                        } else if (currentSortColumn.value === 'destroyed') {
                            // Sort by destroyed quantity
                            valueA = Number(a.qty_destroyed) || 0;
                            valueB = Number(b.qty_destroyed) || 0;
                        } else if (currentSortColumn.value === 'value') {
                            // Sort by total value
                            valueA = (Number(a.value) || 0) * ((Number(a.qty_dropped) || 0) + (Number(a.qty_destroyed) || 0));
                            valueB = (Number(b.value) || 0) * ((Number(b.qty_dropped) || 0) + (Number(b.qty_destroyed) || 0));
                        } else {
                            return 0;
                        }

                        // Apply the same sort direction as parent items
                        return currentSortDirection.value === 'asc'
                            ? valueA - valueB
                            : valueB - valueA;
                    });

                    // Add the sorted container items
                    sortedContainerItems.forEach((containerItem) => {
                        const itemName = containerItem.type_name || containerItem.name || "";
                        data.value?.push({
                            type: "container-item",
                            itemName: getLocalizedString(itemName, currentLocale.value),
                            dropped: containerItem.qty_dropped,
                            destroyed: containerItem.qty_destroyed,
                            value:
                                containerItem.value * (containerItem.qty_dropped + containerItem.qty_destroyed),
                            itemId: containerItem.type_id,
                            isNested: true,
                            sectionName: sectionName,
                        });
                    });
                }

                // Calculate value including container items (should now be redundant but keeping for safety)
                const itemValue = (item.value || 0) * ((item.qty_destroyed || 0) + (item.qty_dropped || 0));
                const containerValue = item.containerItemsValue || 0;
                innerValue += itemValue + containerValue;
            });
        } else {
            // Even if collapsed, calculate the section value
            items.forEach((item) => {
                const itemValue = (item.value || 0) * ((item.qty_destroyed || 0) + (item.qty_dropped || 0));
                const containerValue = item.containerItemsValue || 0;
                innerValue += itemValue + containerValue;
            });
        }

        // Store the section value for reference
        sectionValues.value[sectionName] = innerValue;

        // Add group total (always visible)
        data.value?.push({
            type: "value",
            itemName: t("subTotal"),
            dropped: items.reduce((sum, item) => sum + (item.qty_dropped || 0), 0),
            destroyed: items.reduce((sum, item) => sum + (item.qty_destroyed || 0), 0),
            value: innerValue,
            sectionName: sectionName,
        });

        totalValue += innerValue;
    });

    // Add grand total
    data.value?.push({
        type: "value",
        itemName: t("total"),
        dropped: null,
        destroyed: null,
        value: props.killmail?.total_value ?? totalValue, // Use killmail.total_value if available, otherwise fallback to calculated
    });
}

// Also initialize when locale changes
watch(locale, () => {
    // Do NOT reset collapsedSections here
    // Only reprocess data with new translations
    if (props.killmail) {
        processKillmailData(props.killmail);
    }
});

const UBadge = resolveComponent("UBadge");

type Item = {
    type: "header" | "value" | "item" | "container-item";
    itemName: string | null;
    dropped: number | null;
    destroyed: number | null;
    value: number | null;
    itemId?: number | null;
    isNested?: boolean;
    sectionName?: string;
    isContainer?: boolean;
    containerId?: string | null;
    containerState?: 'collapsed' | 'expanded' | null;
};

/**
 * Groups similar items together
 */
function groupByQty(items: any[]) {
    const grouped = items.reduce((acc, item) => {
        let key;
        if (item.type_id === 3468) {
            key = `${item.Itemid}_${item.type_id}_${Math.random()}`;
        } else {
            key = `${item.type_id}_${item.qty_dropped || 0}_${item.qty_destroyed || 0}`;
        }

        if (!acc[key]) {
            acc[key] = {
                ...item,
                qty_dropped: 0,
                qty_destroyed: 0,
                items: [],
                containerItemsValue: 0,
            };
        }

        acc[key].qty_dropped += item.qty_dropped || 0;
        acc[key].qty_destroyed += item.qty_destroyed || 0;

        if (item.isContainer) {
            acc[key].items = item.items;
            acc[key].containerItemsValue = item.containerItemsValue;
        }

        return acc;
    }, {});

    return Object.values(grouped);
}

/**
 * Generates a link URL for an item if it should be clickable
 */
function generateItemLink(item: Item): string | null {
    // If hideFitting is true and this is a fitting item, disable the link
    if (props.hideFitting && isFittingItem(item)) {
        return null;
    }

    // Containers should not be clickable links (they toggle collapse instead)
    if (item.isContainer) {
        return null;
    }

    // Headers should not be navigational links (they handle collapse/expand)
    if (item.type === "header") {
        return null;
    }

    // Only certain row types with itemId are clickable
    if ((item.type === "item" || item.type === "container-item") && item.itemId) {
        return `/item/${item.itemId}`;
    }

    return null;
}
</script>

<style scoped>
/* Modern CSS Custom Properties for consistent theming */
.kill-items-table {
    /* Color system */
    --primary-accent: light-dark(#3b82f6, #60a5fa);
    --success-color: light-dark(#10b981, #34d399);
    --error-color: light-dark(#ef4444, #f87171);
    --warning-color: light-dark(#f59e0b, #fbbf24);
    --surface-base: transparent;
    --surface-elevated: light-dark(rgba(245, 245, 245, 0.05), rgba(26, 26, 26, 0.3));
    --surface-hover: light-dark(rgba(229, 231, 235, 0.15), rgba(35, 35, 35, 0.5));
    --text-primary: light-dark(#111827, #f9fafb);
    --text-secondary: light-dark(#6b7280, #9ca3af);
    --text-muted: light-dark(#9ca3af, #6b7280);
    --border-color: light-dark(rgba(229, 231, 235, 0.3), rgba(75, 85, 99, 0.2));
    --border-hover: light-dark(#d1d5db, #4b5563);
    --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    --shadow-elevated: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --border-radius-sm: 0.375rem;
    --border-radius-md: 0.5rem;
    --border-radius-lg: 0.75rem;

    /* Table styling - Match original Table component */
    --table-border-color: var(--border-color);
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    background-color: transparent !important;
}

/* Desktop table layout */
.desktop-table {
    width: 100%;
}

/* Transition group container */
.transition-group {
    position: relative;
}

/* Vue TransitionGroup classes for smooth animations */
.table-row-move,
.table-row-enter-active,
.table-row-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-row-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
    max-height: 0;
}

.table-row-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
    max-height: 0;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
}

.table-row-leave-active {
    position: relative;
    overflow: hidden;
}

.table-header {
    display: grid;
    grid-template-columns: 80px 1fr 100px 100px 120px;
    gap: 0.75rem;
    padding: 0.4rem 0.75rem;
    background-color: var(--surface-elevated);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}

.header-cell {
    display: flex;
    align-items: center;
}

.header-cell.dropped-cell,
.header-cell.destroyed-cell {
    justify-content: center;
}

.header-cell.value-cell {
    justify-content: flex-end;
}

/* Sortable header cell styling */
.sortable-header-cell {
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.375rem;
    padding: 0.375rem;
    gap: 0.375rem;
    background: light-dark(rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.15));
    border: 1px solid light-dark(rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.3));
    position: relative;
}

.sortable-header-cell:hover {
    background: light-dark(rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.25));
    border-color: var(--primary-accent);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.header-label {
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: light-dark(#1f2937, #f3f4f6);
}

.header-sort-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.header-sort-icon.active {
    color: light-dark(#1f2937, #ffffff);
    transform: scale(1.1);
}

.header-sort-icon.inactive {
    color: light-dark(#6b7280, #9ca3af);
    opacity: 0.7;
}

.sortable-header-cell:hover .header-sort-icon.inactive {
    opacity: 1;
    color: light-dark(#4b5563, #d1d5db);
    transform: scale(1.05);
}

.sortable-header-cell:focus {
    outline: 2px solid var(--primary-accent);
    outline-offset: 2px;
}

.table-body {
    width: 100%;
}

.table-row {
    display: grid;
    grid-template-columns: 80px 1fr 100px 100px 120px;
    gap: 0.75rem;
    padding: 0.35rem 0.75rem;
    border-radius: 0.375rem;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3));
    transition: all 0.25s ease;
    align-items: center;
    cursor: pointer;
}

.table-row:not(:first-child) {
    margin-top: 0.25rem;
}

.table-row:hover {
    background-color: var(--surface-hover);
}

.body-cell {
    display: flex;
    align-items: center;
    min-height: 2rem;
}

.body-cell.dropped-cell,
.body-cell.destroyed-cell {
    justify-content: center;
}

.body-cell.value-cell {
    justify-content: flex-end;
}

/* Section headers - match original Table styling */
.section-header-row {
    position: relative;
    background-color: light-dark(rgba(255, 255, 255, 0.4), rgba(26, 26, 26, 0.3)) !important;
    color: var(--text-primary);
    border-radius: 0.375rem;
    transition: all 0.2s ease;
}

.section-header-row:hover {
    background-color: var(--surface-hover) !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Make only name cell clickable for collapsible sections */
.section-header-row .name-cell {
    cursor: default;
}

.section-header-row.cursor-pointer .name-cell {
    cursor: pointer;
}

/* Image cell styling */
.image-cell-content {
    display: flex;
    align-items: center;
    position: relative;
}

/* Connector line styling */
.connector-line {
    position: absolute;
    left: 5px;
    display: flex;
    align-items: center;
}

.connector-icon {
    width: 12px;
    height: 12px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 2px;
}

/* Collapse icon styling */
.collapse-icon {
    width: 18px;
    height: 18px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border-radius: 0.25rem;
    padding: 2px;
}

.collapse-icon:hover {
    color: light-dark(#374151, #d1d5db);
    background-color: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1));
    transform: scale(1.1);
}

.rotate-icon {
    transform: rotate(90deg);
}

.rotate-icon:hover {
    transform: rotate(90deg) scale(1.1);
}

/* Adjust container items indentation */
.indented-image {
    padding-left: 35px !important;
}

.section-count {
    font-size: 0.8rem;
    color: light-dark(#6b7280, #9ca3af);
    font-weight: normal;
    margin-left: 0.5rem;
}

/* Container collapsible items styling */
.item-name-wrapper {
    display: flex;
    align-items: center;
}

/* Style for container names to indicate they're clickable */
.container-name {
    cursor: pointer;
    transition: color 0.2s ease;
}

.container-name:hover {
    color: light-dark(#4b5563, #e5e7eb);
}

.container-collapse-icon {
    width: 16px;
    height: 16px;
    color: light-dark(#6b7280, #9ca3af);
    margin-left: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border-radius: 0.25rem;
    padding: 2px;
}

.container-collapse-icon:hover {
    color: light-dark(#374151, #d1d5db);
    background-color: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1));
    transform: scale(1.15);
}

/* Section header name styling */
.section-header-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    color: var(--text-primary);
    transition: color 0.2s ease;
}

/* Sort column header styling - simplified and visible */
.sort-column-header {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
    min-height: 2rem;
    gap: 0.375rem;
    flex: 1;
}

.sortable-header {
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
}

.sortable-header:hover {
    background: light-dark(rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.1));
    border-color: transparent;
    box-shadow: none;
}

.full-width-cell {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: transparent;
    transition: all 0.2s ease;
    padding: 0 0.5rem;
    gap: 0.375rem;
}

/* Text alignment classes */
.text-left {
    justify-content: flex-start;
}

.text-right {
    justify-content: flex-end;
}

.text-center {
    justify-content: center;
}

/* Sort label styling */
.sort-label {
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: light-dark(#6b7280, #9ca3af);
    transition: color 0.2s ease;
}

.sortable-header:hover .sort-label {
    color: light-dark(#374151, #d1d5db);
}

/* Enhanced sort icons with better visibility */
.sort-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.sort-icon.active {
    color: light-dark(#374151, #d1d5db);
    transform: scale(1.05);
}

.sort-icon.inactive {
    color: light-dark(#9ca3af, #6b7280);
    opacity: 0.6;
}

.sortable-header:hover .sort-icon.inactive {
    opacity: 0.8;
    color: light-dark(#6b7280, #9ca3af);
}


.mobile-container-item .mobile-item-card {
    background-color: light-dark(rgba(245, 245, 245, 0.1), rgba(45, 45, 45, 0.2));
    border: 1px solid light-dark(rgba(229, 231, 235, 0.2), rgba(55, 55, 55, 0.3));
}

.mobile-item-card:active {
    background-color: light-dark(rgba(229, 231, 235, 0.15), rgba(55, 55, 55, 0.25));
}

/* Single row layout: Image, name, and stacked meta */
.mobile-item-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.mobile-image-section {
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mobile-nested .mobile-connector {
    position: absolute;
    left: -0.75rem;
    top: 50%;
    transform: translateY(-50%);
}

.mobile-connector-icon {
    width: 14px;
    height: 14px;
    color: light-dark(#9ca3af, #6b7280);
}

.mobile-item-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: light-dark(rgba(243, 244, 246, 0.3), rgba(31, 31, 31, 0.5));
    border-radius: 0.5rem;
    border: 1px solid light-dark(rgba(229, 231, 235, 0.3), rgba(55, 55, 55, 0.3));
}

.mobile-item-name-section {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
}

.mobile-item-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: light-dark(#111827, #f3f4f6);
    line-height: 1.3;
    word-break: break-word;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}

.mobile-container-name {
    cursor: pointer;
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.mobile-container-name:hover {
    color: light-dark(#4b5563, #d1d5db);
}

.mobile-container-icon {
    width: 16px;
    height: 16px;
    color: light-dark(#6b7280, #9ca3af);
    transition: transform 0.2s ease;
    flex-shrink: 0;
}

/* Stacked meta section (quantity + value) */
.mobile-meta-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;
    min-width: 80px;
}

.mobile-quantity-row {
    display: flex;
    gap: 0.25rem;
    justify-content: flex-end;
}

.mobile-quantity-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 0.25rem;
    min-height: 20px;
}

.badge-icon {
    color: light-dark(#d1d5db, #374151) !important;
    width: 12px;
    height: 12px;
}

.mobile-badge-icon {
    color: light-dark(#d1d5db, #374151) !important;
    width: 12px;
    height: 12px;
}

/* Mobile badge icon colors */
.mobile-badge-icon.dropped-icon {
    color: #22c55e !important;
}

.mobile-badge-icon.destroyed-icon {
    color: #f87171 !important;
}

.badge-text {
    color: light-dark(#d1d5db, #374151);
    font-weight: 600;
}

.mobile-badge-text {
    color: light-dark(#d1d5db, #374151) !important;
    font-weight: 700;
    font-size: 0.7rem;
}

.mobile-value-row {
    display: flex;
    justify-content: flex-end;
}

.mobile-value {
    font-size: 0.8rem;
    font-weight: 700;
    color: light-dark(#059669, #10b981);
    background-color: light-dark(rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.15));
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    border: 1px solid light-dark(rgba(5, 150, 105, 0.2), rgba(16, 185, 129, 0.25));
    text-align: right;
    min-width: 60px;
}

.mobile-badges-wrapper {
    display: flex;
    gap: 0.25rem;
    white-space: nowrap;
}

.item-badge-mobile {
    padding: 0.05rem 0.3rem;
    font-size: 0.65rem;
}

.mobile-value {
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    color: light-dark(#111827, white);
    min-width: 60px;
    text-align: right;
}

/* Adjust for smaller screens */
@media (max-width: 380px) {
    .mobile-item-name {
        max-width: 50%;
    }

    .mobile-meta {
        gap: 0.25rem;
    }

    .mobile-value {
        min-width: 50px;
    }
}

/* Adjust for very small screens */
@media (max-width: 320px) {
    .mobile-item-name {
        max-width: 40%;
    }
}

/* Mobile view styling - reverted to vertical layout with better spacing */
.mobile-container {
    display: flex;
    width: 100%;
    gap: 0.75rem;
}

.mobile-image-cell {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
    width: 30px;
    flex-shrink: 0;
}

.indented-mobile-image {
    padding-left: 25px;
}

.mobile-connector-line {
    position: absolute;
    left: 2px;
    display: flex;
    align-items: center;
}

.connector-icon-mobile {
    width: 10px;
    height: 10px;
    color: light-dark(#6b7280, #9ca3af);
}

.collapse-icon-mobile {
    width: 14px;
    height: 14px;
    color: light-dark(#6b7280, #9ca3af);
    margin-right: 2px;
}

.mobile-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.mobile-header {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: light-dark(#111827, white);
    padding-top: 2px;
}

.mobile-item-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: light-dark(#111827, white);
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
}

.mobile-item-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
}



/* Badge container styling */
.badge-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 2rem;
}

/* Simplified table body styling */
.table-body {
    width: 100%;
    background-color: transparent;
}

/* Simplified animation keyframes */
@keyframes simpleFadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes simpleSlideDown {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Remove duplicate full-width-cell - already defined above */

.sort-icon.inactive:hover,
.sortable-header:hover .sort-icon.inactive {
    opacity: 1;
    color: light-dark(#6b7280, #9ca3af);
    transform: scale(1.05);
}

/* Improve focus accessibility */
.sortable-header:focus {
    outline: 2px solid var(--primary-accent);
    outline-offset: 2px;
}

/* Add subtle animation for sort state changes */
@keyframes sortActivate {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.2);
    }

    100% {
        transform: scale(1.1);
    }
}

.sort-icon.active {
    animation: sortActivate 0.3s ease-out;
}

/* Container collapsible items styling */
.item-name-wrapper {
    display: flex;
    align-items: center;
}

/* Style for container names to indicate they're clickable */
.container-name {
    cursor: pointer;
    transition: color 0.2s ease;
}

.container-name:hover {
    color: light-dark(#4b5563, #e5e7eb);
}

.container-collapse-icon {
    width: 14px;
    height: 14px;
    color: light-dark(#6b7280, #9ca3af);
    margin-left: 4px;
    transition: transform 0.2s ease;
    cursor: pointer;
}

/* Add mobile version */
.container-collapse-icon-mobile {
    width: 12px;
    height: 12px;
    color: light-dark(#6b7280, #9ca3af);
    margin-left: 4px;
    transition: transform 0.2s ease;
    cursor: pointer;
}

.container-collapse-icon-mobile:hover {
    color: light-dark(#4b5563, #d1d5db);
}

/* Section header name styling */
.section-header-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    color: var(--text-primary);
    transition: color 0.2s ease;
}

/* Header cell spacer for maintaining grid layout */
.header-cell-spacer {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 2rem;
    background-color: transparent;
}

/* Animation for container items */
@keyframes containerSlideDown {
    from {
        opacity: 0;
        transform: translateY(-2px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Container row styling - without deep selectors */
.table-row.container-row {
    background-color: light-dark(rgba(250, 250, 250, 0.15), rgba(45, 45, 45, 0.15));
    transition: background-color 0.2s ease;
    cursor: pointer;
}

.table-row.container-row:hover {
    background-color: light-dark(rgba(245, 245, 245, 0.25), rgba(50, 50, 50, 0.25));
}

/* Privacy blur effect for items table */
.privacy-blur {
    position: relative;
    overflow: hidden;
}

.privacy-blur::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(8px);
    background: rgba(0, 0, 0, 0.1);
    z-index: 2;
    pointer-events: all;
    /* Block all interactions */
}

/* Row coloring for dropped and destroyed items - without deep selectors */
.table-row.row-dropped {
    background-color: light-dark(rgba(0, 255, 0, 0.03), rgba(0, 255, 0, 0.05)) !important;
    transition: background-color 0.3s ease;
}

.table-row.row-destroyed {
    background-color: light-dark(rgba(255, 0, 0, 0.03), rgba(255, 0, 0, 0.05)) !important;
    transition: background-color 0.3s ease;
}

/* Enhanced hover effects for colored rows */
.table-row.row-dropped:hover {
    background-color: light-dark(rgba(0, 255, 0, 0.06), rgba(0, 255, 0, 0.08)) !important;
}

.table-row.row-destroyed:hover {
    background-color: light-dark(rgba(255, 0, 0, 0.06), rgba(255, 0, 0, 0.08)) !important;
}

/* Mobile view row coloring */
.mobile-container.row-dropped {
    background-color: light-dark(rgba(0, 255, 0, 0.03), rgba(0, 255, 0, 0.05));
    transition: background-color 0.3s ease;
}

.mobile-container.row-destroyed {
    background-color: light-dark(rgba(255, 0, 0, 0.03), rgba(255, 0, 0, 0.05));
    transition: background-color 0.3s ease;
}

/* Mobile view enhanced hover effects */
.mobile-container.row-dropped:active {
    background-color: light-dark(rgba(0, 255, 0, 0.06), rgba(0, 255, 0, 0.08));
}

.mobile-container.row-destroyed:active {
    background-color: light-dark(rgba(255, 0, 0, 0.06), rgba(255, 0, 0, 0.08));
}

/* Container item row coloring */
.table-row.container-item-row.row-dropped {
    background-color: light-dark(rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.04)) !important;
}

.table-row.container-item-row.row-destroyed {
    background-color: light-dark(rgba(255, 0, 0, 0.02), rgba(255, 0, 0, 0.04)) !important;
}
</style>
