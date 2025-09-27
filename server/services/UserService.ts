import type { UserRole } from "@prisma/client";
import prisma from "../../lib/prisma";

export class UserService {
    /**
     * Find user by unique identifier (for authentication)
     */
    static async findByUniqueIdentifier(uniqueIdentifier: string) {
        return await prisma.user.findUnique({
            where: { unique_identifier: uniqueIdentifier },
            select: {
                id: true,
                character_id: true,
                unique_identifier: true,
                role: true,
                character_name: true,
                character_owner_hash: true,
                scopes: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    /**
     * Find user by ID
     */
    static async findById(id: number) {
        return await prisma.user.findUnique({
            where: { id },
        });
    }

    /**
     * Find user by character_id
     */
    static async findByCharacterId(characterId: number) {
        return await prisma.user.findUnique({
            where: { character_id: characterId },
        });
    }

    /**
     * Check if user is administrator
     */
    static async isAdmin(uniqueIdentifier: string): Promise<boolean> {
        const user = await this.findByUniqueIdentifier(uniqueIdentifier);
        return user?.role === "admin" || false;
    }

    /**
     * Create or update user (for ESI authentication flows)
     */
    static async upsert(userData: {
        character_id: number;
        unique_identifier: string;
        character_name: string;
        character_owner_hash: string;
        scopes: string[];
        access_token: string;
        refresh_token: string;
        date_expiration: Date;
        token_type: string;
        role?: UserRole;
    }) {
        return await prisma.user.upsert({
            where: { character_id: userData.character_id },
            update: {
                unique_identifier: userData.unique_identifier,
                character_name: userData.character_name,
                character_owner_hash: userData.character_owner_hash,
                scopes: userData.scopes,
                access_token: userData.access_token,
                refresh_token: userData.refresh_token,
                date_expiration: userData.date_expiration,
                token_type: userData.token_type,
                role: userData.role || "user",
                updated_at: new Date(),
            },
            create: {
                character_id: userData.character_id,
                unique_identifier: userData.unique_identifier,
                character_name: userData.character_name,
                character_owner_hash: userData.character_owner_hash,
                scopes: userData.scopes,
                access_token: userData.access_token,
                refresh_token: userData.refresh_token,
                date_expiration: userData.date_expiration,
                token_type: userData.token_type,
                role: userData.role || "user",
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
    }

    /**
     * Get all administrators
     */
    static async getAdmins() {
        return await prisma.user.findMany({
            where: { role: "admin" },
            select: {
                id: true,
                character_id: true,
                character_name: true,
                created_at: true,
            },
        });
    }

    /**
     * Update user scopes
     */
    static async updateScopes(characterId: number, scopes: string[]) {
        return await prisma.user.update({
            where: { character_id: characterId },
            data: {
                scopes,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Check if user has specific role
     */
    static async hasRole(
        uniqueIdentifier: string,
        role: UserRole
    ): Promise<boolean> {
        const user = await this.findByUniqueIdentifier(uniqueIdentifier);
        return user?.role === role || false;
    }
}
