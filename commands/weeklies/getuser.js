const { LegacyClient } = require('osu-web.js');
const { SlashCommandBuilder } = require('discord.js');
const { apikey } = require('../../config.json');
const db = require('../../db.js');

const LegacyApi = new LegacyClient(apikey);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getosuid')
        .setDescription('for testing purposes'),
        //.addStringOption(option =>
			//option
				//.setName('username')
				//.setDescription('osu! username')
				//.setRequired(true)),
    async execute(interaction) {
        const discordUserId = interaction.user.id;
        
        try {
            // Wrap the db.query in a Promise to use async/await
            const results = await new Promise((resolve, reject) => {
                db.query('SELECT username FROM player WHERE discord_id = ?', [discordUserId], (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(results);
                });
            });

            if (results.length > 0) {
                const username = results[0].username;

                // Ensure username is not null before making the API call
                if (username) {
                    const osuUser = await LegacyApi.getUser({
                        u: String(username)
                    });

                    interaction.reply(`Your osu! user ID is ${osuUser.user_id}.`);
                } else {
                    interaction.reply('Username is null.');
                }
            } else {
                interaction.reply({ content: 'Your username was not found in the database.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error querying the database or fetching user from osu! API:', error);
            interaction.reply({ content: 'There was an error while processing your request.', ephemeral: true });
        }
    }

}