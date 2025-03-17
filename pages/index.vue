<template>
  <div>
    <!-- Hero Section -->
    <section class="py-8 md:py-16 px-4">
      <div class="mx-auto">
        <div class="bg-mode-dynamic rounded-lg shadow-lg p-8">
          <h1 class="text-4xl md:text-6xl font-bold mb-6">Welcome to EVE-KILL</h1>
          <p class="text-lg md:text-xl mb-8">The premier killboard for EVE Online. Track kills, analyze statistics, and stay on top of PVP activities across New Eden.</p>

          <div class="flex flex-col sm:flex-row gap-4">
            <UButton size="xl" color="primary">Latest Kills</UButton>
            <UButton size="xl" variant="outline">Search Players</UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-8 px-4">
      <div class="mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold mb-8 text-center">Key Features</h2>

        <div class="grid md:grid-cols-3 gap-6">
          <!-- Feature 1 -->
          <div class="bg-mode-dynamic rounded-lg shadow p-6">
            <UIcon name="i-heroicons-chart-bar" class="text-4xl mb-4 text-primary-500" />
            <h3 class="text-xl font-bold mb-2">Advanced Statistics</h3>
            <p>Detailed analytics on kills, losses, and efficiency ratings for players, corporations, and alliances.</p>
          </div>

          <!-- Feature 2 -->
          <div class="bg-mode-dynamic rounded-lg shadow p-6">
            <UIcon name="i-heroicons-magnifying-glass" class="text-4xl mb-4 text-primary-500" />
            <h3 class="text-xl font-bold mb-2">Powerful Search</h3>
            <p>Find specific kills, players, or ships with our comprehensive search functionality.</p>
          </div>

          <!-- Feature 3 -->
          <div class="bg-mode-dynamic rounded-lg shadow p-6">
            <UIcon name="i-heroicons-clock" class="text-4xl mb-4 text-primary-500" />
            <h3 class="text-xl font-bold mb-2">Real-time Updates</h3>
            <p>Stay informed with real-time kill notifications and battle reports as they happen in New Eden.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Activity Section -->
    <section class="py-8 px-4 mb-8">
      <div class="mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold mb-8 text-center">Recent Activity</h2>

        <div class="bg-mode-dynamic rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">Latest Kills</h3>
            <UButton size="sm" to="/kills">View All</UButton>
          </div>

          <!-- Placeholder for recent kills - could be replaced with actual data component -->
          <div class="space-y-4">
            <p class="text-center py-8">Loading recent kill data...</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Using explicit classes instead of @apply with opacity modifiers */
</style>
