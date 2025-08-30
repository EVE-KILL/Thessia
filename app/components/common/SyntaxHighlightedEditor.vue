<template>
    <div class="syntax-editor" :class="{ 'is-focused': isFocused }">
        <!-- Code display with syntax highlighting -->
        <pre ref="highlightedCode" class="syntax-highlight" :class="`language-${language}`"
            v-html="highlightedContent"></pre>

        <!-- Invisible textarea for input -->
        <textarea ref="textarea" v-model="localValue" @input="onInput" @focus="isFocused = true"
            @blur="isFocused = false" @scroll="syncScroll" @keydown="onKeydown" class="syntax-input"
            :placeholder="placeholder" spellcheck="false" autocomplete="off" autocorrect="off"
            autocapitalize="off"></textarea>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

interface Props {
    modelValue: string;
    language?: string;
    placeholder?: string;
    readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    language: 'html',
    placeholder: '',
    readonly: false
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

// Refs
const textarea = ref<HTMLTextAreaElement>();
const highlightedCode = ref<HTMLPreElement>();
const isFocused = ref(false);

// Local value for v-model
const localValue = ref(props.modelValue);

// PrismJS instance
let Prism: any = null;

// Load PrismJS
onMounted(async () => {
    try {
        const prismModule = await import('prismjs');
        Prism = prismModule.default || prismModule;

        // Load languages
        await import('prismjs/components/prism-markup'); // HTML
        await import('prismjs/components/prism-css');
        await import('prismjs/components/prism-javascript');
        await import('prismjs/components/prism-typescript');

        // Initial highlighting
        await nextTick();
        updateHighlighting();
    } catch (error) {
        console.warn('Failed to load PrismJS:', error);
    }
});

// Computed highlighted content
const highlightedContent = computed(() => {
    if (!Prism || !localValue.value) {
        return escapeHtml(localValue.value);
    }

    try {
        const grammar = Prism.languages[props.language === 'html' ? 'markup' : props.language];
        if (grammar) {
            return Prism.highlight(localValue.value, grammar, props.language);
        }
    } catch (error) {
        console.warn('Syntax highlighting failed:', error);
    }

    return escapeHtml(localValue.value);
});

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
    if (newValue !== localValue.value) {
        localValue.value = newValue;
    }
});

// Watch for local changes
watch(localValue, (newValue) => {
    emit('update:modelValue', newValue);
    nextTick(() => {
        syncScroll();
    });
});

// Input handler
function onInput() {
    updateHighlighting();
}

// Update syntax highlighting
function updateHighlighting() {
    nextTick(() => {
        syncScroll();
    });
}

// Sync scroll between textarea and highlighted code
function syncScroll() {
    if (textarea.value && highlightedCode.value) {
        highlightedCode.value.scrollTop = textarea.value.scrollTop;
        highlightedCode.value.scrollLeft = textarea.value.scrollLeft;
    }
}

// Handle tab key for indentation
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
        event.preventDefault();

        const target = event.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;

        // Insert tab
        const value = target.value;
        target.value = value.substring(0, start) + '  ' + value.substring(end);

        // Restore cursor position
        target.selectionStart = target.selectionEnd = start + 2;

        // Update local value
        localValue.value = target.value;
    }
}

// Escape HTML for display
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>

<style scoped>
.syntax-editor {
    position: relative;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    border: 1px solid rgb(75 85 99);
    border-radius: 0.5rem;
    background: rgba(17, 24, 39, 0.5);
    overflow: hidden;
}

.syntax-editor.is-focused {
    border-color: rgb(59 130 246);
    box-shadow: 0 0 0 1px rgb(59 130 246);
}

.syntax-highlight {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 0.75rem;
    color: rgb(243 244 246);
    background: transparent;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: auto;
    pointer-events: none;
    z-index: 1;
}

.syntax-input {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0.75rem;
    border: none;
    background: transparent;
    color: transparent;
    caret-color: rgb(243 244 246);
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: auto;
    resize: none;
    outline: none;
    z-index: 2;
}

.syntax-input::placeholder {
    color: rgb(156 163 175);
}

/* PrismJS theme adjustments for dark mode */
:global(.syntax-editor .token.comment),
:global(.syntax-editor .token.prolog),
:global(.syntax-editor .token.doctype),
:global(.syntax-editor .token.cdata) {
    color: rgb(156 163 175);
}

:global(.syntax-editor .token.punctuation) {
    color: rgb(209 213 219);
}

:global(.syntax-editor .token.tag),
:global(.syntax-editor .token.attr-name),
:global(.syntax-editor .token.namespace),
:global(.syntax-editor .token.deleted) {
    color: rgb(248 113 113);
}

:global(.syntax-editor .token.function-name) {
    color: rgb(96 165 250);
}

:global(.syntax-editor .token.boolean),
:global(.syntax-editor .token.number),
:global(.syntax-editor .token.function) {
    color: rgb(168 85 247);
}

:global(.syntax-editor .token.property),
:global(.syntax-editor .token.class-name),
:global(.syntax-editor .token.constant),
:global(.syntax-editor .token.symbol) {
    color: rgb(251 191 36);
}

:global(.syntax-editor .token.selector),
:global(.syntax-editor .token.important),
:global(.syntax-editor .token.atrule),
:global(.syntax-editor .token.keyword),
:global(.syntax-editor .token.builtin) {
    color: rgb(167 243 208);
}

:global(.syntax-editor .token.string),
:global(.syntax-editor .token.char),
:global(.syntax-editor .token.attr-value),
:global(.syntax-editor .token.regex),
:global(.syntax-editor .token.variable) {
    color: rgb(134 239 172);
}

:global(.syntax-editor .token.operator),
:global(.syntax-editor .token.entity),
:global(.syntax-editor .token.url) {
    color: rgb(251 146 60);
}
</style>
