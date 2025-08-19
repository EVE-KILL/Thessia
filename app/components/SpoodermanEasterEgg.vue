<script setup lang="ts">
// Keyboard detection with debouncing
const typedKeys = ref('');
const lastKeyTime = ref(0);
const KEY_DEBOUNCE_MS = 100;

// Spooderman instances with simpler state
const spoodermen = ref<{
    id: number;
    position: 'left' | 'right' | 'bottom';
    imageUrl: string;
    animationPhase: 'entering' | 'peeking' | 'shaking' | 'leaving' | 'gone';
    x: number;
    y: number;
}[]>([]);

let nextId = 0;

// Explosion state
const isExploding = ref(false);
const explosionImages = ref<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    imageUrl: string;
    animationPhase: 'spawning' | 'moving' | 'leaving';
}[]>([]);

// Counter for consecutive regular peeks
const consecutivePeeks = ref(0);
const MAX_CONSECUTIVE_PEEKS = 6;

// Cleanup tracking
const activeTimeouts = new Set<NodeJS.Timeout>();

// Window dimensions for viewport constraints
const windowHeight = ref(0);
const windowWidth = ref(0);

// Constants
const IMAGE_SIZE = 450;
const SPOODERMAN_TRIGGER = 'spooderman';

// Handle key presses to detect "spooderman" with debouncing
function handleKeyDown(event: KeyboardEvent) {
    // Add the typed key to our buffer
    typedKeys.value += event.key.toLowerCase();

    // Keep only the last 15 characters (increased buffer size)
    if (typedKeys.value.length > 15) {
        typedKeys.value = typedKeys.value.substring(typedKeys.value.length - 15);
    }

    // Check if the buffer contains "spooderman"
    if (typedKeys.value.includes(SPOODERMAN_TRIGGER)) {
        // Reset buffer to prevent multiple triggers
        typedKeys.value = '';

        // Trigger Spooderman - either explosion or regular peek
        if (Math.random() < 0.0001 || consecutivePeeks.value >= MAX_CONSECUTIVE_PEEKS) {
            createSpoodermanExplosion();
            consecutivePeeks.value = 0;
        } else {
            showSpooderman();
            consecutivePeeks.value++;
        }
    }
}

// Update window dimensions
function updateWindowDimensions() {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
}

// Randomly select image
function getRandomImage(): string {
    return Math.random() > 0.5 ? '/images/spooderman1.webp' : '/images/spooderman.webp';
}

// Create explosion of Spooderman images
function createSpoodermanExplosion() {
    if (isExploding.value) return; // Prevent multiple explosions

    isExploding.value = true;
    explosionImages.value = [];

    // Create 20-30 images for the explosion, but keep them more visible
    const imageCount = Math.floor(Math.random() * 10) + 20;

    for (let i = 0; i < imageCount; i++) {
        const size = Math.floor(Math.random() * 150) + 100; // Smaller for better performance
        const padding = 80;

        // Generate positions within viewport with padding, favoring edges like regular peeks
        let x, y;

        // Bias towards edges like the regular peeks (left, right, bottom)
        const edgeBias = Math.random();
        if (edgeBias < 0.4) {
            // Left or right edge
            x = Math.random() < 0.5 ? padding : windowWidth.value - padding - size;
            y = Math.floor(Math.random() * (windowHeight.value - size - padding * 2)) + padding;
        } else if (edgeBias < 0.7) {
            // Bottom edge
            x = Math.floor(Math.random() * (windowWidth.value - size - padding * 2)) + padding;
            y = windowHeight.value - padding - size;
        } else {
            // Random position (less common)
            x = Math.floor(Math.random() * (windowWidth.value - size - padding * 2)) + padding;
            y = Math.floor(Math.random() * (windowHeight.value - size - padding * 2)) + padding;
        }

        explosionImages.value.push({
            id: i,
            x,
            y,
            rotation: Math.floor(Math.random() * 360),
            scale: Math.random() * 0.6 + 0.4,
            imageUrl: getRandomImage(),
            animationPhase: 'spawning'
        });
    }

    // Start animation phases
    const timeout1 = setTimeout(() => {
        explosionImages.value.forEach(img => {
            img.animationPhase = 'moving';
        });

        const timeout2 = setTimeout(() => {
            explosionImages.value.forEach(img => {
                img.animationPhase = 'leaving';
            });

            const timeout3 = setTimeout(() => {
                explosionImages.value = [];
                isExploding.value = false;
                activeTimeouts.delete(timeout3);
            }, 1000);
            activeTimeouts.add(timeout3);
            activeTimeouts.delete(timeout2);
        }, 2000);
        activeTimeouts.add(timeout2);
        activeTimeouts.delete(timeout1);
    }, 100);
    activeTimeouts.add(timeout1);
}

// Generate safe position for Spooderman
function generateSafePosition(position: 'left' | 'right' | 'bottom'): { x: number; y: number } {
    const padding = 150; // Increased padding for better visibility

    switch (position) {
        case 'left':
        case 'right': {
            // For left/right, we need a good vertical position
            const minY = padding;
            const maxY = Math.max(minY + 100, windowHeight.value - IMAGE_SIZE - padding);
            const y = Math.floor(Math.random() * (maxY - minY)) + minY;
            return { x: 0, y }; // x will be set by CSS
        }
        case 'bottom': {
            // For bottom, we need a good horizontal position
            const minX = padding;
            const maxX = Math.max(minX + 100, windowWidth.value - IMAGE_SIZE - padding);
            const x = Math.floor(Math.random() * (maxX - minX)) + minX;
            return { x, y: 0 }; // y will be set by CSS
        }
        default:
            return { x: windowWidth.value / 2, y: windowHeight.value / 2 };
    }
}

// Show a new spooderman from a random side
function showSpooderman() {
    const id = nextId++;
    const imageUrl = getRandomImage();
    // Only left, right, and bottom - no top
    const positions: ('left' | 'right' | 'bottom')[] = ['left', 'right', 'bottom'];
    const position = positions[Math.floor(Math.random() * positions.length)] as 'left' | 'right' | 'bottom';
    const { x, y } = generateSafePosition(position);

    // Add the new Spooderman to our array
    const newSpooderman = {
        id,
        position,
        imageUrl,
        animationPhase: 'entering' as const,
        x,
        y
    };

    spoodermen.value.push(newSpooderman);

    // Animation sequence with proper cleanup
    const timeout1 = setTimeout(() => {
        const spooderman = spoodermen.value.find(s => s.id === id);
        if (spooderman) {
            spooderman.animationPhase = 'peeking';

            const timeout2 = setTimeout(() => {
                const spooderman = spoodermen.value.find(s => s.id === id);
                if (spooderman) {
                    spooderman.animationPhase = 'shaking';

                    const timeout3 = setTimeout(() => {
                        const spooderman = spoodermen.value.find(s => s.id === id);
                        if (spooderman) {
                            spooderman.animationPhase = 'leaving';

                            const timeout4 = setTimeout(() => {
                                spoodermen.value = spoodermen.value.filter(s => s.id !== id);
                                activeTimeouts.delete(timeout4);
                            }, 1000); // Increased from 500ms to 1000ms to see the exit
                            activeTimeouts.add(timeout4);
                        }
                        activeTimeouts.delete(timeout3);
                    }, 1500);
                    activeTimeouts.add(timeout3);
                }
                activeTimeouts.delete(timeout2);
            }, 500);
            activeTimeouts.add(timeout2);
        }
        activeTimeouts.delete(timeout1);
    }, 100);
    activeTimeouts.add(timeout1);
}

// Cleanup function
function cleanup() {
    // Clear all timeouts
    activeTimeouts.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.clear();

    // Reset state
    spoodermen.value = [];
    explosionImages.value = [];
    isExploding.value = false;
}

// Setup and cleanup
onMounted(() => {
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateWindowDimensions);
    window.removeEventListener('keydown', handleKeyDown);
    cleanup();
});
</script>

<template>
    <!-- Regular Spoodermen peeks -->
    <div v-for="spooderman in spoodermen" :key="spooderman.id" class="spooderman" :class="[
        `spooderman--${spooderman.position}`,
        `spooderman--${spooderman.animationPhase}`
    ]" :style="{
            '--x': `${spooderman.x}px`,
            '--y': `${spooderman.y}px`
        }">
        <img :src="spooderman.imageUrl" alt="Spooderman" width="450" height="auto" />
    </div>

    <!-- Explosion effect -->
    <div v-for="image in explosionImages" :key="image.id" class="explosion-spooderman"
        :class="`explosion-spooderman--${image.animationPhase}`" :style="{
            '--x': `${image.x}px`,
            '--y': `${image.y}px`,
            '--rotation': `${image.rotation}deg`,
            '--scale': image.scale
        }">
        <img :src="image.imageUrl" alt="Spooderman" />
    </div>
</template>

<style scoped>
.spooderman {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: 450px;
    height: auto;
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Slower transition for leaving to make exit more visible */
.spooderman--leaving {
    transition: transform 0.8s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

/* Position-based initial transforms - positioned so neck/body is off-screen */
.spooderman--left {
    left: 0;
    top: var(--y);
    transform: translateY(-50%) translateX(-350px) rotate(45deg) scaleX(-1);
    transform-origin: left center;
}

.spooderman--right {
    right: 0;
    top: var(--y);
    transform: translateY(-50%) translateX(350px) rotate(-45deg);
    transform-origin: right center;
}

.spooderman--bottom {
    bottom: 0;
    left: var(--x);
    transform: translateX(-50%) translateY(320px);
    transform-origin: center bottom;
}

/* Animation phases - adjusted so more of the head peeks in */
.spooderman--entering.spooderman--left {
    transform: translateY(-50%) translateX(-350px) rotate(45deg) scaleX(-1);
}

.spooderman--peeking.spooderman--left {
    transform: translateY(-50%) translateX(-120px) rotate(45deg) scaleX(-1);
}

.spooderman--leaving.spooderman--left {
    transform: translateY(-50%) translateX(-400px) rotate(45deg) scaleX(-1);
}

.spooderman--entering.spooderman--right {
    transform: translateY(-50%) translateX(350px) rotate(-45deg);
}

.spooderman--peeking.spooderman--right {
    transform: translateY(-50%) translateX(120px) rotate(-45deg);
}

.spooderman--leaving.spooderman--right {
    transform: translateY(-50%) translateX(400px) rotate(-45deg);
}

.spooderman--entering.spooderman--bottom {
    transform: translateX(-50%) translateY(320px);
}

.spooderman--peeking.spooderman--bottom {
    transform: translateX(-50%) translateY(80px);
}

.spooderman--leaving.spooderman--bottom {
    transform: translateX(-50%) translateY(380px);
}

/* Shaking animation - playful rocking back and forth */
.spooderman--shaking.spooderman--left {
    animation: shake-left 0.3s ease-in-out infinite;
}

.spooderman--shaking.spooderman--right {
    animation: shake-right 0.3s ease-in-out infinite;
}

.spooderman--shaking.spooderman--bottom {
    animation: shake-bottom 0.3s ease-in-out infinite;
}

@keyframes shake-left {

    0%,
    100% {
        transform: translateY(-50%) translateX(-120px) rotate(45deg) scaleX(-1);
    }

    25% {
        transform: translateY(-50%) translateX(-120px) rotate(35deg) scaleX(-1);
    }

    75% {
        transform: translateY(-50%) translateX(-120px) rotate(55deg) scaleX(-1);
    }
}

@keyframes shake-right {

    0%,
    100% {
        transform: translateY(-50%) translateX(120px) rotate(-45deg);
    }

    25% {
        transform: translateY(-50%) translateX(120px) rotate(-35deg);
    }

    75% {
        transform: translateY(-50%) translateX(120px) rotate(-55deg);
    }
}

@keyframes shake-bottom {

    0%,
    100% {
        transform: translateX(-50%) translateY(80px) rotate(0deg);
    }

    25% {
        transform: translateX(-50%) translateY(80px) rotate(-8deg);
    }

    75% {
        transform: translateX(-50%) translateY(80px) rotate(8deg);
    }
}

/* Explosion animations */
.explosion-spooderman {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: 200px;
    height: auto;
    left: var(--x);
    top: var(--y);
    transform: rotate(var(--rotation)) scale(var(--scale));
    opacity: 0;
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.explosion-spooderman--spawning {
    opacity: 0;
    transform: rotate(var(--rotation)) scale(calc(var(--scale) * 0.5)) translateY(50px);
}

.explosion-spooderman--moving {
    opacity: 1;
    transform: rotate(calc(var(--rotation) + 180deg)) scale(var(--scale)) translateY(-20px);
    transition: all 1.5s cubic-bezier(0.12, 0.9, 0.5, 1.2);
}

.explosion-spooderman--leaving {
    opacity: 0;
    transform: rotate(calc(var(--rotation) + 720deg)) scale(calc(var(--scale) * 0.2)) translateY(-200px);
    transition: all 0.8s ease-in;
}
</style>
