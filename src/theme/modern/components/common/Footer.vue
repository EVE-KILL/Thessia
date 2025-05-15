<template>
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <a href="https://github.com/EVE-KILL/Thessia" target="_blank" rel="noopener noreferrer"
                    class="footer-link">
                    <div class="flex items-center">
                        <UIcon name="i-simple-icons-github" class="mr-1" />
                        <span>GitHub</span>
                    </div>
                </a>
            </div>

            <div class="footer-section text-center">
                <div>
                    Created by
                    <NuxtLink to="https://eve-kill.com/character/268946627" rel="noopener noreferrer"
                        class="footer-link">
                        Karbowiak
                    </NuxtLink>
                </div>
            </div>

            <div class="footer-section text-right">
                <div class="text-xs mt-1">
                    All materials are property of
                    <a href="https://www.ccpgames.com/" target="_blank" rel="noopener noreferrer"
                        class="footer-link">CCP</a>
                    -
                    <NuxtLink to="/legal" class="footer-link">{{ $t('footerLegal') }}</NuxtLink>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
// No script needed
</script>

<style scoped>
.footer {
    width: 100%;
    padding: 1rem 1rem 0;
    border-top: 1px solid rgba(128, 128, 128, 0.4);
    font-size: 0.875rem;
    margin: 0 !important;
    /* Force no margin */
    box-sizing: border-box;
    height: auto;
    display: block;
    /* Allow footer content to be visible */
    overflow: visible;
}

.footer-content {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0;
    /* Allow content to determine height */
    min-height: 0;
    box-sizing: border-box;
}

.footer-section {
    flex: 1;
    min-width: 150px;
    /* Reduced from 200px to prevent unnecessary wrapping */
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
        margin-bottom: 0.5rem;
        /* Ensure no overflow */
        overflow: hidden;
    }

    .footer-section {
        width: 100%;
        text-align: center;
    }
}
</style>
