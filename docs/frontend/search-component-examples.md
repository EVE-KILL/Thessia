# Search Component Usage Examples

The new generic Search component can be used across the entire application with different configurations. This component provides a consistent search experience with proper styling, API integration, and customizable behavior.

## Basic Usage

```vue
<template>
  <Search
    v-model="searchQuery"
    :placeholder="t('searchFor')"
    :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
    :transform-response="(data) => data?.hits || []"
    :result-name="(result) => result.name"
    @select="handleResultSelection"
  />
</template>

<script setup lang="ts">
const searchQuery = ref('')

const handleResultSelection = (result: any) => {
  // Handle the selected result
  console.log('Selected:', result)
  // Clear search after selection
  searchQuery.value = ''
}
</script>
```

## Advanced Usage with Custom API and Response Transformation

```vue
<template>
  <Search
    v-model="searchQuery"
    :placeholder="t('searchForComments')"
    :api-url="(query) => `/api/comments/search?q=${encodeURIComponent(query)}`"
    :transform-response="transformCommentsResponse"
    :result-name="(result) => result.comment_text.substring(0, 50) + '...'"
    :result-description="(result) => `by ${result.author_name}`"
    :min-length="3"
    :debounce-ms="500"
    input-class="w-full px-3 py-2 border border-gray-300 dark:border-gray-300 rounded-md shadow-sm bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    dropdown-class="absolute z-50 mt-1 w-full bg-gray-300 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
    @select="handleCommentSelection"
  />
</template>

<script setup lang="ts">
const searchQuery = ref('')

const transformCommentsResponse = (response: any) => {
  return response.comments || []
}

const handleCommentSelection = (comment: any) => {
  navigateTo(`/killmail/${comment.killmail_id}#comment-${comment._id}`)
  searchQuery.value = ''
}
</script>
```

## Standard Entity Search Pattern (Campaign Creator Style)

This is the recommended pattern for entity searches across the application:

```vue
<template>
  <Search
    v-model="filterState.region.searchQuery"
    :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
    :transform-response="(data: any) => data?.hits?.filter((hit: any) => hit.type === 'region') || []"
    :result-name="(result: any) => formatSearchResultDisplayName(result)"
    :min-length="2"
    :disabled="isLimitReached('region')"
    :placeholder="t('search.region')"
    input-class="w-full px-3 py-2 border border-gray-300 dark:border-gray-300 rounded-md shadow-sm bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    dropdown-class="absolute z-50 mt-1 w-full bg-gray-300 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
    @select="(result: any) => selectSearchResult('region', result)">

    <template #results="{ results, selectResult }">
      <a v-for="result in results" :key="result.id" @click="selectResult(result)"
         class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
        <div class="flex-shrink-0 mr-3">
          <Image :type="result.type === 'ship' ? 'type-icon' : result.type"
                 :id="result.id" :size="24" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ result.name }}</div>
        </div>
      </a>
    </template>

    <template #loading>
      <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('search.searching') }}...
      </div>
    </template>

    <template #no-results>
      <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('search.noResults') }}
      </div>
    </template>
  </Search>
</template>

<script setup lang="ts">
const filterState = reactive({
  region: {
    searchQuery: '',
    multipleValues: [],
    maxEntities: 10
  }
})

const selectSearchResult = (filterType: string, result: any) => {
  // Add to selected entities
  if (!isLimitReached(filterType)) {
    filterState[filterType].multipleValues.push({
      id: result.id,
      name: result.name,
      type: result.type
    })
  }
  // Clear search query
  filterState[filterType].searchQuery = ''
}

const formatSearchResultDisplayName = (result: any) => {
  return result.name || result.character_name || result.corporation_name || result.alliance_name
}

const isLimitReached = (filterType: string) => {
  return filterState[filterType].multipleValues.length >= filterState[filterType].maxEntities
}
</script>
```

## Different Entity Types

Here are examples for different entity types using the same pattern:

### Character Search

```vue
<Search
  v-model="characterSearchQuery"
  :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
  :transform-response="(data: any) => data?.hits?.filter((hit: any) => hit.type === 'character') || []"
  :result-name="(result: any) => formatSearchResultDisplayName(result)"
  :placeholder="t('search.character')"
  @select="(result: any) => handleCharacterSelect(result)"
/>
```

### Corporation Search

```vue
<Search
  v-model="corporationSearchQuery"
  :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
  :transform-response="(data: any) => data?.hits?.filter((hit: any) => hit.type === 'corporation') || []"
  :result-name="(result: any) => formatSearchResultDisplayName(result)"
  :placeholder="t('search.corporation')"
  @select="(result: any) => handleCorporationSelect(result)"
/>
```

### Alliance Search

```vue
<Search
  v-model="allianceSearchQuery"
  :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
  :transform-response="(data: any) => data?.hits?.filter((hit: any) => hit.type === 'alliance') || []"
  :result-name="(result: any) => formatSearchResultDisplayName(result)"
  :placeholder="t('search.alliance')"
  @select="(result: any) => handleAllianceSelect(result)"
/>
```

## Custom Input and Results Slots

```vue
<template>
  <Search
    v-model="searchQuery"
    :api-url="'/api/search'"
    @select="handleSelection">

    <!-- Custom input with different styling -->
    <template #input="{ modelValue, updateQuery, isLoading }">
      <div class="custom-search-wrapper">
        <input
          :value="modelValue"
          @input="updateQuery"
          placeholder="Custom search..."
          class="my-custom-input-class"
        />
        <div v-if="isLoading" class="loading-spinner">Loading...</div>
      </div>
    </template>

    <!-- Custom results display -->
    <template #results="{ results, selectResult, highlightedIndex }">
      <div class="custom-results-container">
        <div
          v-for="(result, index) in results"
          :key="result.id"
          @click="selectResult(result)"
          :class="{ 'highlighted': index === highlightedIndex }"
          class="custom-result-item">
          <h3>{{ result.name }}</h3>
          <p>{{ result.description }}</p>
        </div>
      </div>
    </template>
  </Search>
</template>
```

## Styling Guidelines

### Standard Input Styling

Use this consistent styling across all search components:

```css
input-class="w-full px-3 py-2 border border-gray-300 dark:border-gray-300 rounded-md shadow-sm bg-gray-300 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
```

### Standard Dropdown Styling

Use this consistent dropdown styling:

```css
dropdown-class="absolute z-50 mt-1 w-full bg-gray-300 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
```

### Result Item Styling

Standard result item classes for templates:

```css
class="flex items-center px-4 py-2 text-sm cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
```

## Configuration for Entity Search (like in Comments page)

```vue
<template>
  <Search
    v-model="entitySearchTerm"
    :placeholder="t('searchEntity')"
    :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
    :transform-response="filterEntityResults"
    :result-key="(result) => result.id"
    :result-name="(result) => result.name"
    :result-type="(result) => result.type"
    :result-description="(result) => result.ticker ? `[${result.ticker}]` : result.type"
    :min-length="2"
    @select="handleEntitySelection"
  />
</template>

<script setup lang="ts">
const entitySearchTerm = ref('')
const filterType = ref('character') // 'character', 'corporation', 'alliance'

const filterEntityResults = (response: any) => {
  if (response?.data?.hits) {
    return response.data.hits.filter((hit: any) => hit.type === filterType.value)
  }
  return []
}

const handleEntitySelection = (entity: any) => {
  // Handle entity selection
  selectedEntity.value = entity
}
</script>
```

## Props Reference

### Required Props

- `modelValue` (string, required): The search query (use with v-model)
- `apiUrl` (string | function): API endpoint URL or function that returns URL with query parameter

### Optional Props

- `placeholder` (string): Input placeholder text
- `transformResponse` (function): Transform API response to array of results (default: returns response as-is)
- `resultName` (string | function): How to get display name for each result (default: result.name)
- `resultDescription` (string | function): How to get description for each result (optional)
- `resultKey` (string | function): How to get unique key for each result (default: result.id)
- `minLength` (number, default: 1): Minimum characters before searching
- `debounceMs` (number, default: 300): Debounce delay in milliseconds
- `disabled` (boolean, default: false): Disable the input
- `inputClass` (string): CSS classes for the input element
- `dropdownClass` (string): CSS classes for the dropdown container

### Styling Props

- `inputClass`: Complete input styling (see Styling Guidelines above)
- `dropdownClass`: Complete dropdown styling (see Styling Guidelines above)

### API URL Patterns

The `apiUrl` prop should follow these patterns:

#### Static URL (not recommended)

```javascript
:api-url="'/api/search'"
```

#### Dynamic URL with Query Encoding (recommended)

```javascript
:api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
```

#### Complex API URLs

```javascript
:api-url="(query) => `/api/advanced-search?q=${encodeURIComponent(query)}&type=entity&limit=20`"
```

## Events

- `@select`: Fired when a result is selected - receives the selected result object
- `@search`: Fired when a search is performed - receives the search query
- `@clear`: Fired when search is cleared
- `@focus`: Fired when input gains focus
- `@blur`: Fired when input loses focus
- `@dropdown-visibility-changed`: Fired when dropdown opens/closes

## Slots

- `#results`: Custom results display - receives `{ results, selectResult, highlightedIndex }`
- `#loading`: Custom loading state display
- `#error`: Custom error state display
- `#no-results`: Custom no results state display

## Best Practices

### 1. Always Clear Search After Selection

```javascript
const handleSelection = (result) => {
  // Process the selection
  processSelection(result)
  // Clear the search query
  searchQuery.value = ''
}
```

### 2. Use Proper Query Encoding

```javascript
// ✅ Good - properly encode the query
:api-url="(query) => `/api/search/${encodeURIComponent(query)}`"

// ❌ Bad - no encoding, can break with special characters
:api-url="(query) => `/api/search/${query}`"
```

### 3. Filter API Responses Appropriately

```javascript
// ✅ Good - filter for specific entity types
:transform-response="(data) => data?.hits?.filter(hit => hit.type === 'character') || []"

// ❌ Bad - no filtering, returns mixed results
:transform-response="(data) => data?.hits || []"
```

### 4. Use Consistent Styling

Always use the standard styling classes defined in the Styling Guidelines section for consistency across the application.

### 5. Handle Loading and Error States

```vue
<template #loading>
  <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
    {{ $t('search.searching') }}...
  </div>
</template>

<template #no-results>
  <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
    {{ $t('search.noResults') }}
  </div>
</template>
```

## Troubleshooting

### Search Not Working

1. Check that `apiUrl` is properly formatted and the API endpoint exists
2. Verify `transformResponse` is returning an array
3. Check browser network tab for API errors

### Styling Issues

1. Ensure you're using the standard `inputClass` and `dropdownClass` values
2. Check for CSS conflicts with custom styles
3. Verify dark mode classes are included

### Results Not Displaying

1. Check that `resultName` prop is correctly extracting the display name
2. Verify the API response structure matches your `transformResponse` function
3. Check console for JavaScript errors

### Performance Issues

1. Increase `debounceMs` for slower networks
2. Increase `minLength` to reduce unnecessary API calls
3. Consider implementing result caching in your API

### Styling Issues with Vue Component Scoping

When using the Search component within other Vue components with scoped styles, you may encounter issues where custom styling doesn't apply properly due to Vue's scoped CSS isolation. Here's how to resolve this:

#### Problem

The Search component uses its own scoped styles, which prevents parent component styles from affecting the input and dropdown elements, even when using `input-class` and `dropdown-class` props.

#### Solution: Using `:deep()` Selectors

Use Vue's `:deep()` pseudo-class to penetrate component scoping and style child component elements:

```vue
<template>
  <Search
    v-model="searchQuery"
    :placeholder="t('searchItemPlaceholder')"
    :api-url="(query) => `/api/search/${encodeURIComponent(query)}`"
    :transform-response="transformResponse"
    :result-name="(result) => result.name"
    wrapper-class="w-full"
    input-class="w-full"
    dropdown-class="search-dropdown w-full"
    @select="handleSelection"
  />
</template>

<style scoped>
/* Override Search component input styling */
:deep(.search-component input) {
    padding: 0.75rem !important;
    background-color: rgb(23, 23, 23) !important;
    border: 1px solid rgb(55, 55, 55) !important;
    border-radius: 0.375rem !important;
    color: white !important;
    font-size: 0.875rem !important;
}

:deep(.search-component input:focus) {
    outline: none !important;
    border-color: rgb(59, 130, 246) !important;
}

/* Override Search component dropdown styling */
:deep(.search-dropdown) {
    background-color: rgb(23, 23, 23) !important;
    border: 1px solid rgb(55, 55, 55) !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1) !important;
}

:deep(.search-dropdown a) {
    color: rgb(243, 244, 246) !important;
    background-color: transparent !important;
}

:deep(.search-dropdown a:hover) {
    background-color: rgb(55, 55, 55) !important;
    color: white !important;
}
</style>
```

#### Key Points for `:deep()` Usage

1. **Use `!important`**: Required to override component's internal styles
2. **Target specific classes**: Use `.search-component` or your custom `dropdown-class` to target elements
3. **Include all states**: Don't forget `:focus`, `:hover`, and other pseudo-states
4. **Match existing theme**: Use consistent colors and spacing from your design system

#### Alternative: CSS Custom Properties

For more maintainable theming, consider using CSS custom properties:

```vue
<style scoped>
:deep(.search-component) {
    --search-bg-color: rgb(23, 23, 23);
    --search-border-color: rgb(55, 55, 55);
    --search-text-color: white;
    --search-focus-color: rgb(59, 130, 246);
}

:deep(.search-component input) {
    background-color: var(--search-bg-color) !important;
    border-color: var(--search-border-color) !important;
    color: var(--search-text-color) !important;
}
</style>
```

This approach allows for easier theme customization and better maintainability across different components.
