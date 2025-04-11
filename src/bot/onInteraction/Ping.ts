export const command = {
    name: 'ping',
    description: 'Replies with Pong!'
};

export default async function Ping(interaction, client) {
    if (interaction.commandName === command.name) {
        await interaction.reply({
            content: 'Pong!',
            flags: 64
        });
    }
}
