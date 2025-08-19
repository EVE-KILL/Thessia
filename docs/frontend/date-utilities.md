# Date Utilities Implementation Guide

## Overview

We have successfully replaced moment.js with a centralized date formatting system using date-fns, resulting in significant bundle size reduction and improved maintainability.

## What Was Implemented

### 1. Core Date Utilities (`~/utils/dateUtils.ts`)

Pure functions for date formatting that can be used anywhere:

```typescript
import { formatTimeAgo, formatDateDisplay, formatDateTime } from '~/utils/dateUtils'

// Examples
formatTimeAgo('2024-01-01T10:00:00Z', 'en') // "2 days ago"
formatDateDisplay('2024-01-01', 'en')       // "1st January 2024"
formatDateTime('2024-01-01T10:00:00Z')      // "2024-01-01 10:00:00 UTC"
```

### 2. Reactive Composable (`~/composables/useDateFormatting.ts`)

Auto-imports and uses current i18n locale:

```vue
<script setup>
// Automatically available in all components
const { formatTimeAgo, formatDateDisplay } = useDateFormatting()

// Will automatically use current locale (en, de, es, fr, ja, ko, ru, zh)
const timeAgo = formatTimeAgo('2024-01-01T10:00:00Z') // Uses current locale
</script>
```

### 3. Available Functions

| Function | Purpose | Example Output |
|----------|---------|----------------|
| `formatTimeAgo()` | "x time ago" format | "2 hours ago" |
| `formatDateDisplay()` | Human readable date | "1st January 2024" |
| `formatYear()` | Just the year | "2024" |
| `formatTime()` | Time only | "14:30" |
| `formatTimeRange()` | Time ranges | "14:30 to 16:45" |
| `formatDateTime()` | Full datetime + UTC | "2024-01-01 14:30:00 UTC" |
| `formatSimpleDateTime()` | Simple datetime | "2024-01-01 14:30" |
| `formatShortDate()` | Short format | "Jan 01" |
| `formatDuration()` | Duration from ms | "2h 30m" |

## Migration Pattern

### Before (with moment.js)
```vue
<script setup>
import moment from 'moment'

const formatTimeAgo = (date) => {
    moment.locale(currentLocale.value)
    return moment.utc(date).fromNow()
}
</script>
```

### After (with centralized utils)
```vue
<script setup>
// No imports needed - auto-imported
const { formatTimeAgo } = useDateFormatting()
// That's it! Locale is handled automatically
</script>
```

## Components Updated

✅ **Pages Updated:**
- `~/pages/battles.vue` - Battle listings with time ranges and durations
- `~/pages/metenox.vue` - Moon extraction listings

✅ **Components Updated:**
- `~/components/items/ItemsPriceList.vue` - Price date displays
- `~/components/kill/KillInformationBox.vue` - Kill time displays and tooltips
- `~/components/campaign/CampaignKillList.vue` - Campaign kill timestamps
- `~/components/common/KillList.vue` - Main kill list timestamps
- `~/components/battle/BattleKills.vue` - Battle kill timestamps

## Locale Support

The system supports all the same locales as before:
- English (en) - default
- German (de)
- Spanish (es)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Russian (ru)
- Chinese (zh)

All formatting automatically uses the current i18n locale when using the composable.

## Benefits Achieved

### Bundle Size Reduction
- **Removed**: moment.js + moment-timezone (~640KB)
- **Added**: date-fns (~200KB, tree-shakeable)
- **Net Savings**: ~440KB bundle reduction

### Maintainability Improvements
- ✅ Single source of truth for date formatting
- ✅ Consistent formatting across all components
- ✅ Easy to update date formats globally
- ✅ Better TypeScript support
- ✅ Automatic locale handling

### Performance Improvements
- ✅ Tree shaking removes unused date-fns functions
- ✅ Smaller bundle = faster loading
- ✅ Reduced main-thread blocking time

## Usage Guidelines

### In Components
```vue
<template>
  <div>{{ formatTimeAgo(killTime) }}</div>
  <div>{{ formatDateDisplay(killTime) }}</div>
</template>

<script setup>
// Auto-imported composable
const { formatTimeAgo, formatDateDisplay } = useDateFormatting()
</script>
```

### In Utils/Composables
```typescript
import { formatTimeAgo } from '~/utils/dateUtils'

// Pass locale explicitly when not in component context
const timeAgo = formatTimeAgo(date, 'en')
```

### Adding New Formats
To add new date formats, update `~/utils/dateUtils.ts`:

```typescript
export function formatMyCustomDate(date: string | Date, locale = 'en'): string {
    const parsedDate = typeof date === 'string' ? new Date(date) : date
    return format(parsedDate, 'your-format', { locale: getDateLocale(locale) })
}
```

Then add to the composable in `~/composables/useDateFormatting.ts`:

```typescript
formatMyCustomDate: (date: string | Date) =>
    dateUtils.formatMyCustomDate(date, currentLocale.value),
```

## Testing

The "x minutes ago" functionality works exactly as before, but now:
- Uses less memory (date-fns vs moment.js)
- Loads faster (smaller bundle)
- Supports better tree shaking
- Has consistent behavior across all components

All existing date displays should work identically to how they did with moment.js.
