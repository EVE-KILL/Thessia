import type { ITranslation } from "./ITranslation";

export interface IInvType {
  type_id: number;
  group_id: number;
  category_id: number;
  name: ITranslation;
  description: ITranslation;
  mass: number;
  volume: number;
  capacity: number;
  portion_size: number;
  packaged_volume: number;
  radius: number;
  race_id: number;
  faction_id: number;
  base_price: number;
  published: boolean;
  market_group_id: number;
  icon_id: number;
  sound_id: number;
  graphic_id: number;
  // Removed duplicate sound_id field
  masteries: Record<number, number[]>;
  meta_group_id: number;
  sof_faction_name: string;
  updatedAt?: Date;
  createdAt?: Date;
  // New fields based on sample data:
  traits: {
    misc_bonuses: Record<string, any>; // adjust type as needed
    role_bonuses: Record<
      string,
      {
        bonus: number;
        bonus_text: Translation;
        importance: number;
        unit_id: number;
      }
    >;
    types: Record<
      string,
      Record<
        string,
        {
          bonus: number;
          bonus_text: Translation;
          importance: number;
          unit_id: number;
        }
      >
    >;
  };
  dogma_attributes: Record<string, { attribute_id: number; value: number }>;
  dogma_effects: Record<string, { effect_id: number; is_default: boolean }>;
  type_materials: Record<string, { material_type_id: number; quantity: number }>;
  required_skills: Record<string, number>;
  type_variations: Record<string, number[]>;
  produced_by_blueprints: Record<string, { blueprint_type_id: number; blueprint_activity: string }>;
  used_in_blueprints: Record<
    string,
    { manufacturing: { material_type_id: number; activity: string; quantity: number } }
  >;
  engineering_rig_source_type_ids: number[];
  variation_parent_type_id: number; // new field added to support sample data
}
