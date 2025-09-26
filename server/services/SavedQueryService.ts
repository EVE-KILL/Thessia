import prisma from "../../lib/prisma";
import type { SavedQuery } from "@prisma/client";

export class SavedQueryService {
    /**
     * Find saved query by query_id (hash)
     */
    static async findByQueryId(queryId: string): Promise<SavedQuery | null> {
        return await prisma.savedQuery.findUnique({
            where: { query_id: queryId },
        });
    }

    /**
     * Create new saved query
     */
    static async create(data: {
        query_id: string;
        name: string;
        description?: string;
        query_data: any;
        user_id?: number;
        character_id?: number;
        public?: boolean;
    }): Promise<SavedQuery> {
        return await prisma.savedQuery.create({
            data: {
                query_id: data.query_id,
                name: data.name,
                description: data.description || "",
                query_data: data.query_data,
                user_id: data.user_id,
                character_id: data.character_id,
                public: data.public || false,
            },
        });
    }

    /**
     * Update existing saved query
     */
    static async update(
        queryId: string,
        data: {
            name?: string;
            description?: string;
            query_data?: any;
        }
    ): Promise<SavedQuery> {
        return await prisma.savedQuery.update({
            where: { query_id: queryId },
            data,
        });
    }

    /**
     * Get total count of saved queries
     */
    static async getTotalCount(): Promise<number> {
        return await prisma.savedQuery.count();
    }
}