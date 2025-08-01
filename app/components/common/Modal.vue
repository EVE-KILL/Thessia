<template>
    <!-- Only mount when open -->
    <Teleport to="body">
        <!-- Fade backdrop -->
        <Transition name="overlay-fade">
            <div v-show="isOpen" class="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4"
                @click="onBackdropClick">
                <!-- Scale/fade content -->
                <Transition name="content-scale">
                    <div v-show="isOpen" ref="dialog"
                        class="modal-content relative w-full max-w-lg transform rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 pb-4"
                        role="dialog" aria-modal="true" :aria-labelledby="title ? 'modal-title' : undefined"
                        tabindex="-1" @click.stop>
                        <!-- Header -->
                        <header v-if="title || $slots.header"
                            class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-2 bg-gray-50 dark:bg-gray-800/50">
                            <slot name="header">
                                <h3 id="modal-title"
                                    class="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
                                    {{ title }}
                                </h3>
                            </slot>
                            <button type="button" @click="close"
                                class="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200">
                                <span class="sr-only">Close</span>
                                <UIcon name="lucide:x" class="h-5 w-5" />
                            </button>
                        </header>

                        <!-- Body -->
                        <section class="px-6 pt-6 pb-6 bg-white dark:bg-gray-800">
                            <slot />
                        </section>

                        <!-- Footer -->
                        <template v-if="$slots.footer">
                            <footer role="contentinfo"
                                class="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 pt-6 pb-6 bg-gray-50 dark:bg-gray-800/50">
                                <slot name="footer"></slot>
                            </footer>
                        </template>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

// Preserve scroll position and lock body without jumping
const scrollY = ref(0);

// Track scroll position to prevent jumping
// Removed scrollPos ref

const props = withDefaults(defineProps<{
    isOpen: boolean;
    title?: string;
    closeOnBackdrop?: boolean;
}>(), { closeOnBackdrop: true });

const emit = defineEmits();
const dialog = ref<HTMLElement | null>(null);

function close() {
    emit('close');
}

function onBackdropClick(e: MouseEvent) {
    if (props.closeOnBackdrop && e.target === e.currentTarget) {
        close();
    }
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        close();
    }
}

// Single watcher for open/close side-effects
watch(
    () => props.isOpen,
    async (open) => {
        if (open) {
            // Lock scroll at current position
            scrollY.value = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY.value}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';
            document.addEventListener('keydown', onKeydown);
        } else {
            // Unlock scroll and restore position
            document.removeEventListener('keydown', onKeydown);
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY.value);
        }
    },
    { immediate: true }
);

onUnmounted(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
/* Backdrop: dark + blur */
.modal-overlay {
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

/* Overlay fade animations */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}

/* Content scale/fade animations */
.content-scale-enter-active,
.content-scale-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.content-scale-enter-from,
.content-scale-leave-to {
    opacity: 0;
    transform: scale(0.9) translateY(-16px);
}

/* Modal content styling */
.modal-content {
    background-color: white !important;
    opacity: 1 !important;
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(0, 0, 0, 0.05);
}

.dark .modal-content {
    background-color: rgb(31, 41, 55) !important;
    opacity: 1 !important;
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.25),
        0 10px 10px -5px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Header and footer subtle backgrounds */
.modal-content header,
.modal-content footer {
    background: linear-gradient(to bottom,
            rgba(249, 250, 251, 0.8),
            rgba(249, 250, 251, 0.4));
}

.dark .modal-content header,
.dark .modal-content footer {
    background: linear-gradient(to bottom,
            rgba(55, 65, 81, 0.6),
            rgba(55, 65, 81, 0.2));
}

/* Close button hover effects */
.modal-content button:hover {
    transform: scale(1.05);
}

/* Focus rings for accessibility */
.modal-content button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
</style>
