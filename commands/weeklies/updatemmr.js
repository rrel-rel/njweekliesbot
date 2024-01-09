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

// Function to calculate the match cost | TODO: add ability to ignore x amount of maps
function calculateMatchCost(userScores, allGameScores, medianNumMapsPlayed) {
    
    let scorenum = 0;

    let playerNumMapsPlayed = userScores.length;
    let sumNiOverMi = 0; //sum of player score over median score

    userScores.forEach(userScore => {
        // Find the scores for the game this user score is part of
        const gameScores = allGameScores.find(game => game.game_id === userScore.game_id).scores.map(score => score.score);
        const medianGameScore = median(gameScores);
        scorenum++;
        sumNiOverMi += userScore.score / medianGameScore;
    });

    const cost = ((sumNiOverMi) / (playerNumMapsPlayed)) * Math.cbrt(playerNumMapsPlayed / medianNumMapsPlayed);

    return cost;
}

// Function to calculate new mmr for a user | TODO: check if match is win or loss, also check for user's current mmr
function updateMMR (matchcost, currmmr, isWin) {
    let rr = 0;
    if (isWin) {
        rr = Math.pow(1.7 * matchcost, 3.1) + 17 - (18 * (1 - matchcost));
    } else {
        rr = (Math.pow(1.7 * matchcost, 3.1) - 27 - (18 * (1 - matchcost))) * 0.93;
    }
    const mmr = currmmr + rr;
    //console.log(`RR =  ${rr} | MMR = ${mmr}`);
    return mmr;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('updatemmr')
        .setDescription('Calculate match cost of an osu! mp link')
        .addStringOption(option =>
            option.setName('mplink')
            .setDescription('osu! match link')
            .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to use this command.');
        }

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
                                    game_id: game.game_id, // Store the game_id to reference later
                                    team: score.team
                                });
                            }
                        });
                    });
    
                    const numMapsPlayedArray = [];
                    // Count number of times each player has played a map
                    for (const userId in userScores) {
                        const userScore = userScores[userId];
                        const numScores = userScore.length;
                        numMapsPlayedArray.push(numScores);
                    }

                    const medianNumMapsPlayed = median(numMapsPlayedArray);

                    // Calculate match cost for each user
                    const userMatchCosts = Object.keys(userScores).map(userId => ({
                        userId: userId,
                        matchCost: calculateMatchCost(userScores[userId], allScores, medianNumMapsPlayed),
                        team: userScores[userId][0]?.team
                    }));
                    
                    // Store all usernames of match participants
                    const osuUsernames = await Promise.all(userMatchCosts.map(async (user) => {
                        if (user.userId) {
                            const osuUsername = await LegacyApi.getUser({
                                u: String(user.userId)
                            });
                            return {
                                userId: user.userId,
                                matchCost: user.matchCost,
                                osuUsername: osuUsername?.username || 'Unknown',
                                team: user.team
                            };
                        } else {
                            return {
                                userId: null,
                                matchCost: user.matchCost,
                                osuUsername: 'Unknown',
                            };
                        }
                    }));

                    const teamScores = {
                        Blue: 0,
                        Red: 0
                    };
    
                    let blueWins = 0;
                    let redWins = 0;

                    multiLobby.games.forEach(game => {
                        if (game.scores) {
                            const blueScore = game.scores.find(score => score.team === 'Blue')?.score || 0;
                            const redScore = game.scores.find(score => score.team === 'Red')?.score || 0;
    
                            // Increment the total score for each team
                            teamScores.Blue += blueScore;
                            teamScores.Red += redScore;
    
                            // Check the winner of each game
                            if (blueScore > redScore) {
                                blueWins++;
                            } else if (redScore > blueScore) {
                                redWins++;
                            }
                        }
                    });
                    
                    const winningTeam = blueWins > redWins ? 'Blue' : 'Red';

                    //console.log(winningTeam);

                    // Log the results and update mmr
                    osuUsernames.forEach(async (result) => {
                        let resultwin = Boolean(result.team === winningTeam); // check if user won 
                        
                        try {
                            
                            const rows = await new Promise((resolve, reject) => {
                                db.query('SELECT mmr FROM player WHERE username = ?', [result.osuUsername], (err, results) => {
                                    if (err) {
                                        console.error('Error fetching MMR from database:', err);
                                        reject(err);
                                    } else {
                                        resolve(results);
                                    }
                                });
                            });
                    
                            const currmmr = rows[0]?.mmr;
                            const updatedMMR = updateMMR(result.matchCost, currmmr, resultwin);

                            //logging some information before trying to implement database updates
                            
                            //console.log(`User ID ${result.userId}: ${result.osuUsername}, Match Cost - ${result.matchCost}, Team - ${result.team}, Win? - ${resultwin}, updatedMMR - ${updatedMMR}`);

                            try {
                                const updateResult = await new Promise((resolve, reject) => {
                                    db.query('UPDATE player SET mmr = ? WHERE username = ?', [updatedMMR, result.osuUsername], (err, results) => {
                                        if (err) {
                                            console.error('Error updating MMR in the database:', err);
                                            reject(err);
                                        } else {
                                            resolve(results);
                                        }
                                    });
                                });
                    
                                // Log success or handle the updateResult as needed
                                //console.log('MMR updated in the database:', updateResult);
                            } catch (error) {
                                console.error('Error updating MMR in the database:', error);
                            }
                            // console.log(`INSERT INTO player (mmr) VALUES ${updatedMMR} WHERE username = ${result.osuUsername}`);
                            // db.query(`INSERT INTO player (mmr) VALUES ${updatedMMR} WHERE username = ${result.osuUsername}`);
                        } catch (error) {
                            console.error('Error fetching MMR from database:', error);
                        }
                        
                    });

                    await interaction.reply('Match costs and usernames retrieved successfully.');
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