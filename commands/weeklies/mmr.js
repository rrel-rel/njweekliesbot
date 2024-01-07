const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mmr')
        .setDescription('Check your MMR.')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('osu!')
                .setRequired(false)),
    async execute(interaction) {
        const discordUserId = interaction.user.id;
        const osuUsername = interaction.options.getString('username');
        if(!(interaction.options.getString('username'))) {
            try {
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
                            .setTitle('MMR')
                            .setDescription(`Your MMR is: ${mmr}`)
                            .setColor(0x0099FF);
                        interaction.reply({ embeds: [embed] });
                    }
                });
            } catch (error) {
                console.error('Error updating user mmr: ', error);
                await interaction.reply('An error occurred while updating user mmr');
            }
        } else {
            try {
                db.query('SELECT MMR FROM Player WHERE username = ?', [osuUsername], (err, results) => {
                    if (err) {
                        console.error('Error querying the database:', err);
                        interaction.reply({ content: `There was an error while checking ${osuUsername}'s MMR.`, ephemeral: true });
                        return;
                    }
        
                    if (results.length === 0) {
                        interaction.reply({ content: `${osuUsername}'s MMR is not set.`, ephemeral: true });
                    } else {
                        const mmr = results[0].MMR;
                        const embed = new EmbedBuilder()
                            .setTitle('MMR')
                            .setDescription(`${osuUsername}'s MMR is: ${mmr}`)
                            .setColor(0x0099FF);
                        interaction.reply({ embeds: [embed] });
                    }
                });
            } catch (error) {
                console.error('Error updating user mmr: ', error);
                await interaction.reply('An error occurred while updating user mmr');
            }
        }
    }
};