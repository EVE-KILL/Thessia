export interface IBloodline {
    bloodline_id: number;
    bloodline_name: string;
    race_id: number;
    description: string;
    male_description: string;
    female_description: string;
    ship_type_id: number;
    corporation_id: number;
    perception: number;
    willpower: number;
    charisma: number;
    memory: number;
    intelligence: number;
    icon_id: number;
    short_description: string;
    short_male_description: string;
    short_female_description: string;
    updatedAt?: Date;
    createdAt?: Date;
}
