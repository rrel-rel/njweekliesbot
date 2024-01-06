const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mmr')
        .setDescription('Check your MMR.'),
    async execute(interaction) {
        const discordUserId = interaction.user.id;

        db.query('SELECT MMR FROM Player WHERE discord_id = ?', [discordUserId], (err, results) => {
            if (err) {
                console.error('Error querying the database:', err);
                interaction.reply({ content: 'There was an error while checking your MMR.', ephemeral: true });
                return;
            }

            if (results.length === 0) {
                interaction.reply({ content: 'Your MMR is not set.', ephemeral: true });
            } else {
                const mmr = results[0].MMR;
                const embed = new EmbedBuilder()
                    .setTitle('Current MMR')
                    .setDescription(`Your MMR is: ${mmr}`)
                    .setColor(0x0099FF); // You can choose a different color

                interaction.reply({ embeds: [embed] });
            }
        });
    }
};