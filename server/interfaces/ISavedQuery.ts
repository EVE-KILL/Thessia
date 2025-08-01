export interface ISavedQuery {
    hash: string;
    title: string;
    description?: string;
    query: object;
    createdAt?: Date;
}
