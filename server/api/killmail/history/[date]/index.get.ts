export default defineEventHandler(async (event) => {
  const dateInput = event.context.params?.date as string;
  const startDate = new Date(dateInput);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const killmails = await Killmails.find({
    kill_time: {
      $gte: startDate,
      $lt: endDate,
    },
  });

  return killmails.map((killmail) => killmail.killmail_id);
});
