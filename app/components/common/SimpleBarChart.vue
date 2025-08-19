<template>
    <div class="w-full">
        <h3 v-if="title" class="text-lg font-semibold mb-4 text-center">{{ title }}</h3>

        <!-- Loading state only when no data yet -->
        <div v-if="isLoading && (!data || data.length === 0)" class="flex items-center justify-center"
            :style="{ height: '200px' }">
            <div class="text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Loading chart...</p>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!data || data.length === 0"
            class="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg"
            :style="{ height: '200px' }">
            <div class="text-center">
                <p class="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
        </div>

        <!-- Chart - always visible once data is available -->
        <div v-else class="relative">
            <!-- Small loading indicator in corner during updates -->
            <div v-if="isLoading" class="absolute top-2 right-2 z-10">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>

            <canvas ref="canvasRef"
                class="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                :width="800" :height="chartHeight"></canvas>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

interface ChartDataPoint {
    name: string;
    value: number | string;
}

interface Props {
    data: ChartDataPoint[];
    title?: string;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    title: "",
    loading: false,
});

const canvasRef = ref<HTMLCanvasElement>();

// Process data - handle number formatting and parsing
const processedData = computed(() => {
    if (!props.data?.length) return [];

    return props.data
        .map(item => ({
            name: item.name,
            // Parse numbers correctly - remove commas and convert to number
            value: typeof item.value === 'string'
                ? parseFloat(item.value.replace(/[,\s]/g, '')) || 0
                : Number(item.value) || 0
        }))
        // Don't filter out zero values - show all categories
        .sort((a, b) => b.value - a.value) // Sort descending
        .slice(0, 15); // Limit to top 15 for better display
});

// Dynamic height based on actual content
const chartHeight = computed(() => {
    const dataLength = processedData.value.length;
    if (dataLength === 0) return 100; // Minimum height when no data

    const barHeight = 20; // Height per bar
    const barSpacing = 2; // Space between bars
    const padding = 20; // Top and bottom padding

    // Calculate exact height needed
    const contentHeight = (dataLength * barHeight) + ((dataLength - 1) * barSpacing);
    return contentHeight + padding;
});

// Computed loading state
const isLoading = computed(() => props.loading);

// Animation state
const animatedValues = ref<Map<string, number>>(new Map());
const animationFrame = ref<number | null>(null);

// Animation function for smooth transitions
const animateChart = () => {
    if (!canvasRef.value || processedData.value.length === 0) return;

    const canvas = canvasRef.value;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get current animated values or initialize
    for (const item of processedData.value) {
        if (!animatedValues.value.has(item.name)) {
            animatedValues.value.set(item.name, 0);
        }
    }

    // Animate towards target values
    let needsUpdate = false;
    for (const item of processedData.value) {
        const current = animatedValues.value.get(item.name) || 0;
        const target = item.value;
        const diff = target - current;

        if (Math.abs(diff) > 0.5) {
            const step = diff * 0.15; // Smooth animation speed
            animatedValues.value.set(item.name, current + step);
            needsUpdate = true;
        } else {
            animatedValues.value.set(item.name, target);
        }
    }

    // Draw the chart with current animated values
    drawChart();

    // Continue animation if needed
    if (needsUpdate) {
        animationFrame.value = requestAnimationFrame(animateChart);
    } else {
        animationFrame.value = null;
    }
};

const drawChart = () => {
    const canvas = canvasRef.value;
    if (!canvas || processedData.value.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chart dimensions - match the computed height exactly
    const padding = { top: 10, right: 100, bottom: 10, left: 120 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const availableHeight = canvas.height - padding.top - padding.bottom;

    // Calculate bar dimensions - exact match with height computation
    const barHeight = 20; // Must match chartHeight computation
    const barSpacing = 2; // Must match chartHeight computation

    // Get max value for scaling - use animated values
    const currentValues = processedData.value.map(item =>
        animatedValues.value.get(item.name) || 0
    );
    const maxValue = Math.max(...currentValues, 1);

    // Set font
    ctx.font = "12px Inter, -apple-system, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    processedData.value.forEach((item, index) => {
        const currentValue = animatedValues.value.get(item.name) || 0;
        const y = padding.top + (index * (barHeight + barSpacing)) + barHeight / 2;

        // Calculate bar width - ensure minimum width for zero values
        const barWidth = currentValue > 0
            ? Math.max(2, (currentValue / maxValue) * chartWidth)
            : 1; // Minimum 1px bar for zero values

        // Draw bar - use different style for zero values
        const color = colors[index % colors.length] || "#3B82F6";
        ctx.fillStyle = currentValue > 0 ? color : (isDark ? '#374151' : '#E5E7EB');
        ctx.fillRect(padding.left, y - barHeight / 2, barWidth, barHeight);

        // Draw category label
        ctx.fillStyle = isDark ? "#F3F4F6" : "#374151";
        ctx.textAlign = "right";
        const labelText = item.name.length > 15
            ? item.name.substring(0, 12) + "..."
            : item.name;
        ctx.fillText(labelText, padding.left - 8, y);

        // Draw value label with proper formatting
        ctx.textAlign = "left";
        const displayValue = Math.round(currentValue);
        const valueText = displayValue >= 1000000
            ? (displayValue / 1000000).toFixed(1) + "M"
            : displayValue >= 1000
                ? (displayValue / 1000).toFixed(1) + "K"
                : displayValue.toLocaleString();

        // Different color for zero values
        ctx.fillStyle = currentValue > 0
            ? (isDark ? "#F3F4F6" : "#374151")
            : (isDark ? "#6B7280" : "#9CA3AF");
        ctx.fillText(valueText, padding.left + barWidth + 6, y);
    });
};

// Start animation when data changes
const startAnimation = () => {
    if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value);
    }
    animationFrame.value = requestAnimationFrame(animateChart);
};

// Watch for data changes
watch(processedData, (newData) => {
    if (newData.length > 0) {
        startAnimation();
    }
}, { immediate: true });

// Initialize on mount
onMounted(async () => {
    await nextTick();
    if (processedData.value.length > 0) {
        startAnimation();
    }
});

// Add colors constant
const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6366F1",
];
</script>

<style scoped>
canvas {
    display: block;
    max-width: 100%;
    height: auto;
}

/* Ensure proper containment */
.relative {
    contain: layout style;
}

/* Prevent overflow issues */
div {
    box-sizing: border-box;
}
</style>
