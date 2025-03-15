import MeiliSearch from "meilisearch";

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
      console.error(`Index ${indexName} does not exist: ${error}`);
      return false;
    }
  }

  async createIndex(indexName: string): Promise<void> {
    await this.client.createIndex(indexName);
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.client.deleteIndex(indexName);
  }

  async replaceIndex(indexName: string, indexNameNew: string): Promise<void> {
    await this.client.swapIndexes([{ indexes: [indexName, indexNameNew] }]);
  }

  async search(indexName: string, query: string): Promise<any> {
    return await this.client.index(indexName).search(query);
  }

  async addDocuments(indexName: string, documents: any[]): Promise<void> {
    await this.client.index(indexName).addDocuments(documents);
  }

  async updateDocuments(indexName: string, documents: any[]): Promise<void> {
    await this.client.index(indexName).updateDocuments(documents);
  }

  async deleteDocuments(indexName: string, documentIds: string[]): Promise<void> {
    await this.client.index(indexName).deleteDocuments(documentIds);
  }

  async getDocument(indexName: string, documentId: string): Promise<any> {
    return await this.client.index(indexName).getDocument(documentId);
  }

  async updateRankingRules(indexName: string, rankingRules: string[]): Promise<void> {
    await this.client.index(indexName).updateRankingRules(rankingRules);
  }
}
