export default defineEventHandler(async (event) => {
  const warId = event.context.params?.id;
  const war = await Wars.findOne({ war_id: warId }, { _id: 0 });
  return war;
});
