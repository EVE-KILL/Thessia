import _ from "lodash";
import { processChunk } from "~/server/helpers/Affiliation";
import { cliLogger } from "~/server/helpers/Logger";
import { createQueue } from "~/server/helpers/Queue";
import { Characters } from "~/server/models/Characters";

export default {
    name: "generateSitemaps",
    description: "Generates sitemap data for the past 24 hours",
    schedule: "0 0 * * *",
    run: async () => {},
};
