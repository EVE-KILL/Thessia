import { Prices } from "../../models/Prices";
import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const pipeline = [
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
  ];

  const result = await Prices.aggregate(pipeline).exec();

  // Transform the result to the desired format
  const formattedResult = result.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return formattedResult;
});
