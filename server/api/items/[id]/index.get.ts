export default defineEventHandler(async (event) => {
  const typeId: number | null = event.context.params?.id
    ? Number.parseInt(event.context.params.id)
    : null;
  if (!typeId) {
    return { error: "Type ID not provided" };
  }

  return InvTypes.findOne(
    { type_id: typeId },
    {
      _id: 0,
      dogma_attributes: 0,
      dogma_effects: 0,
      createdAt: 0,
      updatedAt: 0,
    },
  );
});
