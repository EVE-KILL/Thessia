export default defineEventHandler(async () => {
  return InvTypes.find(
    { published: true },
    {
      _id: 0,
      type_id: 1,
      name: 1,
      group_id: 1,
    },
  );
});
