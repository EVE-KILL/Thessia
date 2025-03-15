import type { ITranslation } from "./ITranslation";

export interface IInvGroup {
  name: ITranslation;
  group_id: number;
  type_ids: number[];
  category_id: number;
  group_name: ITranslation;
  icon_id: number;
  use_base_price: boolean;
  anchored: boolean;
  anchorable: boolean;
  fittable_non_singleton: number;
  published: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}
