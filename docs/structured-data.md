# Structured Data Implementation

This document explains the structured data (JSON-LD) implementation for SEO enhancement on the EVE-KILL website.

## Overview

Structured data helps search engines understand the content of web pages and can enhance search results with rich snippets, knowledge panels, and better categorization.

## Implementation

### Composable: `useStructuredData`

The `useStructuredData` composable provides reusable functions for generating structured data following Schema.org specifications.

**Location:** `/app/composables/useStructuredData.ts`

### Available Functions

#### `generateFAQStructuredData(faqItems)`
Generates FAQPage schema for FAQ pages.
- **Input:** Array of objects with `label` and `content` properties
- **Output:** Schema.org FAQPage structured data

#### `generateWebsiteStructuredData(navigationItems)`
Generates WebSite schema with navigation elements.
- **Input:** Array of navigation items with optional children
- **Output:** Schema.org WebSite with SiteNavigationElement

#### `generateOrganizationStructuredData()`
Generates Organization schema for the EVE-KILL organization.
- **Output:** Schema.org Organization structured data

#### `generateBreadcrumbStructuredData(breadcrumbs)`
Generates BreadcrumbList schema for breadcrumb navigation.
- **Input:** Array of breadcrumb items with `name` and `url`
- **Output:** Schema.org BreadcrumbList structured data

#### `generateArticleStructuredData(article)`
Generates Article schema for blog posts, guides, etc.
- **Input:** Article object with metadata
- **Output:** Schema.org Article structured data

#### `addStructuredDataToHead(structuredData)`
Adds structured data to the page head.
- **Input:** Single structured data object or array of objects
- **Behavior:** Adds `<script type="application/ld+json">` tags to head

## Current Implementation

### FAQ Page (`/faq`)
- **Schema Type:** FAQPage
- **Features:**
  - All FAQ items from i18n translations
  - Proper question/answer structure
  - Enhanced SEO metadata

### Index Page (`/`)
- **Schema Types:** WebSite + Organization
- **Features:**
  - Complete site navigation structure
  - Search action definition
  - Organization details with contact info
  - Enhanced SEO metadata

## Benefits

1. **Rich Snippets:** FAQ pages may show expandable Q&A in search results
2. **Site Navigation:** Search engines better understand site structure
3. **Knowledge Panel:** Organization info may appear in knowledge panels
4. **Better Categorization:** Content is properly categorized for search engines
5. **Voice Search:** Structured data improves voice search compatibility

## Best Practices

1. **Validation:** Always validate structured data using Google's Rich Results Test
2. **Accuracy:** Ensure structured data matches visible page content
3. **Completeness:** Include all relevant properties for better results
4. **Consistency:** Use consistent data across all pages

## Testing

Use these tools to validate the structured data:

1. **Google Rich Results Test:** https://search.google.com/test/rich-results
2. **Schema.org Validator:** https://validator.schema.org/
3. **Google Search Console:** Monitor rich result performance

## Usage Examples

### Adding FAQ Structured Data
```vue
<script setup lang="ts">
const { generateFAQStructuredData, addStructuredDataToHead } = useStructuredData();

const faqItems = [
    {
        label: "What is a killmail?",
        content: "A killmail is a record of ship destruction in EVE Online..."
    }
];

const faqStructuredData = generateFAQStructuredData(faqItems);
addStructuredDataToHead(faqStructuredData);
</script>
```

### Adding Navigation Structured Data
```vue
<script setup lang="ts">
const { generateWebsiteStructuredData, addStructuredDataToHead } = useStructuredData();

const navigationItems = [
    {
        name: "Home",
        url: "https://eve-kill.com/",
        children: [
            { name: "Latest Kills", url: "https://eve-kill.com/kills/latest" }
        ]
    }
];

const websiteStructuredData = generateWebsiteStructuredData(navigationItems);
addStructuredDataToHead(websiteStructuredData);
</script>
```

## Future Enhancements

Consider adding structured data for:
- Individual killmail pages (using custom schema or Article)
- Battle report pages (Event schema)
- Character/Corporation pages (Person/Organization schema)
- Statistics pages (Dataset schema)
- Campaign pages (Event schema)

## Maintenance

- Update structured data when navigation changes
- Keep organization details current
- Add new schema types as needed
- Monitor search performance and adjust accordingly
