import { EmbedBuilder } from 'discord.js'; // Use MessageEmbed if you're using an older version of discord.js
import { promises as fs } from 'fs';
import path from 'path';

export const command = {
    name: 'about',
    description: 'Emits the bot version and other information'
};

export default async function About(interaction, client) {
    if (interaction.commandName === 'about') {
        // Get version from package.json
        const packageJsonPath = path.resolve('package.json');
        const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
        const { version } = JSON.parse(packageJson);
        // Create an invite link for the bot, not the guild
        // Give it permission to send messages and embed links
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274881563713&scope=bot`;

        // Create an embed message
        const embed = new EmbedBuilder()
            .setTitle('Bot Information')
            .setDescription('Sara is a Discord bot that aims to be a helpful assistant for your server.')
            .addFields(
                { name: 'Version', value: version, inline: false },
                { name: 'Developer', value: '@lilllamah', inline: false },
                { name: 'Source Code', value: '[GitHub](https://github.com/EVE-KILL/Sara)', inline: false },
                { name: 'Invite Link', value: `[Invite me to your server](${inviteLink})`, inline: false }
            )
            .setColor(0x00AE86) // Set a color for the embed
            .setTimestamp(); // Adds a timestamp to the embed

        // Send the embed as a reply
        await interaction.reply({
            embeds: [embed],
            flags: 64
        });
    }
}
