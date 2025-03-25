import { Meilisearch } from "~/server/helpers/Meilisearch";

export default defineEventHandler(async (event) => {
  let searchTerm = event.context.params?.searchTerm;
  // html decode the searchTerm
  searchTerm = decodeURIComponent(searchTerm);
  const meilisearch = new Meilisearch();
  const results = await meilisearch.search("nitro", searchTerm);
  results.hits = results.hits.map((hit) => {
    // Remove the rank field
    delete hit.rank;
    return hit;
  });

  return results;
});
