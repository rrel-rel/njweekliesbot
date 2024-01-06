const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setmmr')
        .setDescription('Manually set user elo | ADMIN ONLY!!!!')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('osu! username of the target you want to update')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('newmmr')
                .setDescription('Desired elo value for target')
                .setRequired(true)),
    async execute(interaction) {

        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to use this command.');
        }

        const osuUsername = interaction.options.getString('username');
        const newMMR = interaction.options.getInteger('newmmr');

        try {
            await new Promise((resolve, reject) => {
                db.query('UPDATE player SET mmr = ? WHERE username = ?', [newMMR, osuUsername], (err, results) => {
                    if (err) {
                        console.error('Error updating MMR in the database:', err);
                        reject(err); // Use reject for error handling
                    } else {
                        resolve(results);
                    }
                });
            });
            await interaction.reply('MMR successfully updated!');
        } catch (error) {
            console.error('Error updating user mmr: ', error);
            await interaction.reply('An error occurred while updating user mmr');
        }
    }
};