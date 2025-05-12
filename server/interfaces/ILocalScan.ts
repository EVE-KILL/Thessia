export interface IAllianceData {
    name: string;
    corporations: string[];
}

export interface ILocalScan {
    alliances: Record<number, IAllianceData>;
    corporations: Record<number, string>;
    hash: string;
    createdAt?: Date;
    updatedAt?: Date;
}
