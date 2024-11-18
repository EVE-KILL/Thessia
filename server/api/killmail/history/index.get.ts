export default defineEventHandler(async () => {
  const dates = await Killmails.aggregate([
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$kill_time" } } } },
    { $sort: { _id: 1 } },
  ]);

  return dates.map((date) => date._id);
});
