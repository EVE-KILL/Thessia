# Modular Dashboard System Documentation

## Overview

The Modular Dashboard System transforms the existing monolithic [`DomainDashboard.vue`](../app/components/DomainDashboard.vue) into a flexible, customizable component system. Users can now create custom dashboard layouts using inline HTML components with full CSS customization capabilities.

## Key Features

- ✨ **Modular Components**: Individual dashboard elements as standalone Vue components
- 🎨 **Custom HTML Templates**: User-defined layouts with drag-and-drop or code editing
- 💅 **CSS Customization**: Complete styling control with component-level customization
- 🔄 **Backward Compatibility**: Existing dashboards continue to work unchanged
- 📱 **Responsive Design**: All components are mobile-friendly by default
- ⚡ **TypeScript Support**: Full type safety with intelligent autocomplete

## Architecture

### Core Components

#### 1. Modular Dashboard Components
Located in [`app/components/domain/dashboard/stats/`](../app/components/domain/dashboard/stats/)

- **[`DomainDashboardTotalKillsBox`](../app/components/domain/dashboard/stats/DomainDashboardTotalKillsBox.vue)** - Displays total kill count
- **[`DomainDashboardISKDestroyedBox`](../app/components/domain/dashboard/stats/DomainDashboardISKDestroyedBox.vue)** - Shows ISK value destroyed
- **[`DomainDashboardTopShipBox`](../app/components/domain/dashboard/stats/DomainDashboardTopShipBox.vue)** - Most used ship type
- **[`DomainDashboardActiveEntitiesBox`](../app/components/domain/dashboard/stats/DomainDashboardActiveEntitiesBox.vue)** - Active pilots/corporations/alliances

#### 2. Template System
- **[`useDomainDashboardTemplate`](../app/composables/useDomainDashboardTemplate.ts)** - Template parsing and validation
- **[`DomainDashboardRenderer`](../app/components/domain/dashboard/DomainDashboardRenderer.vue)** - Dynamic template rendering
- **[`DomainDashboardEditor`](../app/components/domain/dashboard/DomainDashboardEditor.vue)** - Visual template editor

#### 3. Shared Infrastructure
- **[`useDomainDashboard`](../app/composables/useDomainDashboard.ts)** - Shared data fetching and utilities
- **[`types/index.ts`](../app/components/domain/dashboard/types/index.ts)** - TypeScript interfaces and types

## Quick Start

### Basic Usage

```vue
<template>
  <DomainDashboardRenderer
    :domain="myDomain"
    :template="customTemplate"
    :custom-css="customStyles"
    time-range="7d"
  />
</template>
```

### Creating Custom Templates

```html
<!-- Simple 2x2 Grid Layout -->
<div class="grid grid-cols-2 gap-6">
  <DomainDashboardTotalKillsBox
    domain="your-domain"
    time-range="7d"
    title="Weekly Kills"
    size="md" />

  <DomainDashboardISKDestroyedBox
    domain="your-domain"
    time-range="7d"
    :show-raw-number="false"
    size="md" />

  <DomainDashboardTopShipBox
    domain="your-domain"
    time-range="7d"
    :show-ship-icon="true"
    :show-percentage="true"
    size="md" />

  <DomainDashboardActiveEntitiesBox
    domain="your-domain"
    time-range="7d"
    entity-type="characters"
    size="md" />
</div>
```

### Custom CSS Example

```css
/* Customize component appearance */
.domain-dashboard-total-kills-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #667eea;
  border-radius: 16px;
}

.domain-dashboard-isk-destroyed-box:hover {
  transform: scale(1.05);
  transition: transform 0.3s ease;
}

/* Responsive customization */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

## Component API Reference

### DomainDashboardTotalKillsBox

Displays the total kill count for a specified time period.

```html
<DomainDashboardTotalKillsBox
  domain="string"          <!-- Required: Domain identifier -->
  time-range="7d"          <!-- Optional: 1d|7d|14d|30d (default: 7d) -->
  title="Total Kills"      <!-- Optional: Box title -->
  size="md"                <!-- Optional: sm|md|lg (default: md) -->
  :show-trend="false"      <!-- Optional: Show trend indicator -->
  custom-class="my-class"  <!-- Optional: Additional CSS classes -->
  :custom-styles="{}"      <!-- Optional: Inline styles object -->
/>
```

### DomainDashboardISKDestroyedBox

Shows the total ISK value destroyed with formatting options.

```html
<DomainDashboardISKDestroyedBox
  domain="string"              <!-- Required: Domain identifier -->
  time-range="7d"              <!-- Optional: 1d|7d|14d|30d -->
  title="ISK Destroyed"        <!-- Optional: Box title -->
  size="md"                    <!-- Optional: sm|md|lg -->
  :show-raw-number="false"     <!-- Optional: Show unformatted number -->
  currency="ISK"               <!-- Optional: Currency label -->
  custom-class="my-class"      <!-- Optional: Additional CSS classes -->
  :custom-styles="{}"          <!-- Optional: Inline styles object -->
/>
```

### DomainDashboardTopShipBox

Displays the most frequently used ship type with optional icon and statistics.

```html
<DomainDashboardTopShipBox
  domain="string"              <!-- Required: Domain identifier -->
  time-range="7d"              <!-- Optional: 1d|7d|14d|30d -->
  title="Top Ship"             <!-- Optional: Box title -->
  count-label="kills"          <!-- Optional: Label for count display -->
  :show-ship-icon="true"       <!-- Optional: Display ship icon -->
  :show-percentage="true"      <!-- Optional: Show percentage -->
  size="md"                    <!-- Optional: sm|md|lg -->
  metric="kills"               <!-- Optional: kills|losses|involved -->
  custom-class="my-class"      <!-- Optional: Additional CSS classes -->
  :custom-styles="{}"          <!-- Optional: Inline styles object -->
/>
```

### DomainDashboardActiveEntitiesBox

Shows active entity counts with optional breakdown by type.

```html
<DomainDashboardActiveEntitiesBox
  domain="string"              <!-- Required: Domain identifier -->
  time-range="7d"              <!-- Optional: 1d|7d|14d|30d -->
  title="Active Entities"      <!-- Optional: Box title -->
  entity-type="characters"     <!-- Optional: characters|corporations|alliances|all -->
  :show-breakdown="false"      <!-- Optional: Show entity type breakdown -->
  :activity-threshold="1"      <!-- Optional: Minimum activity threshold -->
  size="md"                    <!-- Optional: sm|md|lg -->
  custom-class="my-class"      <!-- Optional: Additional CSS classes -->
  :custom-styles="{}"          <!-- Optional: Inline styles object -->
/>
```

## Template Editor

The system includes a visual template editor accessible at `/domain/{domain}/dashboard/customizer`.

### Features

- 📝 **Code Editor**: Direct HTML/CSS editing with syntax highlighting
- 👁️ **Live Preview**: Real-time preview of changes
- 📚 **Component Documentation**: Built-in component reference
- 💾 **Template Export/Import**: Save and share custom templates
- 🎨 **Preset Templates**: Pre-built layouts for common use cases

### Usage

```vue
<template>
  <DomainDashboardEditor
    :domain="domain"
    :initial-template="savedTemplate"
    :initial-css="savedCss"
    @template-save="onTemplateSave"
    @template-change="onTemplateChange"
  />
</template>
```

## Advanced Usage

### Dynamic Component Loading

Components are loaded dynamically to improve performance:

```typescript
import { DASHBOARD_COMPONENTS } from '~/components/domain/dashboard/stats';

// Load component dynamically
const component = await DASHBOARD_COMPONENTS['DomainDashboardTotalKillsBox']();
```

### Template Validation

Templates are automatically validated for:

- Valid HTML structure
- Required component props
- Component availability
- CSS syntax (basic)

```typescript
import { useDomainDashboardTemplate } from '~/composables/useDomainDashboardTemplate';

const { parseTemplate, isTemplateValid } = useDomainDashboardTemplate();

const result = parseTemplate(htmlTemplate);
if (!result.isValid) {
  console.error('Template errors:', result.errors);
}
```

### Custom Data Sources

Components can be extended to use custom data sources:

```typescript
// In your component
const { componentData } = useDomainDashboard({
  domain: props.domain,
  timeRange: props.timeRange,
  customEndpoint: '/api/custom-data' // Optional custom endpoint
});
```

## Migration Guide

### From Existing Dashboard

Existing dashboards continue to work unchanged. To migrate to the modular system:

1. **Identify Components**: Map existing dashboard sections to modular components
2. **Create Template**: Build HTML template using modular components
3. **Style Customization**: Extract and adapt existing CSS
4. **Test Thoroughly**: Ensure data accuracy and visual consistency
5. **Gradual Rollout**: Deploy to specific domains first

### Example Migration

**Before (Monolithic):**
```vue
<!-- Old dashboard with hardcoded layout -->
<div class="dashboard-stats">
  <div class="stats-grid">
    <!-- Hardcoded kill count display -->
    <div class="kill-count">{{ totalKills }}</div>
    <!-- More hardcoded components -->
  </div>
</div>
```

**After (Modular):**
```vue
<!-- New modular dashboard -->
<DomainDashboardRenderer
  :domain="domain"
  :template="customTemplate"
/>
```

## Performance Considerations

### Optimization Features

- **Lazy Loading**: Components load only when needed
- **Data Caching**: Shared data fetching prevents duplicate requests
- **Bundle Splitting**: Each component is separately bundled
- **SSR Compatible**: Works with Nuxt 3 server-side rendering

### Best Practices

1. **Minimize Components**: Use only necessary components per template
2. **Optimize Images**: Compress ship icons and other assets
3. **Cache Templates**: Store frequently used templates
4. **Batch Updates**: Group template changes together

## Troubleshooting

### Common Issues

#### Template Not Rendering
- Check template syntax and component names
- Verify all required props are provided
- Check browser console for JavaScript errors

#### Styling Issues
- Ensure CSS classes don't conflict with existing styles
- Use scoped CSS or unique class names
- Test across different screen sizes

#### Data Not Loading
- Verify domain parameter is correct
- Check API endpoints are accessible
- Monitor network requests for errors

### Debug Tools

Enable debug mode for additional logging:

```typescript
const { parsedTemplate } = useDomainDashboardTemplate();

// Debug parsed template
console.log('Parsed template:', parsedTemplate.value);
```

## Contributing

### Adding New Components

1. Create component in [`app/components/domain/dashboard/stats/`](../app/components/domain/dashboard/stats/)
2. Follow existing component patterns
3. Add to [`index.ts`](../app/components/domain/dashboard/stats/index.ts) exports
4. Update [`useDomainDashboardTemplate`](../app/composables/useDomainDashboardTemplate.ts) documentation
5. Add tests and documentation

### Component Structure

```vue
<template>
  <div
    :class="componentClasses"
    :style="componentStyles"
    class="base-component-classes"
  >
    <!-- Component content -->
  </div>
</template>

<script setup lang="ts">
import type { DomainDashboardComponentProps } from '../types';

interface Props extends DomainDashboardComponentProps {
  // Component-specific props
}

const props = withDefaults(defineProps<Props>(), {
  // Default values
});

// Use shared composable
const {
  componentData,
  isLoading,
  componentClasses,
  componentStyles
} = useDomainDashboard(props);
</script>
```

## Future Roadmap

- 📊 **Additional Components**: Charts, graphs, and advanced visualizations
- 🔌 **Plugin System**: Third-party component integration
- 🎨 **Theme System**: Pre-built design themes
- 📱 **Mobile App**: Native mobile template editor
- 🤖 **AI Assistant**: Automatic layout suggestions
- 🔄 **Real-time Updates**: Live data streaming
- 🌐 **Multi-language**: Internationalization support

## Support

For issues, questions, or feature requests:

1. Check the [troubleshooting section](#troubleshooting)
2. Review component documentation
3. Create an issue with detailed reproduction steps
4. Join the community discussions

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Compatibility**: Nuxt 3.x, Vue 3.x
