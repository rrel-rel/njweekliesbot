const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('teamautobalance')
        .setDescription('Autobalance teams from a list of usernames')
        .addStringOption(option =>
            option
                .setName('usernames')
                .setDescription('Comma-separated (dont add a space after) osu! usernames')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const usernames = interaction.options.getString('usernames').split(',');

            // Fetch MMRs for each player from the database
            const mmrs = await Promise.all(usernames.map(async (username) => {
                try {
                    const rows = await new Promise((resolve, reject) => {
                        db.query('SELECT mmr FROM player WHERE username = ?', [username], (err, results) => {
                            if (err) {
                                console.error('Error fetching MMR from database:', err);
                                reject(err);
                            } else {
                                resolve(results);
                            }
                        });
                    });

                    return rows[0]?.mmr || 0;
                } catch (error) {
                    console.error('Error fetching MMR from database:', error);
                    return 0;
                }
            }));

            // Sort players by MMR in descending order
            const sortedPlayers = usernames.map((username, index) => ({ username, mmr: mmrs[index] })).sort((a, b) => b.mmr - a.mmr);

            // Initialize team totals
            let team1Total = 0;
            let team2Total = 0;

            // Divide players into two teams
            const team1 = [];
            const team2 = [];

            // Assign players to teams while minimizing the MMR difference
            sortedPlayers.forEach((player, index) => {
                if (team1Total <= team2Total) {
                    team1.push(player);
                    team1Total += player.mmr;
                } else {
                    team2.push(player);
                    team2Total += player.mmr;
                }
            });

            // Log or return the balanced teams
            console.log('Balanced Teams:');
            console.log('Team 1:', team1);
            console.log('Team 2:', team2);

            // You can implement further actions like sending the balanced teams as a message in the Discord channel
            await interaction.reply('Balanced Teams:\nTeam 1: ' + team1.map(player => `${player.username} (${player.mmr} MMR)`).join(', ') + '\nTeam 2: ' + team2.map(player => `${player.username} (${player.mmr} MMR)`).join(', '));
        } catch (error) {
            console.error('Error in teamautobalance command:', error);
            await interaction.reply('An error occurred while autobalancing teams.');
        }
    }
};