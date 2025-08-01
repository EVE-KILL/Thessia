import MeiliSearch, { EnqueuedTaskPromise } from "meilisearch";

/**
 * Search options for Meilisearch index
 */
export interface MeilisearchSearchOptions {
    limit?: number;
    offset?: number;
    lang?: string;
    filter?: string | string[];
}

export class Meilisearch {
    private static instance: Meilisearch;
    public client: typeof MeiliSearch.prototype;

    public constructor() {
        this.client = new MeiliSearch({
            host: process.env.MEILISEARCH_URI || "http://192.168.10.10:30006",
        });
    }

    public static getInstance(): Meilisearch {
        if (!Meilisearch.instance) {
            Meilisearch.instance = new Meilisearch();
        }
        return Meilisearch.instance;
    }

    public getClient(): typeof MeiliSearch.prototype {
        return this.client;
    }

    async existsIndex(indexName: string): Promise<boolean> {
        try {
            await this.client.index(indexName).getStats();
            return true;
        } catch (error) {
            return false;
        }
    }

    async createIndex(indexName: string, options: object): Promise<void> {
        if (options) {
            await this.client.createIndex(indexName, options);
        } else {
            await this.client.createIndex(indexName);
        }
    }

    // Removed setPrimaryKey since Meilisearch JS client does not support updating primary key after creation

    async deleteIndex(indexName: string): Promise<void> {
        await this.client.deleteIndex(indexName);
    }

    async replaceIndex(indexName: string, indexNameNew: string): Promise<void> {
        await this.client.swapIndexes([{ indexes: [indexName, indexNameNew] }]);
    }

    /**
     * Search Meilisearch index with optional language filtering
     *
     * @param indexName - The name of the index to search
     * @param query - The search query string
     * @param options - Search options including language preference
     * @returns Search results from Meilisearch
     */
    async search(
        indexName: string,
        query: string,
        options: MeilisearchSearchOptions = {}
    ): Promise<any> {
        const searchOptions: Record<string, any> = {
            limit: options.limit || 1000,
        };

        // Add offset if provided
        if (options.offset !== undefined) {
            searchOptions.offset = options.offset;
        }

        // Apply language filter if provided
        if (options.lang) {
            // Filter for either entities with the specified language OR entities with lang="all"
            searchOptions.filter = [`lang = ${options.lang} OR lang = all`];
        }

        // Apply additional filters if provided
        if (options.filter) {
            if (searchOptions.filter) {
                // Combine with existing language filter
                if (Array.isArray(options.filter)) {
                    searchOptions.filter.push(...options.filter);
                } else {
                    searchOptions.filter.push(options.filter);
                }
            } else {
                searchOptions.filter = Array.isArray(options.filter)
                    ? options.filter
                    : [options.filter];
            }
        }

        return await this.client.index(indexName).search(query, searchOptions);
    }

    async addDocuments(
        indexName: string,
        documents: any[]
    ): Promise<EnqueuedTaskPromise> {
        return await this.client.index(indexName).addDocuments(documents);
    }

    // Get a tasks status
    async getTaskStatus(taskUid: number): Promise<any> {
        return await this.client.tasks.getTask(taskUid);
    }

    async updateDocuments(
        indexName: string,
        documents: any[]
    ): Promise<EnqueuedTaskPromise> {
        return await this.client.index(indexName).updateDocuments(documents);
    }

    async deleteDocuments(
        indexName: string,
        documentIds: string[]
    ): Promise<EnqueuedTaskPromise> {
        return await this.client.index(indexName).deleteDocuments(documentIds);
    }

    async getDocument(indexName: string, documentId: string): Promise<any> {
        return await this.client.index(indexName).getDocument(documentId);
    }

    async updateRankingRules(
        indexName: string,
        rankingRules: string[]
    ): Promise<void> {
        await this.client.index(indexName).updateRankingRules(rankingRules);
    }

    /**
     * Configure filterable attributes for the index
     *
     * @param indexName - The name of the index to configure
     * @param attributes - Array of attribute names that should be filterable
     */
    async updateFilterableAttributes(
        indexName: string,
        attributes: string[]
    ): Promise<void> {
        await this.client
            .index(indexName)
            .updateFilterableAttributes(attributes);
    }
}
