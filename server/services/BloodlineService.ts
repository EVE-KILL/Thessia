import prisma from "../../lib/prisma";
import type { Bloodline } from "@prisma/client";

export class BloodlineService {
    /**
     * Find bloodline by bloodline_id
     */
    static async findById(bloodlineId: number): Promise<Bloodline | null> {
        return await prisma.bloodline.findUnique({
            where: { bloodline_id: bloodlineId },
        });
    }

    /**
     * Find all bloodlines
     */
    static async findAll(): Promise<Bloodline[]> {
        return await prisma.bloodline.findMany({
            orderBy: { bloodline_name: "asc" },
        });
    }

    /**
     * Find bloodlines by race
     */
    static async findByRaceId(raceId: number): Promise<Bloodline[]> {
        return await prisma.bloodline.findMany({
            where: { race_id: raceId },
            orderBy: { bloodline_name: "asc" },
        });
    }
}