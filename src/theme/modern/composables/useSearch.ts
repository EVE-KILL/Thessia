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
}

export function useSearch() {
  const query = ref("");
  const isLoading = ref(false);
  const results = ref<SearchResponse | null>(null);
  const error = ref<Error | null>(null);
  let debounceTimer: NodeJS.Timeout | null = null;

  const search = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      results.value = null;
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const { data: responseData, error: fetchError } = await useFetch<SearchResponse>(
        `/api/search/${encodedSearchTerm}`,
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
  };

  const navigateToSearch = () => {
    if (!query.value || query.value.trim().length === 0) return;

    navigateTo({
      path: "/search",
      query: { q: query.value },
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
  };
}
