import type { Client, Interaction } from "discord.js";

export interface InteractionHandler {
    (interaction: Interaction, client: Client): Promise<void>;
}
