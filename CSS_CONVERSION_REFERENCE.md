# CSS Conversion Reference Guide

## Quick Pattern Replacement Map

### Colors (Most Common Hardcoded Values)
```css
/* Gray Scale */
#111827 → var(--color-text-primary) /* or var(--color-gray-900) */
#374151 → var(--color-gray-700)
#6b7280 → var(--color-text-secondary) /* or var(--color-gray-500) */
#9ca3af → var(--color-text-tertiary) /* or var(--color-gray-400) */
#d1d5db → var(--color-gray-300)
#e5e7eb → var(--color-gray-200)
#f3f4f6 → var(--color-gray-100)
#f9fafb → var(--color-gray-50)
#ffffff → var(--color-text-inverse)

/* RGB Colors */
rgb(156, 163, 175) → var(--color-text-tertiary)
rgb(209, 213, 219) → var(--color-text-primary)
rgb(55, 55, 55) → var(--color-border-light)
rgb(75, 85, 99) → var(--color-border-medium)
rgb(40, 40, 40) → var(--color-border-dark)

/* Brand/Status Colors */
rgb(59, 130, 246) → var(--color-brand-primary)
rgb(37, 99, 235) → var(--color-brand-primary-hover)
rgb(96, 165, 250) → var(--color-brand-primary-light)
rgb(34, 197, 94) → var(--color-success)
rgb(22, 163, 74) → var(--color-success-dark)
rgb(239, 68, 68) → var(--color-danger)
rgb(220, 38, 38) → var(--color-danger-dark)
rgb(245, 158, 11) → var(--color-warning)

/* Background Alpha Values */
rgba(0, 0, 0, 0.3) → var(--color-surface-alpha)
rgba(0, 0, 0, 0.5) → var(--color-surface-alpha-medium)
rgba(0, 0, 0, 0.7) → var(--color-overlay)
rgba(255, 255, 255, 0.1) → var(--color-surface-alpha-light)
```

### Spacing (Rem to Design System)
```css
0.25rem → var(--space-1)
0.5rem → var(--space-2)
0.75rem → var(--space-3)
1rem → var(--space-4)
1.25rem → var(--space-5)
1.5rem → var(--space-6)
2rem → var(--space-8)
2.5rem → var(--space-10)
3rem → var(--space-12)
4rem → var(--space-16)
5rem → var(--space-20)
```

### Typography
```css
font-size: 0.65rem → var(--text-2xs)
font-size: 0.75rem → var(--text-xs)
font-size: 0.875rem → var(--text-sm)
font-size: 1rem → var(--text-base)
font-size: 1.125rem → var(--text-lg)
font-size: 1.25rem → var(--text-xl)
font-size: 1.5rem → var(--text-2xl)

font-weight: 300 → var(--font-light)
font-weight: 400 → var(--font-normal)
font-weight: 500 → var(--font-medium)
font-weight: 600 → var(--font-semibold)
font-weight: 700 → var(--font-bold)
```

### Border Radius
```css
0.125rem → var(--radius-sm)
0.25rem → var(--radius-base)
0.375rem → var(--radius-md)
0.5rem → var(--radius-lg)
0.75rem → var(--radius-xl)
1rem → var(--radius-2xl)
border-radius: 50% → var(--radius-full)
border-radius: 9999px → var(--radius-full)
```

### Shadows
```css
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) → var(--shadow-sm)
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) → var(--shadow-base)
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) → var(--shadow-md)
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) → var(--shadow-lg)
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) → var(--shadow-xl)
```

### Z-Index
```css
z-index: 10 → var(--z-dropdown)
z-index: 20 → var(--z-sticky)
z-index: 30 → var(--z-header)
z-index: 40 → var(--z-modal)
z-index: 50 → var(--z-popover)
z-index: 60 → var(--z-tooltip)
z-index: 1000 → var(--z-modal)
z-index: 9999 → var(--z-maximum)
```

## Common Component Patterns

### Admin Container Pattern
```css
/* Before */
.admin-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    gap: 1.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
}

/* After */
.admin-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-6);
    gap: var(--space-6);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
}
```

### Button Pattern
```css
/* Before */
.action-button {
    padding: 0.75rem 1.5rem;
    background-color: rgb(59, 130, 246);
    color: white;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: background-color 0.15s ease-in-out;
}

.action-button:hover {
    background-color: rgb(37, 99, 235);
}

/* After */
.action-button {
    padding: var(--space-3) var(--space-6);
    background-color: var(--color-brand-primary);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    transition: background-color var(--duration-150) ease-in-out;
}

.action-button:hover {
    background-color: var(--color-brand-primary-hover);
}
```

### Modal Pattern
```css
/* Before */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

.modal-content {
    background: rgb(17, 24, 39);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.5rem;
    max-width: 800px;
    width: 100%;
}

/* After */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
}

.modal-content {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    max-width: 800px;
    width: 100%;
}
```

### Table Hover Pattern
```css
/* Before */
:deep(tbody tr:hover) {
    background: light-dark(#e5e7eb, #1a1a1a);
}

:deep(tbody tr) {
    border-color: rgb(40, 40, 40) !important;
}

/* After */
:deep(tbody tr:hover) {
    background: var(--color-background-hover);
}

:deep(tbody tr) {
    border-color: var(--color-border-dark) !important;
}
```

### Form Input Pattern
```css
/* Before */
.search-input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(55, 55, 55);
    border-radius: 0.375rem;
    color: white;
    font-size: 0.875rem;
}

.search-input:focus {
    outline: none;
    border-color: rgb(96, 165, 250);
}

/* After */
.search-input {
    width: 100%;
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-10);
    background: var(--color-surface-alpha);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
}

.search-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
}
```

## Efficiency Tips

### Find and Replace Patterns (VS Code)
1. **Colors**: Search `#[0-9a-fA-F]{6}` or `rgb\([^)]+\)` to find all hardcoded colors
2. **Spacing**: Search `\d+\.?\d*rem` to find all rem values
3. **Font Sizes**: Search `font-size:\s*\d+\.?\d*rem` for typography
4. **Border Radius**: Search `border-radius:\s*\d+\.?\d*rem` for rounded corners

### Common Mistakes to Avoid
1. **Don't change functionality** - Only replace hardcoded values with design system equivalents
2. **Maintain visual appearance** - Ensure exact same appearance after conversion
3. **Test dark mode** - Verify `light-dark()` functions work correctly
4. **Check responsive behavior** - Ensure mobile layouts remain intact

### Testing Checklist
- [ ] Visual appearance unchanged in light mode
- [ ] Visual appearance unchanged in dark mode
- [ ] Responsive behavior maintained
- [ ] Hover states work correctly
- [ ] Focus states work correctly
- [ ] Animations/transitions preserved
- [ ] No console errors
- [ ] Performance impact minimal

## Priority File Quick Reference

### TIER 1 - IMMEDIATE (Week 1-3)
1. `AdminCollectionView.vue` (1,277 lines → ~180 lines)
2. `AdminUsersView.vue` (1,133 lines → ~150 lines)
3. `AdminAnalyticsESI.vue` (1,037 lines → ~140 lines)
4. `AdminAnalyticsESILogs.vue` (1,077 lines → ~150 lines)
5. `AdminCustomPrices.vue` (1,046 lines → ~140 lines)
6. `CharacterDashboard.vue` (~630 lines → ~120 lines)
7. `CharacterMonthlyHistory.vue` (~350 lines → ~80 lines)
8. `CharacterShipStats.vue` (~380 lines → ~90 lines)

### Target: 80-85% CSS reduction for maximum impact
