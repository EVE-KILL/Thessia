<template>
  <div v-if="isRedditBackground" class="reddit-source-link">
    <a
      :href="sourceUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="source-button"
      aria-label="View image source on Reddit"
      :title="sourceTitle"
    >
      <UIcon name="i-simple-icons-reddit" class="reddit-icon" />
    </a>
  </div>
</template>

<script setup lang="ts">
const { isRedditBackground, currentRedditSource } = useBackgroundImage()

// Create computed properties for source URL and title
const sourceUrl = computed(() => {
  if (!currentRedditSource.value) {
    return 'https://www.reddit.com/r/eveporn';
  }
  return currentRedditSource.value.permalink;
})

const sourceTitle = computed(() => {
  if (!currentRedditSource.value) {
    return 'View on Reddit';
  }
  return `View source: ${currentRedditSource.value.title}`;
})
</script>

<style scoped>
.reddit-source-link {
  position: fixed;
  bottom: 15px;
  right: 15px;
  z-index: 100;
  pointer-events: auto;
}

.source-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: rgba(255, 69, 0, 0.9);
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.dark .source-button {
  background-color: rgba(255, 69, 0, 0.8);
}

.source-button:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
}

.reddit-icon {
  width: 26px;
  height: 26px;
  color: white;
}

@media (max-width: 640px) {
  .reddit-source-link {
    bottom: 20px;
    right: 20px;
  }
}
</style>
