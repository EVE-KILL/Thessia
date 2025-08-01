<script setup lang="ts">
// Add keyboard detection
const typedKeys = ref('');

// Maintain an array of multiple Spooderman instances
const spoodermen = ref<{
    id: number;
    position: string;
    imageUrl: string;
    isShaking: boolean;
    style: Record<string, string>;
}[]>([]);

let nextId = 0; // For unique IDs

// Explosion state
const isExploding = ref(false);
const explosionImages = ref<{ id: number; style: Record<string, string>; src: string }[]>([]);

// Counter for consecutive regular peeks
const consecutivePeeks = ref(0);

// Base transform values for different positions
const baseTransforms = {
    left: 'translateY(-50%) rotate(45deg) scaleX(-1)',
    right: 'translateY(-50%) rotate(-45deg)',
    top: 'translateX(-50%) rotate(180deg)',
    bottom: 'translateX(-50%)'
};

// Window dimensions for viewport constraints
const windowHeight = ref(0);
const windowWidth = ref(0);

// Handle key presses to detect "spooderman"
function handleKeyDown(event: KeyboardEvent) {
    // Add the typed key to our buffer
    typedKeys.value += event.key.toLowerCase();

    // Keep only the last 10 characters
    if (typedKeys.value.length > 10) {
        typedKeys.value = typedKeys.value.substring(typedKeys.value.length - 10);
    }

    // Check if the buffer contains "spooderman"
    if (typedKeys.value.includes('spooderman')) {
        // Reset buffer to prevent multiple triggers from the same sequence
        typedKeys.value = '';

        // Trigger Spooderman - either explosion or regular peek
        if (Math.random() < 0.0001 || consecutivePeeks.value >= 6) {
            createSpoodermanExplosion();
            // Reset the consecutive peeks counter
            consecutivePeeks.value = 0;
        } else {
            showSpooderman();
            // Increment the consecutive peeks counter
            consecutivePeeks.value++;
        }
    }
}

// Update window dimensions and set up event listeners
onMounted(() => {
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateWindowDimensions);

    // Remove keyboard event listener
    window.removeEventListener('keydown', handleKeyDown);
});

function updateWindowDimensions() {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
}

// Randomly select image
function getRandomImage() {
    const hasMultipleImages = Math.random() > 0.5;
    return hasMultipleImages ? '/images/spooderman1.webp' : '/images/spooderman.webp';
}

// Create explosion of Spooderman images all over the screen
function createSpoodermanExplosion() {
    isExploding.value = true;
    explosionImages.value = [];

    // Create 25-40 Spooderman images for more chaos
    const imageCount = Math.floor(Math.random() * 15) + 25;

    for (let i = 0; i < imageCount; i++) {
        // Generate random positions within viewport
        const size = Math.floor(Math.random() * 300) + 150;
        // Ensure images are within viewport
        const padding = 20; // Padding from edges
        const leftPos = Math.floor(Math.random() * (windowWidth.value - size - padding * 2)) + padding;
        const topPos = Math.floor(Math.random() * (windowHeight.value - size - padding * 2)) + padding;

        const rotation = Math.floor(Math.random() * 720 - 360) + 'deg'; // More extreme rotations
        const delay = Math.random() * 0.3; // Shorter delays for more chaotic effect
        const duration = Math.random() * 0.8 + 0.3; // Faster animations
        const scale = Math.random() * 1 + 0.5; // Larger scaling variations
        const flipX = Math.random() > 0.5 ? 'scaleX(-1)' : '';
        const flipY = Math.random() > 0.5 ? 'scaleY(-1)' : '';

        // Select random image
        const imgSrc = getRandomImage();

        // Create image with animation
        explosionImages.value.push({
            id: i,
            style: {
                position: 'fixed',
                width: `${size}px`,
                height: 'auto',
                left: `${leftPos}px`,
                top: `${topPos}px`,
                transform: `rotate(${rotation}) ${flipX} ${flipY} scale(${scale})`,
                opacity: '0',
                transition: `all ${duration}s ease-out ${delay}s`,
                zIndex: '9999',
                pointerEvents: 'none'
            },
            src: imgSrc
        });
    }

    // Start animation after a small delay to allow Vue to render the images
    setTimeout(() => {
        // Make all images visible with animation
        explosionImages.value = explosionImages.value.map(img => {
            return {
                ...img,
                style: {
                    ...img.style,
                    opacity: '1',
                    transform: `${img.style.transform} translateY(${Math.random() * 100 - 50}px)` // More random movement
                }
            };
        });

        // Add more chaotic movement and rotation animations
        setTimeout(() => {
            explosionImages.value = explosionImages.value.map(img => {
                const randomX = (Math.random() - 0.5) * 300; // More extreme X movement
                const randomY = (Math.random() - 0.5) * 300; // More extreme Y movement
                const newRotate = Math.floor(Math.random() * 1440 - 720) + 'deg'; // Multiple full rotations

                return {
                    ...img,
                    style: {
                        ...img.style,
                        transform: `${img.style.transform} translate(${randomX}px, ${randomY}px) rotate(${newRotate})`,
                        transition: `all 1.5s cubic-bezier(0.12, 0.9, 0.5, 1.2)` // More bouncy effect
                    }
                };
            });
        }, 300); // Quicker secondary animation

        // Fade out and clean up
        setTimeout(() => {
            explosionImages.value = explosionImages.value.map(img => {
                // Some images fly off screen for more chaos
                const exitX = (Math.random() - 0.5) * 1000;
                const exitY = (Math.random() - 0.5) * 1000;

                return {
                    ...img,
                    style: {
                        ...img.style,
                        opacity: '0',
                        transform: `${img.style.transform} translate(${exitX}px, ${exitY}px) scale(0.2)`,
                        transition: 'all 0.8s ease-in'
                    }
                };
            });

            // Reset after animation completes
            setTimeout(() => {
                explosionImages.value = [];
                isExploding.value = false;
            }, 1000);
        }, 2500);
    }, 50);
}

// Show a new spooderman from a random side
function showSpooderman() {
    const id = nextId++;
    const imageUrl = getRandomImage();
    const sides = ['left', 'right', 'top', 'bottom'];
    const position = sides[Math.floor(Math.random() * sides.length)];

    // Ensure the image size is considered
    const IMAGE_WIDTH = 450;
    const IMAGE_HEIGHT = 450; // Approximate height based on width

    // Create style object for this instance
    const style: Record<string, string> = {
        transition: 'all 0.5s ease-in-out'
    };

    // Generate positions within viewport
    if (position === 'left') {
        style.left = '-300px';
        // Generate random vertical position within viewport
        const maxTop = windowHeight.value - IMAGE_HEIGHT;
        const topPos = Math.floor(Math.random() * maxTop) + IMAGE_HEIGHT / 2;
        style.top = `${topPos}px`;
        style.transform = baseTransforms.left;
    } else if (position === 'right') {
        style.right = '-300px';
        // Generate random vertical position within viewport
        const maxTop = windowHeight.value - IMAGE_HEIGHT;
        const topPos = Math.floor(Math.random() * maxTop) + IMAGE_HEIGHT / 2;
        style.top = `${topPos}px`;
        style.transform = baseTransforms.right;
    } else if (position === 'top') {
        style.top = '-300px';
        // Generate random horizontal position within viewport
        const maxLeft = windowWidth.value - IMAGE_WIDTH;
        const leftPos = Math.floor(Math.random() * maxLeft) + IMAGE_WIDTH / 2;
        style.left = `${leftPos}px`;
        style.transform = `${baseTransforms.top} ${Math.random() > 0.5 ? 'scaleX(-1)' : ''}`;
    } else if (position === 'bottom') {
        style.bottom = '-300px';
        // Generate random horizontal position within viewport
        const maxLeft = windowWidth.value - IMAGE_WIDTH;
        const leftPos = Math.floor(Math.random() * maxLeft) + IMAGE_WIDTH / 2;
        style.left = `${leftPos}px`;
        style.transform = `${baseTransforms.bottom} ${Math.random() > 0.5 ? 'scaleX(-1)' : ''}`;
    }

    // Add the new Spooderman to our array
    spoodermen.value.push({
        id,
        position,
        imageUrl,
        isShaking: false,
        style
    });

    // Animation sequence for this specific Spooderman
    // Peek in
    setTimeout(() => {
        const spooderman = spoodermen.value.find(s => s.id === id);
        if (!spooderman) return;

        if (position === 'left') {
            spooderman.style.left = '-60px';
        } else if (position === 'right') {
            spooderman.style.right = '-60px';
        } else if (position === 'top') {
            spooderman.style.top = '-60px';
        } else if (position === 'bottom') {
            spooderman.style.bottom = '-60px';
        }

        // Shake after peeking in
        setTimeout(() => {
            const spooderman = spoodermen.value.find(s => s.id === id);
            if (!spooderman) return;
            spooderman.isShaking = true;

            // Stop shaking and leave
            setTimeout(() => {
                const spooderman = spoodermen.value.find(s => s.id === id);
                if (!spooderman) return;
                spooderman.isShaking = false;

                // Move back out
                setTimeout(() => {
                    const spooderman = spoodermen.value.find(s => s.id === id);
                    if (!spooderman) return;

                    if (position === 'left') {
                        spooderman.style.left = '-450px';
                    } else if (position === 'right') {
                        spooderman.style.right = '-450px';
                    } else if (position === 'top') {
                        spooderman.style.top = '-450px';
                    } else if (position === 'bottom') {
                        spooderman.style.bottom = '-450px';
                    }

                    // Remove from array completely
                    setTimeout(() => {
                        spoodermen.value = spoodermen.value.filter(s => s.id !== id);
                    }, 500);
                }, 500);
            }, 1500);
        }, 500);
    }, 100);
}
</script>

<template>
    <!-- Multiple Spoodermen support -->
    <div v-for="spooderman in spoodermen" :key="spooderman.id" class="spooderman"
        :class="[spooderman.position, { shake: spooderman.isShaking }]" :style="spooderman.style">
        <img :src="spooderman.imageUrl" alt="Spooderman" width="450" height="auto" />
    </div>

    <!-- Explosion effect -->
    <template v-if="isExploding">
        <img v-for="image in explosionImages" :key="image.id" :src="image.src" alt="Spooderman" :style="image.style" />
    </template>
</template>

<style scoped>
.spooderman {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    transform-origin: center center;
}

.shake {
    animation: shake 0.4s infinite ease-in-out;
}

@keyframes shake {
    0% {
        transform: var(--base-transform) rotate(0deg);
    }

    25% {
        transform: var(--base-transform) rotate(-15deg);
    }

    75% {
        transform: var(--base-transform) rotate(15deg);
    }

    100% {
        transform: var(--base-transform) rotate(0deg);
    }
}

/* Base transforms for each position */
.left {
    --base-transform: translateY(-50%) rotate(45deg) scaleX(-1);
    transform-origin: left center;
}

.right {
    --base-transform: translateY(-50%) rotate(-45deg);
    transform-origin: right center;
}

.top {
    --base-transform: translateX(-50%) rotate(180deg);
    transform-origin: center top;
}

.bottom {
    --base-transform: translateX(-50%);
    transform-origin: center bottom;
}
</style>
