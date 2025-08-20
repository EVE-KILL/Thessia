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

        <!-- EVE Tools Section -->
        <div class="eve-tools-section">
            <div class="eve-tools-content">
                <div class="eve-tools-grid">
                    <a href="https://evemaps.dotlan.net/" target="_blank" rel="noopener noreferrer"
                        class="eve-tool-button" title="DOTLAN - EVE Maps & Intel">
                        <img src="https://evemaps.dotlan.net/favicon.ico" alt="DOTLAN" class="tool-logo">
                        <span>DOTLAN</span>
                    </a>
                    <a href="https://eveeye.com/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="EVEEye - Interactive Maps">
                        <img src="https://eveeye.com/img/eveeye.svg" alt="EVEEye" class="tool-logo">
                        <span>EVEEye</span>
                    </a>
                    <a href="https://evemissioneer.com/" target="_blank" rel="noopener noreferrer"
                        class="eve-tool-button" title="EVE Missioneer - Mission & Market Intel">
                        <img src="https://evemissioneer.com/favicon.png" alt="EVE Missioneer" class="tool-logo">
                        <span>EVE Missioneer</span>
                    </a>
                    <a href="https://eveship.fit/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="EveShip.fit - Ship Fitting Tool">
                        <img src="https://eveship.fit/favicon.ico" alt="EveShip.fit" class="tool-logo">
                        <span>EveShip.fit</span>
                    </a>
                    <a href="https://everef.net/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="EVERef - Game Reference">
                        <img src="https://everef.net/favicon.ico" alt="EVERef" class="tool-logo">
                        <span>EVERef</span>
                    </a>
                    <a href="https://jita.space/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="Jita.Space - Market Analysis">
                        <img src="https://www.jita.space/favicon.ico" alt="Jita.Space" class="tool-logo">
                        <span>Jita.Space</span>
                    </a>
                    <a href="https://evewho.com/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="EVEWho - Character & Corporation Intel">
                        <img src="https://evewho.com/favicon.ico" alt="EVEWho" class="tool-logo">
                        <span>EVEWho</span>
                    </a>
                    <a href="https://zkillboard.com/" target="_blank" rel="noopener noreferrer" class="eve-tool-button"
                        title="zKillboard - Killmail Database">
                        <img src="https://zkillboard.com/img/wreck.png" alt="zKillboard" class="tool-logo">
                        <span>zKillboard</span>
                    </a>
                    <a href="https://riftforeve.online/" target="_blank" rel="noopener noreferrer"
                        class="eve-tool-button" title="RIFT Intel Fusion - Intelligence Platform">
                        <img src="/images/rift-intel-fusion-tool-256.png" alt="RIFT Intel Fusion" class="tool-logo">
                        <span>RIFT Intel</span>
                    </a>
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

/* EVE Tools Section */
.eve-tools-section {
    border-top: 1px solid rgba(128, 128, 128, 0.1);
    margin-top: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
}

.eve-tools-content {
    width: 100%;
    max-width: none;
    margin: 0;
}

.eve-tools-grid {
    display: flex;
    gap: 0.5rem;
    width: 100%;
}

.eve-tool-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    text-decoration: none;
    color: rgba(128, 128, 128, 0.6);
    transition: all 0.3s ease;
    font-size: 0.75rem;
    font-weight: 400;
    min-height: 80px;
    justify-content: center;
    flex: 1;
    opacity: 0.5;
}

.eve-tool-button:hover {
    background: rgba(128, 128, 128, 0.1);
    border-color: rgba(128, 128, 128, 0.3);
    color: var(--color-gray-600);
    transform: translateY(-1px);
    opacity: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:global(.dark) .eve-tool-button {
    color: rgba(255, 255, 255, 0.45);
    opacity: 0.35;
}

:global(.dark) .eve-tool-button:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--color-gray-400);
    opacity: 1;
}

.tool-logo {
    width: 24px;
    height: 24px;
    margin-bottom: 0.5rem;
    flex-shrink: 0;
    opacity: 1;
    transition: opacity 0.3s ease;
}

.eve-tool-button:hover .tool-logo {
    opacity: 1;
}

@media (max-width: 768px) {
    .eve-tools-grid {
        gap: 0.25rem;
    }

    .eve-tool-button {
        padding: 0.5rem 0.25rem;
        font-size: 0.6rem;
        min-height: 70px;
    }

    .tool-logo {
        width: 18px;
        height: 18px;
        margin-bottom: 0.25rem;
    }
}

@media (max-width: 480px) {
    .eve-tool-button {
        padding: 0.4rem 0.2rem;
        font-size: 0.55rem;
        min-height: 60px;
    }

    .tool-logo {
        width: 16px;
        height: 16px;
    }
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
