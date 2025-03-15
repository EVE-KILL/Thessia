export default defineEventHandler(async () => {
  const dateCounts = await Killmails.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$kill_time" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result: { [key: string]: number } = {};
  for (const entry of dateCounts) {
    result[entry._id] = entry.count;
  }

  return result;
});
