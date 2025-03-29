import { ref, watch } from "vue";

export interface SearchHit {
  id: number;
  name: string;
  type: string;
}

export interface SearchResponse {
  hits: SearchHit[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  entityCounts?: Record<string, number>;
  entityOrder?: string[];
}

export function useSearch() {
  const query = ref("");
  const isLoading = ref(false);
  const results = ref<SearchResponse | null>(null);
  const error = ref<Error | null>(null);
  let debounceTimer: NodeJS.Timeout | null = null;

  // Get the i18n instance to access current locale
  const { locale } = useI18n();

  const search = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      results.value = null;
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const encodedSearchTerm = encodeURIComponent(searchTerm);

      // Include the current locale as a query parameter
      const { data: responseData, error: fetchError } = await useFetch<SearchResponse>(
        `/api/search/${encodedSearchTerm}`,
        {
          query: {
            lang: locale.value,
          },
        },
      );

      if (fetchError.value) {
        throw new Error(fetchError.value.message);
      }

      results.value = responseData.value as SearchResponse;
      return results.value;
    } catch (err) {
      console.debug("Error performing search:", err);
      error.value = err as Error;
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // Add a new function for auto-search with debouncing
  const setupAutoSearch = (minLength = 3, debounceMs = 300) => {
    watch(query, (newQuery) => {
      // Clear existing timer if any
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Reset results if query is too short
      if (!newQuery || newQuery.length < minLength) {
        results.value = null;
        return;
      }

      // Set debounce timer
      debounceTimer = setTimeout(() => {
        search(newQuery);
      }, debounceMs);
    });

    // Also watch for locale changes and re-search if we have an active query
    watch(locale, () => {
      if (query.value && query.value.length >= minLength) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        // Short delay before re-searching with new locale
        debounceTimer = setTimeout(() => {
          search(query.value);
        }, 100);
      }
    });
  };

  const navigateToSearch = (options?: { category?: string }) => {
    if (!query.value || query.value.trim().length === 0) return;

    // Include the category if provided
    const queryParams: Record<string, string> = { q: query.value };
    if (options?.category) {
      queryParams.category = options.category;
    }

    navigateTo({
      path: "/search",
      query: queryParams,
    });

    // Clear the query after navigation
    query.value = "";
  };

  const clearSearch = () => {
    query.value = "";
    results.value = null;
    error.value = null;
  };

  return {
    query,
    isLoading,
    results,
    error,
    search,
    navigateToSearch,
    clearSearch,
    setupAutoSearch,
    currentLocale: locale,
  };
}
