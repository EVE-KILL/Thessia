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
  return `Source: ${currentRedditSource.value.title}`;
})
</script>

<style scoped>
.reddit-source-link {
  position: fixed;
  bottom: 15px;
  right: 15px;
  z-index: 100;
}

.source-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 69, 0, 0.85);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.source-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.reddit-icon {
  width: 24px;
  height: 24px;
  color: white;
}

@media (max-width: 640px) {
  .reddit-source-link {
    bottom: 10px;
    right: 10px;
  }

  .source-button {
    width: 36px;
    height: 36px;
  }

  .reddit-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
