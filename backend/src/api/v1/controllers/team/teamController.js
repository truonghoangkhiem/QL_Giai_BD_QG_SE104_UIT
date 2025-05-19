import Team from "../../../../models/Team.js";
import Season from "../../../../models/Season.js";
import Player from "../../../../models/Player.js";
import Match from "../../../../models/Match.js";
import TeamResult from "../../../../models/TeamResult.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdSchema,
  NameTeamSchema,
} from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// --- Other functions (getTeams, getTeamsByID, createTeam, updateTeam, getTeamsByIDSeason, getTeamsByNameAndSeasonId) remain the same ---
// Add them here if you need the full file content

// Lấy tất cả đội bóng
const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().populate("season_id"); // Populating season_id
    return successResponse(res, teams, "Fetched teams successfully");
  } catch (error) {
    return next(error);
  }
};

const getTeamsByNameAndSeasonId = async (req, res, next) => {
  const season_id = req.params.season_id;
  const team_name = req.params.team_name;

  try {
    // Xác thực tên đội
    const { success, error } = NameTeamSchema.safeParse({ team_name });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    // Kiểm tra định dạng của season_id
    if (!mongoose.Types.ObjectId.isValid(season_id)) {
      const validationError = new Error("Invalid season_id format");
      validationError.status = 400;
      return next(validationError);
    }

    const seasonId = new mongoose.Types.ObjectId(season_id);

    // Xác thực season_id thông qua schema
    const { success: idSuccess, error: idError } = SeasonIdSchema.safeParse({
      id: season_id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team = await Team.findOne({ team_name, season_id: seasonId }); // Changed variable name to team
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, team, "Fetched team successfully"); // Changed variable name to team
  } catch (error) {
    return next(error);
  }
};

// Lấy đội bóng theo ID
const getTeamsByID = async (req, res, next) => {
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team_id = new mongoose.Types.ObjectId(req.params.id);
    const team = await Team.findById(team_id).populate("season_id"); // Populating season_id
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, team, "Team found successfully");
  } catch (error) {
    return next(error);
  }
};

// Thêm đội bóng
const createTeam = async (req, res, next) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = CreateTeamSchema.safeParse({
      season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const season = await Season.findById(Check_season_id);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    const existingTeam = await Team.findOne({
      team_name,
      season_id: Check_season_id,
    });
    if (existingTeam) {
      const error = new Error("Team name already exists in this season");
      error.status = 400;
      return next(error);
    }

    const newTeam = new Team({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    const result = await newTeam.save();

     // Automatically create TeamResult and Ranking for the new team
    const currentDate = new Date(season.start_date);
    currentDate.setUTCHours(0, 0, 0, 0);

    const newTeamResult = new TeamResult({
      team_id: result._id,
      season_id: Check_season_id,
      date: currentDate, // Initialize with season start date
      // Default stats are handled by the model
    });
    const savedTeamResult = await newTeamResult.save();

    const newRanking = new Ranking({
        team_result_id: savedTeamResult._id,
        season_id: Check_season_id,
        rank: 0, // Will be updated later
        date: currentDate,
    });
    await newRanking.save();


    return successResponse(
      res,
      { id: result._id },
      "Created team, initial result, and ranking successfully",
      201
    );
  } catch (error) {
    return next(error);
  }
};

// Sửa đội bóng
const updateTeam = async (req, res, next) => {
  const { team_name, stadium, coach, logo } = req.body;
  try {
    const { success: idSuccess, error: idError } = TeamIdSchema.safeParse({
      id: req.params.id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const { success, error } = UpdateTeamSchema.safeParse({
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const existingTeam = await Team.findById(teamId);
    if (!existingTeam) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    const updatedTeamData = {}; // Changed variable name
    if (team_name) updatedTeamData.team_name = team_name;
    if (stadium) updatedTeamData.stadium = stadium;
    if (coach) updatedTeamData.coach = coach;
    if (logo) updatedTeamData.logo = logo;

    if (team_name && team_name !== existingTeam.team_name) { // Check if name changed
      const checkExist = await Team.findOne({
        team_name,
        season_id: existingTeam.season_id,
        _id: { $ne: teamId },
      });
      if (checkExist) {
        const error = new Error("Team name already exists in this season");
        error.status = 400;
        return next(error);
      }
    }
    
    if (Object.keys(updatedTeamData).length === 0) {
        return successResponse(res, existingTeam, "No changes made to the team");
    }


    const result = await Team.findByIdAndUpdate(teamId, { $set: updatedTeamData }, { new: true }); // Added {new: true}
    if (!result) { // Should not happen if existingTeam was found
        const error = new Error("Team not found during update");
        error.status = 404;
        return next(error);
    }


    return successResponse(res, result, "Team updated successfully");
  } catch (error) {
    return next(error);
  }
};


const recalculateSeasonData = async (season_id, excluded_team_id = null) => {
    console.log(`Recalculating data for season ${season_id}, excluding team ${excluded_team_id}`);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const seasonId = new mongoose.Types.ObjectId(season_id);

        // 0. Get Ranking Rules for the season
        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(session);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw new Error("Ranking Regulation not found or rules not defined for the season.");
        }
        const { winPoints = 3, drawPoints = 1, losePoints = 0, rankingCriteria = ['points', 'goalsDifference', 'goalsFor'] } = rankingRegulation.rules;


        // 1. Get all matches for the season, excluding those involving the deleted team (if any)
        const matchesQuery = { season_id: seasonId };
        if (excluded_team_id) {
            const excludedTeamObjectId = new mongoose.Types.ObjectId(excluded_team_id);
            matchesQuery.$nor = [
                { team1: excludedTeamObjectId },
                { team2: excludedTeamObjectId }
            ];
        }
        const relevantMatches = await Match.find(matchesQuery).populate('team1 team2 goalDetails.player_id').session(session);

        // 2. Get all active teams in the season (excluding the deleted one if applicable)
        const teamsQuery = { season_id: seasonId };
        if (excluded_team_id) {
            teamsQuery._id = { $ne: new mongoose.Types.ObjectId(excluded_team_id) };
        }
        const activeTeams = await Team.find(teamsQuery).session(session);
        const activeTeamIds = activeTeams.map(t => t._id.toString());

        // 3. Clear existing TeamResults and Rankings for the season (for active teams)
        await TeamResult.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds.map(id => new mongoose.Types.ObjectId(id)) } }).session(session);
        await Ranking.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds.map(id => new mongoose.Types.ObjectId(id)) } }).session(session); // Assuming Ranking has team_id

        // 4. Iterate through dates and recalculate TeamResults
        const season = await Season.findById(seasonId).session(session);
        if (!season) throw new Error("Season not found for recalculation.");

        const allMatchDates = [...new Set(relevantMatches
            .filter(m => m.date && m.score && /^\d+-\d+$/.test(m.score)) // Only consider matches with valid scores
            .map(m => new Date(m.date).toISOString().split('T')[0]))]
            .sort((a, b) => new Date(a) - new Date(b));

        const initialDate = new Date(season.start_date);
        initialDate.setUTCHours(0,0,0,0);

        const datesToProcess = [...new Set([initialDate.toISOString().split('T')[0], ...allMatchDates])].sort();


        for (const team of activeTeams) {
            let cumulativeResult = {
                team_id: team._id,
                season_id: seasonId,
                matchplayed: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalsDifference: 0,
                points: 0,
                goalsForAway: 0,
                headToHeadPoints: new Map(),
                date: initialDate,
            };
            await TeamResult.create([cumulativeResult], { session });

            for (const dateStr of datesToProcess) {
                 if (dateStr === initialDate.toISOString().split('T')[0] && cumulativeResult.date.toISOString().split('T')[0] === dateStr) {
                    // Already created initial result for this team, skip to avoid duplicate key if no matches on start_date
                    continue;
                }

                const currentDate = new Date(dateStr);
                currentDate.setUTCHours(0,0,0,0);

                const matchesOnThisDateForTeam = relevantMatches.filter(m => {
                    const matchDateOnly = new Date(m.date).toISOString().split('T')[0];
                    return matchDateOnly === dateStr &&
                           m.score && /^\d+-\d+$/.test(m.score) &&
                           (m.team1._id.equals(team._id) || m.team2._id.equals(team._id));
                });

                let dailyWins = 0, dailyDraws = 0, dailyLosses = 0;
                let dailyGoalsFor = 0, dailyGoalsAgainst = 0, dailyGoalsForAway = 0;

                for (const match of matchesOnThisDateForTeam) {
                    const [s1, s2] = match.score.split('-').map(Number);
                    let teamScore, opponentScore, opponentId, isHome;

                    if (match.team1._id.equals(team._id)) {
                        teamScore = s1; opponentScore = s2; opponentId = match.team2._id.toString(); isHome = true;
                    } else {
                        teamScore = s2; opponentScore = s1; opponentId = match.team1._id.toString(); isHome = false;
                    }

                    dailyGoalsFor += teamScore;
                    dailyGoalsAgainst += opponentScore;
                    if (!isHome) dailyGoalsForAway += teamScore;

                    let h2hPointsForMatch = 0;
                    if (teamScore > opponentScore) { dailyWins++; h2hPointsForMatch = winPoints; }
                    else if (teamScore < opponentScore) { dailyLosses++; h2hPointsForMatch = losePoints; }
                    else { dailyDraws++; h2hPointsForMatch = drawPoints; }
                    
                    const currentH2HOpponent = cumulativeResult.headToHeadPoints.get(opponentId) || 0;
                    cumulativeResult.headToHeadPoints.set(opponentId, currentH2HOpponent + h2hPointsForMatch);
                }

                if (matchesOnThisDateForTeam.length > 0 || dateStr === initialDate.toISOString().split('T')[0]) {
                     cumulativeResult = {
                        ...cumulativeResult, // Carry over previous stats
                        date: currentDate,
                        matchplayed: cumulativeResult.matchplayed + matchesOnThisDateForTeam.length,
                        wins: cumulativeResult.wins + dailyWins,
                        draws: cumulativeResult.draws + dailyDraws,
                        losses: cumulativeResult.losses + dailyLosses,
                        goalsFor: cumulativeResult.goalsFor + dailyGoalsFor,
                        goalsAgainst: cumulativeResult.goalsAgainst + dailyGoalsAgainst,
                        goalsDifference: (cumulativeResult.goalsFor + dailyGoalsFor) - (cumulativeResult.goalsAgainst + dailyGoalsAgainst),
                        points: cumulativeResult.points + (dailyWins * winPoints) + (dailyDraws * drawPoints) + (dailyLosses * losePoints),
                        goalsForAway: cumulativeResult.goalsForAway + dailyGoalsForAway,
                        // headToHeadPoints is already updated in the loop
                    };
                     await TeamResult.create([cumulativeResult], { session });
                }
            }
        }


        // 5. Recalculate Rankings for each processed date
        for (const dateStr of datesToProcess) {
            const currentDate = new Date(dateStr);
            currentDate.setUTCHours(0,0,0,0);

            const teamResultsForDate = await TeamResult.find({ season_id: seasonId, date: currentDate, team_id: { $in: activeTeamIds.map(id => new mongoose.Types.ObjectId(id)) } }).session(session);
            
            if (teamResultsForDate.length > 0) {
                const sortedTeamResults = [...teamResultsForDate].sort((a, b) => {
                    for (const field of rankingCriteria) {
                        if (field === 'headToHeadPoints') { // Special handling for head-to-head
                             const pointsA = (a.headToHeadPoints && typeof a.headToHeadPoints.get === 'function' && a.headToHeadPoints.get(b.team_id.toString())) || 0;
                             const pointsB = (b.headToHeadPoints && typeof b.headToHeadPoints.get === 'function' && b.headToHeadPoints.get(a.team_id.toString())) || 0;
                            if (pointsA !== pointsB) return pointsB - pointsA;
                        } else if (a[field] !== b[field]) {
                            return b[field] - a[field]; // Default: higher is better
                        }
                    }
                    return 0;
                });

                const rankingUpdates = sortedTeamResults.map((tr, index) => ({
                    updateOne: {
                        filter: { team_result_id: tr._id, season_id: seasonId, date: currentDate },
                        update: { $set: { rank: index + 1, team_id: tr.team_id } }, // ensure team_id is set if using for filtering Rankings
                        upsert: true
                    }
                }));
                if (rankingUpdates.length > 0) {
                    await Ranking.bulkWrite(rankingUpdates, { session });
                }
            }
        }

        // Recalculate PlayerResults and PlayerRankings
        // This part needs careful implementation similar to TeamResults and Rankings
        // For brevity, a high-level approach:
        // 1. Delete existing PlayerResults and PlayerRankings for the season (for active players).
        // 2. Iterate through players of activeTeams.
        // 3. For each player, iterate through `datesToProcess`.
        // 4. Calculate their stats (goals, matchesPlayed etc.) up to `currentDate` from `relevantMatches`.
        // 5. Create/Update PlayerResult for that player and date.
        // 6. After processing all PlayerResults for a date, calculate PlayerRankings for that date (e.g., top scorers).

        const allPlayersInSeason = await Player.find({ team_id: { $in: activeTeamIds.map(id => new mongoose.Types.ObjectId(id)) } }).session(session);
        await PlayerResult.deleteMany({ season_id: seasonId, player_id: { $in: allPlayersInSeason.map(p => p._id) } }).session(session);
        await PlayerRanking.deleteMany({ season_id: seasonId, player_id: { $in: allPlayersInSeason.map(p => p._id) } }).session(session);

        for (const player of allPlayersInSeason) {
            let cumulativePlayerStats = {
                player_id: player._id,
                season_id: seasonId,
                team_id: player.team_id,
                matchesplayed: 0,
                totalGoals: 0,
                assists: 0, // Assuming assists are tracked elsewhere or default to 0
                yellowCards: 0, // Assuming cards are tracked elsewhere or default to 0
                redCards: 0,    // Assuming cards are tracked elsewhere or default to 0
                date: initialDate
            };
            await PlayerResult.create([cumulativePlayerStats], { session });


            for (const dateStr of datesToProcess) {
                if (dateStr === initialDate.toISOString().split('T')[0] && cumulativePlayerStats.date.toISOString().split('T')[0] === dateStr) {
                    continue;
                }
                const currentDate = new Date(dateStr);
                currentDate.setUTCHours(0,0,0,0);

                const matchesOnThisDateForPlayer = relevantMatches.filter(m => {
                    const matchDateOnly = new Date(m.date).toISOString().split('T')[0];
                    return matchDateOnly === dateStr &&
                           m.score && /^\d+-\d+$/.test(m.score) &&
                           (m.team1._id.equals(player.team_id) || m.team2._id.equals(player.team_id));
                });

                let dailyGoals = 0;
                let playedThisDay = false;

                for (const match of matchesOnThisDateForPlayer) {
                    playedThisDay = true;
                    match.goalDetails.forEach(goal => {
                        if (goal.player_id._id.equals(player._id) && goal.goalType !== 'OG') { // Assuming 'OG' for Own Goal
                            dailyGoals++;
                        }
                    });
                }
                
                if (playedThisDay || dateStr === initialDate.toISOString().split('T')[0]) {
                     cumulativePlayerStats = {
                        ...cumulativePlayerStats,
                        date: currentDate,
                        matchesplayed: cumulativePlayerStats.matchesplayed + (playedThisDay ? 1 : 0),
                        totalGoals: cumulativePlayerStats.totalGoals + dailyGoals,
                        // Update other stats like assists, cards if available
                    };
                    await PlayerResult.create([cumulativePlayerStats], {session} );
                }
            }
        }
        
        // After all player results are updated for all dates, then update PlayerRankings
        for (const dateStr of datesToProcess) {
            const currentDate = new Date(dateStr);
            currentDate.setUTCHours(0,0,0,0);

            const playerResultsForRankingDate = await PlayerResult.find({
                season_id: seasonId,
                date: currentDate,
                player_id: { $in: allPlayersInSeason.map(p => p._id) }
            }).session(session);

            if (playerResultsForRankingDate.length > 0) {
                const sortedPlayerResults = [...playerResultsForRankingDate].sort((a, b) => {
                    if (b.totalGoals !== a.totalGoals) {
                        return b.totalGoals - a.totalGoals;
                    }
                    // Add secondary sort criteria if needed, e.g., fewer matches played
                    return a.matchesplayed - b.matchesplayed;
                });

                const playerRankingUpdates = sortedPlayerResults.map((pr, index) => ({
                    updateOne: {
                        filter: { player_results_id: pr._id, season_id: seasonId, date: currentDate },
                        update: { $set: { rank: index + 1, player_id: pr.player_id } },
                        upsert: true
                    }
                }));
                 if (playerRankingUpdates.length > 0) {
                    await PlayerRanking.bulkWrite(playerRankingUpdates, { session });
                }
            }
        }


        await session.commitTransaction();
        console.log(`Recalculation for season ${season_id} completed successfully.`);
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error during season data recalculation for season ${season_id}:`, error);
        throw error; // Re-throw to be caught by the calling function
    } finally {
        session.endSession();
    }
};


// Xóa đội bóng
const deleteTeam = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError; // Throw to be caught by outer catch and abort transaction
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const teamToDelete = await Team.findById(teamId).session(session);
    if (!teamToDelete) {
      const error = new Error("Team not found");
      error.status = 404;
      throw error;
    }

    const seasonId = teamToDelete.season_id;

    // 1. Delete Players of the team and their PlayerResults/PlayerRankings
    const playersToDelete = await Player.find({ team_id: teamId }).session(session);
    const playerIdsToDelete = playersToDelete.map(p => p._id);

    if (playerIdsToDelete.length > 0) {
      await PlayerResult.deleteMany({ player_id: { $in: playerIdsToDelete } }).session(session);
      await PlayerRanking.deleteMany({ player_id: { $in: playerIdsToDelete } }).session(session); // Or by player_result_id if linked
      await Player.deleteMany({ team_id: teamId }).session(session);
    }

    // 2. Delete Matches involving the team
    await Match.deleteMany({ $or: [{ team1: teamId }, { team2: teamId }] }).session(session);

    // 3. Delete TeamResult for this team
    await TeamResult.deleteMany({ team_id: teamId, season_id: seasonId }).session(session);

    // 4. Delete Ranking for this team
    await Ranking.deleteMany({ team_id: teamId, season_id: seasonId }).session(session); // Assuming Ranking has team_id

    // 5. Delete the Team itself
    await Team.deleteOne({ _id: teamId }).session(session);

    // 6. Recalculate data for the season, excluding the deleted team
    // This function needs to be robust and handle its own transactions or be part of this one.
    // For simplicity here, we call it after the main deletions.
    // This call should ideally happen outside the transaction or be designed to work with an existing session.
    // However, for atomicity of the whole operation, it's better to include it if possible,
    // or ensure it's idempotent and can be re-run.
    // For this example, we'll call it after committing the main deletions.
    // BUT, it's safer to do it within the same transaction if the recalculation modifies data
    // that should be rolled back if team deletion fails.
    // The recalculateSeasonData function is now designed to run within a session.
    await recalculateSeasonData(seasonId.toString(), teamId.toString()); // Pass teamId to exclude it


    await session.commitTransaction();
    return successResponse(res, null, "Deleted team and recalculated season data successfully", 200); // Changed to 200 as 204 doesn't send body

  } catch (error) {
    await session.abortTransaction();
    console.error("Error in deleteTeam:", error); // Log the full error
    return next(error);
  } finally {
    session.endSession();
  }
};

// Lấy đội bóng theo season_id
const getTeamsByIDSeason = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const season_id = new mongoose.Types.ObjectId(req.params.season_id);
    const season = await Season.findById(season_id);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    const teams = await Team.find({ season_id }).populate("season_id"); // Populating season_id
    if (teams.length === 0) {
      // Return empty array with success if no teams, instead of 404
      return successResponse(res, [], "No teams found for this season");
    }
    return successResponse(
      res,
      teams,
      "Fetched teams successfully for this season"
    );
  } catch (error) {
    console.error("Error in getTeamsByIDSeason:", error);
    return next(error);
  }
};

export {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
  getTeamsByNameAndSeasonId,
  recalculateSeasonData, // Export for potential use elsewhere if needed
};