const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

const USERS_PER_PAGE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display MMR leaderboard'),
    async execute(interaction) {
        try {
            // Fetch MMR data from the database
            const mmrData = await new Promise((resolve, reject) => {
                db.query('SELECT username, mmr FROM player ORDER BY mmr DESC', (err, results) => {
                    if (err) {
                        console.error('Error fetching MMR from the database:', err);
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });

            // Pagination logic
            const page = interaction.options.getInteger('page') || 1;
            const startIndex = (page - 1) * USERS_PER_PAGE;
            const endIndex = startIndex + USERS_PER_PAGE;
            const currentPageData = mmrData.slice(startIndex, endIndex);

            // Display leaderboard
            const leaderboardEmbed = {
                title: `MMR Leaderboard - Page ${page}`,
                fields: [],
            };

            currentPageData.forEach((user, index) => {
                const rank = startIndex + index + 1;
                leaderboardEmbed.fields.push({
                    name: `#${rank} ${user.username}`,
                    value: `MMR: ${user.mmr}`,
                });
            });

            await interaction.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
            console.error('Error displaying leaderboard:', error);
            await interaction.reply('An error occurred while displaying the leaderboard.');
        }
    },
};