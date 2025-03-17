<template>
  <footer class="footer">
    <div class="footer-content">
      <!-- Left section - GitHub link -->
      <div class="footer-section">
        <a href="https://github.com/EVE-KILL/Thessia" target="_blank" rel="noopener noreferrer" class="footer-link">
          <div class="flex items-center">
            <UIcon name="i-simple-icons-github" class="mr-1" />
            <span>GitHub</span>
          </div>
        </a>
      </div>

      <!-- Middle section - Creator info -->
      <div class="footer-section text-center">
        <div>
          Created by
          <a href="https://eve-kill.com/character/268946627" target="_blank" rel="noopener noreferrer" class="footer-link">
            Karbowiak
          </a>
        </div>
      </div>

      <!-- Right section - Legal info -->
      <div class="footer-section text-right">
        <div class="text-xs mt-1">
          All materials are property of
          <a href="https://www.ccpgames.com/" target="_blank" rel="noopener noreferrer" class="footer-link">CCP</a>
          -
          <NuxtLink to="/legal" class="footer-link">{{ $t('footer.legal') }}</NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// No script needed after removing timer functionality
</script>

<style scoped>
.footer {
  width: 100%;
  padding: 1rem;
  border-top: 1px solid rgba(128, 128, 128, 0.4); /* Enhanced border for better visibility */
  font-size: 0.875rem;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.footer-section {
  flex: 1;
  min-width: 200px;
}

.footer-link {
  color: var(--color-primary-500);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

@media (max-width: 640px) {
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
  }

  .footer-section {
    width: 100%;
    text-align: center;
  }
}
</style>
