import { Schema, type SchemaDefinition, type SchemaOptions, model, type Model } from "mongoose";

interface DefineModel<T> {
  name: string;
  schema: SchemaDefinition<T>;
  options?: SchemaOptions;
  hooks?: (schema: Schema<T>) => void;
}

interface DefinedModel<T> extends Model<T> {}

export const defineModel = <T>({
  name,
  schema,
  options,
  hooks,
}: DefineModel<T>): DefinedModel<T> => {
  const newSchema: Schema<T> = options
    ? new Schema<T>(schema, options as any)
    : new Schema<T>(schema);

  if (hooks) hooks(newSchema);

  return model<T, DefinedModel<T>>(name, newSchema);
};
