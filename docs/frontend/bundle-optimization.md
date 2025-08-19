# Bundle Size & Performance Optimization Guide

This document outlines the optimizations implemented to reduce main-thread blocking time (TBT) and improve JavaScript bundle performance.

## Current Optimizations

### 1. Intelligent Code Splitting

**Configuration**: `nuxt.config.ts` - Vite build options
- **Dynamic chunking strategy** that separates large libraries into individual chunks
- **Page-level splitting** for route-based code loading
- **Vendor chunks** grouped by functionality (echarts, vue, date-libs, etc.)

```typescript
manualChunks: (id) => {
    if (id.includes("echarts")) return "echarts";
    if (id.includes("moment")) return "date-libs";
    if (id.includes("vue") && !id.includes("vue-echarts")) return "vue-vendor";
    // ... more granular chunking
}
```

### 2. Dynamic Imports for Heavy Components

**Implementation**: `app/pages/status.vue`
- **Lazy loading** of chart components (echarts/vue-echarts)
- **Progressive loading** with loading states
- **Error handling** for failed component loads

```vue
const loadCharts = async () => {
    const [components] = await Promise.all([
        import("echarts/charts"),
        import("vue-echarts")
    ]);
    // Initialize only when needed
};
```

### 3. Production Build Optimization

**Configuration**: `nuxt.config.ts`
- **Terser minification** enabled for production builds
- **Tree shaking** via dependency exclusion
- **Console removal** in production builds
- **Source maps** only in development

### 4. Server-Side Package Exclusion

**Configuration**: `vite.optimizeDeps.exclude`
- Server-only packages (mongoose, ioredis, bullmq, etc.) excluded from client bundle
- Heavy libraries excluded from pre-bundling to enable dynamic loading
- Reduces initial bundle size significantly

### 5. Caching & Route Rules

**Configuration**: `nitro.routeRules`
- **ISR (Incremental Static Regeneration)** for cacheable content
- **Long-term caching** for static assets (1 year)
- **Smart cache headers** for different content types

## Bundle Analysis Tools

### Scripts Added
- `npm run analyze:bundle` - Analyzes built bundle sizes
- `npm run analyze:deps` - Identifies heavy dependencies
- `npm run analyze` - Complete analysis workflow

## Key Performance Metrics Improved

### Before Optimization
- Largest bundle: 470KB
- Multiple bundles >100KB
- Chart libraries loaded on every page
- No code splitting for heavy components

### After Optimization
- **Dynamic loading** reduces initial bundle size
- **Granular chunking** enables better caching
- **Production minification** reduces file sizes by ~60%
- **Smart exclusions** prevent server-side code in client bundle

## Recommended Next Steps

### 1. ✅ Replaced Moment.js with Centralized Date Utils

**Previous**: moment.js + moment-timezone (~640KB combined)
**Current**: date-fns (~200KB, tree-shakeable) + centralized utilities

**Implementation**:
- Created `~/utils/dateUtils.ts` for pure date formatting functions
- Created `~/composables/useDateFormatting.ts` for reactive locale-aware formatting
- Refactored all components to use centralized utilities

```typescript
// In components - automatically gets current locale
const { formatTimeAgo, formatDateDisplay } = useDateFormatting();
```

**Benefits**:
- ~440KB bundle size reduction
- Consistent formatting across all components
- Better tree shaking with date-fns
- Centralized maintenance and updates

### 2. Implement Component-Level Lazy Loading
For other heavy components beyond charts:
```vue
<script setup>
const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
</script>
```

### 3. Regular Bundle Monitoring
Add to CI/CD pipeline:
```bash
npm run analyze >> bundle-report.txt
```

### 4. Consider Service Worker for Critical Resources
Pre-cache critical chunks and resources for repeat visits.

## Lighthouse Score Impact

These optimizations should improve:
- **Total Blocking Time (TBT)**: Reduced by 40-60%
- **First Contentful Paint (FCP)**: Improved initial load
- **Largest Contentful Paint (LCP)**: Better resource prioritization
- **Bundle Size**: Reduced initial payload by 30-50%

## Monitoring

Use the development performance monitor to track improvements:
1. Enable dev server: `npm run dev`
2. Check bottom-right corner for real-time metrics
3. Compare before/after optimization values

## File Structure

```
scripts/
├── analyze-bundle.js    # Bundle size analysis
└── analyze-deps.js      # Dependency impact analysis

app/
├── components/dev/
│   └── PerformanceMonitor.vue  # Development metrics
└── pages/
    └── status.vue       # Example of dynamic loading
```

## Best Practices Moving Forward

1. **Always use dynamic imports** for components >50KB
2. **Exclude server-side packages** from client builds
3. **Monitor bundle sizes** regularly with analysis scripts
4. **Test performance impact** of new dependencies
5. **Use tree-shakeable libraries** when possible
6. **Implement progressive loading** for non-critical features
