const { LegacyClient } = require('osu-web.js');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { apikey } = require('../../config.json');
const db = require('../../db.js');

const LegacyApi = new LegacyClient(apikey);

// Helper function to extract match ID from the provided osu! multiplayer link
function extractMatchIdFromLink(link) {
    const parts = link.split('/');
    const matchId = parts[parts.length - 1];
    return matchId;
}

// Helper function to calculate the median score for a game
function median(scores) {
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

// Function to calculate the match cost | TODO: update to use new MC formula
function calculateMatchCost(userScores, allGameScores) {
    
    let n_prime = userScores.length;
    
    let sumSiOverMi = 0;
    userScores.forEach(userScore => {
        // Find the scores for the game this user score is part of
        const gameScores = allGameScores.find(game => game.game_id === userScore.game_id).scores.map(score => score.score);
        const medianGameScore = median(gameScores);
        sumSiOverMi += userScore.score / medianGameScore;
    });
    let n = allGameScores.length;
    
    const numberOfScoresPerGame = allGameScores.map(game => game.scores.length);
    const m = median(numberOfScoresPerGame);

    const cost = (2 * sumSiOverMi) / (n_prime + 2) * Math.cbrt(n / m);

    return cost;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchcost')
        .setDescription('Calculate match cost of an osu! mp link')
        .addStringOption(option =>
            option.setName('mplink')
            .setDescription('osu! match link')
            .setRequired(true)),
    async execute(interaction) {
        try {
            const mplink = interaction.options.getString('mplink');
            const matchId = extractMatchIdFromLink(mplink);

            if (!isNaN(matchId)) {
                const multiLobby = await LegacyApi.getMultiplayerLobby({
                    mp: parseInt(matchId)
                });
    
                if (multiLobby && multiLobby.games) {
                    // Array to hold all scores for median calculation
                    const allScores = multiLobby.games.map(game => ({
                        game_id: game.game_id,
                        scores: game.scores
                    }));
    
                    // Object to hold user IDs and their scores
                    const userScores = {};
    
                    // Iterate through each game and collect scores for each user
                    multiLobby.games.forEach(game => {
                        game.scores.forEach(score => {
                            if (score.user_id) {
                                if (!userScores[score.user_id]) {
                                    userScores[score.user_id] = [];
                                }
                                // Store only the score for the user
                                userScores[score.user_id].push({
                                    score: score.score,
                                    game_id: game.game_id // Store the game_id to reference later
                                });
                            }
                        });
                    });
    
                    // Calculate match cost for each user
                    const userMatchCosts = Object.keys(userScores).map(userId => ({
                        userId: userId,
                        matchCost: calculateMatchCost(userScores[userId], allScores)
                    }));
    
                    // Response stuff | TODO replace with "user mmrs for _, _, _ have been updated!"
                    const response = userMatchCosts.map(user => `User ID ${user.userId}: Match Cost - ${user.matchCost.toFixed(2)}`).join('\n');
                    await interaction.reply(`Match Costs:\n${response}`);
                } else {
                    await interaction.reply(`No lobby found with match ID ${matchId}.`);
                }
            } else {
                await interaction.reply('The provided link does not contain a valid match ID.');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while processing the multiplayer lobby link.');
        }
    }
};