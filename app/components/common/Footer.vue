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
    padding: var(--space-4) var(--space-4) 0;
    border-top: 1px solid var(--color-border-light);
    font-size: var(--text-sm);
    margin: 0 !important;
    box-sizing: border-box;
    height: auto;
    display: block;
    overflow: visible;
}

.footer-content {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
    padding-bottom: 0;
    min-height: 0;
    box-sizing: border-box;
}

.footer-section {
    flex: 1;
    min-width: 150px;
}

.footer-link {
    color: var(--color-brand-primary);
    text-decoration: none;
    transition: color var(--duration-200);
}

.footer-link:hover {
    color: var(--color-brand-secondary);
    text-decoration: underline;
}

@media (max-width: 640px) {
    .footer-content {
        flex-direction: column;
        gap: var(--space-2);
        margin-bottom: var(--space-2);
        overflow: hidden;
    }

    .footer-section {
        width: 100%;
        text-align: center;
    }
}
</style>
