<template>
    <div class="background-randomizer-button">
        <UButton :icon="isLoading ? 'lucide:refresh-ccw' : 'lucide:shuffle'" color="primary" variant="solid" size="sm"
            :loading="isLoading" :disabled="isLoading" aria-label="Random background"
            :title="$t('background.randomize', 'Get random background')" @click="randomizeBackground" />
    </div>
</template>

<script setup lang="ts">
// Import the siteBackground composable
const { setRedditBackground } = siteBackground();

// Track loading state
const isLoading = ref(false);

// Function to randomize background
const randomizeBackground = async () => {
    if (isLoading.value) return;

    try {
        isLoading.value = true;
        await setRedditBackground();

        // Optional: Show a brief success feedback
        // You could add a toast notification here if desired
    } catch (error) {
        console.error('Failed to randomize background:', error);
        // Optional: Show error feedback to user
        // You could add an error toast here if desired
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.background-randomizer-button {
    position: fixed;
    bottom: 20px;
    left: 75px;
    /* Position it next to the background viewer button */
    z-index: 40;
    opacity: 0.6;
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.background-randomizer-button:hover {
    opacity: 1;
    transform: scale(1.05);
}

/* Add an inset shadow to make the button visible on all backgrounds */
.background-randomizer-button :deep(.u-button) {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

/* Animate the shuffle icon when not loading */
.background-randomizer-button:not(.loading):hover :deep(.lucide-shuffle) {
    animation: shuffle 0.6s ease-in-out;
}

@keyframes shuffle {

    0%,
    100% {
        transform: rotate(0deg);
    }

    25% {
        transform: rotate(-5deg);
    }

    75% {
        transform: rotate(5deg);
    }
}

/* Ensure loading spinner rotates smoothly */
.background-randomizer-button :deep(.lucide-refresh-ccw) {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>
