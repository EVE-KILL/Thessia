export interface IApiKey {
    name: string;
    key: string;
    description?: string;
    active: boolean;
    lastUsed?: Date;
    createdBy: Number;
    createdAt?: Date;
    updatedAt?: Date;
}
