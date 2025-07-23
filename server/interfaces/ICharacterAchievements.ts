// interfaces/ICharacterAchievements.ts

/**
 * Individual achievement progress for a character
 */
export interface ICharacterAchievement {
    achievement_id: string;
    name: string;
    description: string;
    type: 'pvp' | 'pve' | 'exploration' | 'industry' | 'special';
    points: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    category: string;
    threshold: number;
    current_count: number;
    is_completed: boolean;
    completed_at?: Date;
    last_updated: Date;
}

/**
 * Complete achievements document for a character
 */
export interface ICharacterAchievements {
    character_id: number;
    character_name?: string;
    total_points: number;
    completed_achievements: number;
    total_achievements: number;
    achievements: ICharacterAchievement[];
    last_calculated: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
