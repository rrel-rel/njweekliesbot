const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userset')
        .setDescription('Set your osu! username')
        .addStringOption(option =>
			option
				.setName('username')
				.setDescription('osu! username')
				.setRequired(true)),
    async execute(interaction) {

        const discordUserId = interaction.user.id;
        const username = interaction.options.getString('username');
    
        try {
            // Perform an upsert operation
            await new Promise((resolve, reject) => {
                db.query('INSERT INTO player (username, discord_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?', [username, discordUserId, username], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
    
            // Since the upsert will either update or insert, we don't need to check if the user exists
            await interaction.reply('Your username has been successfully set!');
        } catch (error) {
            console.error('Error occurred while querying the db:', error);
            await interaction.reply({ content: 'There was an error with your request.', ephemeral: true });
        }
    }
}