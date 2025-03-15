<template>
  <div class="py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white bg-opacity-60 dark:bg-black dark:bg-opacity-40 backdrop-blur-sm rounded-lg shadow-lg p-6 md:p-8">
        <h1 class="text-3xl md:text-4xl font-bold mb-6">About EVE-KILL</h1>

        <div class="space-y-6">
          <p class="text-lg">
            EVE-KILL is a comprehensive killboard service for EVE Online, providing players with detailed statistics
            and analytics about combat activities across New Eden.
          </p>

          <h2 class="text-2xl font-bold mt-8">Our Mission</h2>
          <p>
            Our mission is to provide the most accurate, up-to-date, and user-friendly killboard experience
            for the EVE Online community. We strive to offer valuable insights into PVP combat while maintaining
            a reliable and fast service for all players.
          </p>

          <h2 class="text-2xl font-bold mt-8">History</h2>
          <p>
            EVE-KILL was established in 2007 and has since evolved to become one of the most trusted killboard
            services in New Eden. With constant updates and improvements, we continue to serve the EVE community
            with reliable combat tracking and statistics.
          </p>

          <h2 class="text-2xl font-bold mt-8">Contact Us</h2>
          <p>
            Have questions, suggestions, or need support? Join our Discord server or reach out via email at
            <a href="mailto:contact@eve-kill.net" class="text-primary-600 dark:text-primary-400 hover:underline">
              contact@eve-kill.net
            </a>.
          </p>

          <div class="flex gap-4 mt-6">
            <UButton to="https://discord.gg/example" target="_blank" class="flex items-center gap-2">
              <UIcon name="i-simple-icons-discord" />
              Join our Discord
            </UButton>
            <UButton to="https://github.com/eve-kill/Thessia" target="_blank" variant="outline" class="flex items-center gap-2">
              <UIcon name="i-simple-icons-github" />
              GitHub Repository
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
