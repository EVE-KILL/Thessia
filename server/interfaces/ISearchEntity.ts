interface ISearchEntity {
  id: number;
  name: string;
  ticker?: string;
  type: "character" | "corporation" | "alliance" | "faction" | "system" | "region" | "item";
}
