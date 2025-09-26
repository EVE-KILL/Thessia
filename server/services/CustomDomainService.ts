import type { CustomDomain } from "@prisma/client";
import prisma from "~/lib/prisma";

export class CustomDomainService {
    /**
     * Find a custom domain by domain name
     */
    static async findByDomain(domain: string): Promise<CustomDomain | null> {
        return await prisma.customDomain.findUnique({
            where: {
                domain: domain.toLowerCase(),
            },
        });
    }

    /**
     * Find a custom domain by ID
     */
    static async findById(id: number): Promise<CustomDomain | null> {
        return await prisma.customDomain.findUnique({
            where: {
                id,
            },
        });
    }

    /**
     * Create a new custom domain
     */
    static async create(data: {
        domain: string;
        character_id?: number;
        alliance_id?: number;
        corporation_id?: number;
        owner_character_id?: number;
        verified?: boolean;
        active?: boolean;
        ssl_enabled?: boolean;
        redirect_url?: string;
        entities?: any;
        navigation?: any;
        configuration?: any;
        dashboard_template?: any;
    }): Promise<CustomDomain> {
        return await prisma.customDomain.create({
            data: {
                ...data,
                domain: data.domain.toLowerCase(),
            },
        });
    }

    /**
     * Update a custom domain
     */
    static async update(
        id: number,
        data: Partial<{
            domain: string;
            character_id: number;
            alliance_id: number;
            corporation_id: number;
            verified: boolean;
            ssl_enabled: boolean;
            redirect_url: string;
        }>
    ): Promise<CustomDomain> {
        return await prisma.customDomain.update({
            where: { id },
            data: {
                ...data,
                domain: data.domain ? data.domain.toLowerCase() : undefined,
            },
        });
    }

    /**
     * Delete a custom domain
     */
    static async delete(id: number): Promise<CustomDomain> {
        return await prisma.customDomain.delete({
            where: { id },
        });
    }

    /**
     * Find all custom domains for a character
     */
    static async findByCharacter(characterId: number): Promise<CustomDomain[]> {
        return await prisma.customDomain.findMany({
            where: {
                character_id: characterId,
            },
        });
    }

    /**
     * Find all custom domains for an alliance
     */
    static async findByAlliance(allianceId: number): Promise<CustomDomain[]> {
        return await prisma.customDomain.findMany({
            where: {
                alliance_id: allianceId,
            },
        });
    }

    /**
     * Find all custom domains for a corporation
     */
    static async findByCorporation(
        corporationId: number
    ): Promise<CustomDomain[]> {
        return await prisma.customDomain.findMany({
            where: {
                corporation_id: corporationId,
            },
        });
    }

    /**
     * Verify a custom domain
     */
    static async verify(id: number): Promise<CustomDomain> {
        return await prisma.customDomain.update({
            where: { id },
            data: { verified: true },
        });
    }

    /**
     * Enable SSL for a custom domain
     */
    static async enableSSL(id: number): Promise<CustomDomain> {
        return await prisma.customDomain.update({
            where: { id },
            data: { ssl_enabled: true },
        });
    }

    /**
     * Get all verified domains
     */
    static async getVerifiedDomains(): Promise<CustomDomain[]> {
        return await prisma.customDomain.findMany({
            where: {
                verified: true,
            },
        });
    }

    /**
     * Find active and verified domain by name
     */
    static async findActiveDomain(
        domain: string
    ): Promise<CustomDomain | null> {
        return await prisma.customDomain.findFirst({
            where: {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
        });
    }

    /**
     * Find domains by owner character ID
     */
    static async findByOwnerCharacterId(
        ownerCharacterId: number
    ): Promise<CustomDomain[]> {
        return await prisma.customDomain.findMany({
            where: {
                owner_character_id: ownerCharacterId,
            },
            orderBy: {
                created_at: "desc",
            },
        });
    }

    /**
     * Update domain dashboard templates
     */
    static async updateDashboardTemplates(
        id: number,
        dashboardTemplates: any[]
    ): Promise<CustomDomain> {
        return await prisma.customDomain.update({
            where: { id },
            data: {
                dashboard_template: dashboardTemplates,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Count domains by owner character ID
     */
    static async countByOwnerCharacterId(ownerCharacterId: number): Promise<number> {
        return await prisma.customDomain.count({
            where: {
                owner_character_id: ownerCharacterId,
            },
        });
    }

    /**
     * Find domain by domain_id and owner character ID
     */
    static async findByDomainIdAndOwner(
        domainId: string,
        ownerCharacterId: number
    ): Promise<CustomDomain | null> {
        return await prisma.customDomain.findFirst({
            where: {
                // Note: domain_id field doesn't exist in current Prisma schema
                // This is a schema mismatch that needs to be resolved
                id: parseInt(domainId), // Using id as fallback
                owner_character_id: ownerCharacterId,
            },
        });
    }

    /**
     * Find active and verified domain by domain name
     */
    static async findByDomainActiveVerified(
        domain: string
    ): Promise<CustomDomain | null> {
        return await prisma.customDomain.findFirst({
            where: {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
        });
    }

    /**
     * Update dashboard template for a domain
     */
    static async updateDashboardTemplate(
        domain: string,
        templateData: any
    ): Promise<CustomDomain | null> {
        return await prisma.customDomain.updateMany({
            where: {
                domain: domain.toLowerCase(),
                active: true,
                verified: true,
            },
            data: {
                dashboard_template: templateData,
                updated_at: new Date(),
            },
        }).then(async (result: { count: number }) => {
            if (result.count > 0) {
                return await this.findByDomainActiveVerified(domain);
            }
            return null;
        });
    }
}
