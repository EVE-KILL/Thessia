export interface IDScan {
    ships: Record<string, number>;
    hash: string;
    createdAt?: Date;
    updatedAt?: Date;
}
