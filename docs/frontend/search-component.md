# Search Component

A generic, reusable search component that provides all the core search functionality while allowing complete customization of the UI through slots.

## Features

- **Generic and reusable**: Can be styled differently across the application
- **Slot-based customization**: Complete control over input and dropdown appearance
- **Keyboard navigation**: Arrow keys, Enter, and Escape support
- **Auto-search with debouncing**: Configurable minimum characters and debounce timing
- **Category-based results**: Groups results by entity type (character, corporation, etc.)
- **Mobile-friendly**: Supports different layouts for mobile and desktop
- **Internationalization**: Uses the i18n system for localization

## Basic Usage

```vue
<template>
  <Search
    :placeholder="t('searchFor')"
    :min-characters="3"
    :debounce-ms="300"
    :max-results-per-category="5"
    :show-category-headers="true"
    @result-selected="handleResultSelected"
    @view-all-results="handleViewAllResults"
    @query-changed="handleQueryChanged"
  />
</template>

<script setup lang="ts">
const handleResultSelected = (hit: any) => {
  // Navigate to the selected entity
  const routeType = hit.type === 'ship' ? 'item' : hit.type;
  navigateTo(`/${routeType}/${hit.id}`);
};

const handleViewAllResults = () => {
  const { navigateToSearch } = useSearch();
  navigateToSearch();
};

const handleQueryChanged = (query: string) => {
  console.log('Search query changed:', query);
};
</script>
```

## Custom Input Styling

You can completely customize the input appearance using the `input` slot:

```vue
<template>
  <Search @result-selected="handleResultSelected">
    <template #input="{ query, updateQuery, isLoading, placeholder, handleKeydown, handleFocus, inputRef }">
      <div class="my-custom-input-wrapper">
        <input
          ref="inputRef"
          :value="query"
          @input="updateQuery(($event.target as HTMLInputElement).value)"
          :placeholder="placeholder"
          class="my-custom-input-class"
          type="search"
          @keydown="handleKeydown"
          @focus="handleFocus"
        />
        <Icon
          :name="isLoading ? 'loading' : 'search'"
          :class="{ 'spin': isLoading }"
        />
      </div>
    </template>
  </Search>
</template>
```

## Custom Dropdown Styling

Customize the results dropdown using the `dropdown` slot:

```vue
<template>
  <Search @result-selected="handleResultSelected">
    <template #dropdown="{
      showResults,
      groupedResults,
      flattenedResults,
      activeItemIndex,
      handleResultSelect,
      handleViewAllResults,
      results
    }">
      <div v-if="showResults" class="my-custom-dropdown">
        <div v-for="(hits, type) in groupedResults" :key="type">
          <h3>{{ type }}</h3>
          <div
            v-for="hit in hits"
            :key="hit.id"
            @click="handleResultSelect(hit)"
            :class="{ 'active': flattenedResults.indexOf(hit) === activeItemIndex }"
          >
            {{ hit.name }}
          </div>
        </div>
        <button @click="handleViewAllResults">
          View all {{ results?.estimatedTotalHits }} results
        </button>
      </div>
    </template>
  </Search>
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `'Search...'` | Placeholder text for the input |
| `minCharacters` | `number` | `3` | Minimum characters before search starts |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |
| `maxResultsPerCategory` | `number` | `5` | Maximum results to show per category |
| `showCategoryHeaders` | `boolean` | `true` | Whether to show category headers |
| `containerClass` | `string` | `''` | Custom CSS class for the container |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `result-selected` | `hit: SearchHit` | Emitted when a search result is selected |
| `view-all-results` | `void` | Emitted when "view all results" is triggered |
| `query-changed` | `query: string` | Emitted when search query changes |
| `dropdown-visibility-changed` | `visible: boolean` | Emitted when dropdown visibility changes |

## Slots

### `input`
Complete control over the search input.

**Slot Props:**

- `query: Ref<string>` - The current search query
- `updateQuery: (value: string) => void` - Function to update the search query
- `isLoading: Ref<boolean>` - Whether a search is in progress
- `placeholder: string` - The placeholder text
- `handleKeydown: (e: KeyboardEvent) => void` - Keyboard event handler
- `handleFocus: () => void` - Focus event handler
- `inputRef: Ref<HTMLInputElement>` - Reference to bind to the input element

### `dropdown`
Complete control over the search results dropdown.

**Slot Props:**
- `showResults: ComputedRef<boolean>` - Whether to show results
- `groupedResults: ComputedRef<Record<string, any[]>>` - Results grouped by type
- `flattenedResults: ComputedRef<any[]>` - Flat array of all results
- `activeItemIndex: Ref<number>` - Currently active item index for keyboard navigation
- `activeCategory: Ref<string>` - Currently active category
- `handleResultSelect: (hit: any) => void` - Function to select a result
- `handleViewAllResults: () => void` - Function to view all results
- `getIconForEntityType: (type: string) => string` - Helper to get entity icons
- `getColorForEntityType: (type: string) => string` - Helper to get entity colors
- `shouldShowTicker: (type: string) => boolean` - Helper to determine if ticker should show
- `maxResultsPerCategory: number` - Max results per category
- `showCategoryHeaders: boolean` - Whether to show category headers
- `results: Ref<SearchResponse | null>` - Full search response

### `loading`
Custom loading indicator.

**Slot Props:**
- `isLoading: Ref<boolean>` - Whether a search is in progress

### `no-results`
Custom empty state when no results are found.

**Slot Props:**
- `query: Ref<string>` - Current search query
- `hasQuery: boolean` - Whether query meets minimum character requirement
- `isLoading: Ref<boolean>` - Whether a search is in progress

## Exposed Methods

The component exposes these methods via template refs:

```vue
<template>
  <Search ref="searchRef" />
</template>

<script setup lang="ts">
const searchRef = ref();

// Access exposed properties and methods
console.log(searchRef.value.query);
console.log(searchRef.value.results);
searchRef.value.focus();
searchRef.value.clearSearch();
</script>
```

**Exposed:**
- `query: Ref<string>` - Current search query
- `results: Ref<SearchResponse | null>` - Search results
- `isLoading: Ref<boolean>` - Loading state
- `showResults: ComputedRef<boolean>` - Whether results should be shown
- `groupedResults: ComputedRef<Record<string, any[]>>` - Grouped results
- `flattenedResults: ComputedRef<any[]>` - Flat results array
- `activeItemIndex: Ref<number>` - Active item index
- `activeCategory: Ref<string>` - Active category
- `focus: () => void` - Focus the input
- `clearSearch: () => void` - Clear search query and results

## Integration Examples

### Navbar Search (Current Implementation)
The navbar search uses custom styling with dropdown and mobile fullscreen modal.

### Simple Page Search
```vue
<template>
  <div class="page-search">
    <Search
      placeholder="Search entities..."
      @result-selected="handleSelect"
      @view-all-results="viewAll"
    />
  </div>
</template>
```

### Advanced Search with Filters
```vue
<template>
  <div class="advanced-search">
    <Search
      :min-characters="2"
      :debounce-ms="500"
      @result-selected="handleSelect"
    >
      <template #input="{ query, updateQuery, handleKeydown, handleFocus, inputRef }">
        <div class="search-with-filters">
          <select v-model="filterType">
            <option value="">All Types</option>
            <option value="character">Characters</option>
            <option value="corporation">Corporations</option>
          </select>
          <input
            ref="inputRef"
            :value="query"
            @input="updateQuery(($event.target as HTMLInputElement).value)"
            placeholder="Search..."
            @keydown="handleKeydown"
            @focus="handleFocus"
          />
        </div>
      </template>
    </Search>
  </div>
</template>
```
