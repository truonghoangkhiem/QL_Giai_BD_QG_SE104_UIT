import PlayerResult from "../../../../models/PlayerResult.js";
import Player from "../../../../models/Player.js";
import Season from "../../../../models/Season.js";
import Match from "../../../../models/Match.js";
import MatchLineup from "../../../../models/MatchLineup.js"; // Added
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerResultSchema,
  GetPlayerResultBySeasonIdAndDateSchema,
  PlayerIdSchema,
  MatchIdSchema as PlayerResultMatchIdSchema,
  UpdatePlayerResultSchema,
  PlayerResultIdSchema,
} from "../../../../schemas/playerResultSchema.js";
import mongoose from "mongoose";

export const updatePlayerResultsForDateInternal = async (playerId, teamIdForContext, seasonId, dateToUpdate, session = null) => {
  const Check_player_id = new mongoose.Types.ObjectId(playerId);
  const Check_team_id_context = new mongoose.Types.ObjectId(teamIdForContext); // Team context for this update
  const Check_season_id = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateToUpdate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const queryOptions = session ? { session } : {};

  const latestPlayerResultBeforeDate = await PlayerResult.findOne({
    player_id: Check_player_id,
    season_id: Check_season_id,
    team_id: Check_team_id_context, // Use the provided team context
    date: { $lt: targetDate },
  }, null, queryOptions).sort({ date: -1 });

  const baseResult = latestPlayerResultBeforeDate || {
    matchesplayed: 0, totalGoals: 0, assists: 0, yellowCards: 0, redCards: 0,
  };

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23,59,59,999);

  // Find matches on the targetDate where the player's team (teamIdForContext) played
  const matchesOnTargetDate = await Match.find({
    season_id: Check_season_id,
    date: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ team1: Check_team_id_context }, { team2: Check_team_id_context }],
    score: { $ne: null, $regex: /^\d+-\d+$/ } // Only scored matches
  }, '_id team1 team2 goalDetails', queryOptions).populate('goalDetails.player_id');


  let dailyMatchesPlayed = 0;
  let dailyGoals = 0;
  let dailyAssists = 0; // Placeholder, add logic if you track assists in Match model
  let dailyYellowCards = 0; // Placeholder
  let dailyRedCards = 0;  // Placeholder

  for (const m of matchesOnTargetDate) {
    // Check if the player was in the lineup for this specific match and team
    const lineup = await MatchLineup.findOne({
        match_id: m._id,
        team_id: Check_team_id_context, // Player must be in the lineup of their team context
        'players.player_id': Check_player_id
    }, null, queryOptions);

    if(lineup){ // Player participated if found in lineup
        dailyMatchesPlayed += 1;
        const playerGoalsInMatch = m.goalDetails.filter(
            (goal) => goal.player_id._id.equals(Check_player_id) && goal.goalType !== 'OG'
        ).length;
        dailyGoals += playerGoalsInMatch;
        // Add logic for assists, yellowCards, redCards if these are added to MatchLineup or GoalDetail
    }
  }

  const finalStats = {
    matchesplayed: (baseResult.matchesplayed || 0) + dailyMatchesPlayed,
    totalGoals: (baseResult.totalGoals || 0) + dailyGoals,
    assists: (baseResult.assists || 0) + dailyAssists,
    yellowCards: (baseResult.yellowCards || 0) + dailyYellowCards,
    redCards: (baseResult.redCards || 0) + dailyRedCards,
    date: targetDate,
    player_id: Check_player_id,
    team_id: Check_team_id_context, // Store with the team context of this calculation
    season_id: Check_season_id,
  };

  await PlayerResult.findOneAndUpdate(
    { player_id: Check_player_id, season_id: Check_season_id, team_id: Check_team_id_context, date: targetDate },
    { $set: finalStats },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );
  console.log(`PlayerResult for player ${playerId} (team ${teamIdForContext}) on ${targetDate.toISOString().split("T")[0]} updated/created. Matches Played Today: ${dailyMatchesPlayed}`);
};


const updatePlayerResultsafterMatch = async (req, res, next) => {
  const { matchid } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success: validMatchId, error: matchIdError } = PlayerResultMatchIdSchema.safeParse({ matchid });
    if (!validMatchId) {
      const validationError = new Error(matchIdError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const MatchID = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(MatchID)
        .session(session);
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      throw error;
    }

    if (match.score === null || !/^\d+-\d+$/.test(match.score)) {
        await session.abortTransaction();
        session.endSession();
        return successResponse(res, null, "Match has no valid score, player results not updated.");
    }

    if (!match.season_id) {
        const error = new Error("Match season_id is required");
        error.status = 400;
        throw error;
    }

    const { team1: team1Id, team2: team2Id, season_id, date: matchDate } = match;
    const normalizedMatchDate = new Date(matchDate);
    normalizedMatchDate.setUTCHours(0, 0, 0, 0);

    // Get lineups for the match
    const lineups = await MatchLineup.find({ match_id: MatchID }).populate('players.player_id').session(session);
    if (lineups.length === 0) {
        console.warn(`No lineups found for match ${MatchID}. Player results cannot be updated based on participation.`);
        await session.abortTransaction();
        session.endSession();
        return successResponse(res, null, "No lineups found for the match. Player results not updated.");
    }

    const allParticipatingPlayerIds = new Set();
    const playerTeamMap = new Map(); // Stores player_id -> team_id for this match context

    for (const lineup of lineups) {
        lineup.players.forEach(p => {
            allParticipatingPlayerIds.add(p.player_id._id.toString());
            playerTeamMap.set(p.player_id._id.toString(), lineup.team_id.toString());
        });
    }
    
    const uniquePlayerIds = Array.from(allParticipatingPlayerIds).map(id => new mongoose.Types.ObjectId(id));


    for (const playerId of uniquePlayerIds) {
      const playerTeamIdForMatch = playerTeamMap.get(playerId.toString());
      if (playerTeamIdForMatch) {
          await updatePlayerResultsForDateInternal(playerId, new mongoose.Types.ObjectId(playerTeamIdForMatch), season_id, normalizedMatchDate, session);
      }
    }

    const subsequentPlayerResultDates = await PlayerResult.find({
      player_id: { $in: uniquePlayerIds },
      season_id: new mongoose.Types.ObjectId(season_id),
      date: { $gt: normalizedMatchDate },
    }, null, { session }).distinct('date');


    const sortedSubsequentDates = subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of sortedSubsequentDates) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);

      for (const playerIdToRecalculate of uniquePlayerIds) {
        const playerTeamIdForContext = playerTeamMap.get(playerIdToRecalculate.toString()); // Team context from the original match
        if (playerTeamIdForContext) {
             const playerHasResultOnThisDate = await PlayerResult.findOne({
                player_id: playerIdToRecalculate,
                season_id: new mongoose.Types.ObjectId(season_id),
                team_id: new mongoose.Types.ObjectId(playerTeamIdForContext), // Check with correct team context
                date: dateToRecalculate
            }, null, { session });

            if(playerHasResultOnThisDate){
                 await updatePlayerResultsForDateInternal(playerIdToRecalculate, new mongoose.Types.ObjectId(playerTeamIdForContext), season_id, dateToRecalculate, session);
            }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Player results updated successfully based on match lineups, including subsequent dates.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updatePlayerResultsafterMatch:", error);
    return next(error);
  }
};

// Remaining functions (createPlayerResults, getPlayerResultbySeasonIdAndDate, etc.) are largely unchanged
// but their utility might diminish if PlayerResults are primarily managed via updatePlayerResultsafterMatch.
// createPlayerResults is still useful for initializing a player's record at the start of a season.

const createPlayerResults = async (req, res, next) => {
  const { player_id, season_id, team_id } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = CreatePlayerResultSchema.safeParse({
      player_id,
      season_id,
      team_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const PlayerID = new mongoose.Types.ObjectId(player_id);
    const TeamID = new mongoose.Types.ObjectId(team_id);
    const SeasonID = new mongoose.Types.ObjectId(season_id);

    const player = await Player.findOne({ _id: PlayerID, team_id: TeamID }).session(session);
    if (!player) {
      const error = new Error("Player not found for the given team");
      error.status = 404;
      throw error;
    }

    const season = await Season.findById(SeasonID).session(session);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      throw error;
    }

    const initialDate = new Date(season.start_date);
    initialDate.setUTCHours(0, 0, 0, 0);

    const checkExistForDate = await PlayerResult.findOne({
      player_id: PlayerID,
      season_id: SeasonID,
      team_id: TeamID,
      date: initialDate,
    }).session(session);

    if (checkExistForDate) {
      const error = new Error("Player result for this initial date and team already exists");
      error.status = 400;
      throw error;
    }

    const newPlayerResult = new PlayerResult({
      season_id: SeasonID,
      player_id: PlayerID,
      team_id: TeamID,
      matchesplayed: 0,
      totalGoals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      date: initialDate,
    });
    await newPlayerResult.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      newPlayerResult,
      "Created player result successfully",
      201
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};

const getPlayerResultbySeasonIdAndDate = async (req, res, next) => {
  const { seasonid, date } = req.params;
  try {
    const { success, error } = GetPlayerResultBySeasonIdAndDateSchema.safeParse(
      { seasonid, date }
    );
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);

    const playerResults = await PlayerResult.aggregate([
      {
        $match: {
          season_id: SeasonID,
          date: { $lte: queryDate },
        },
      },
      {
        $sort: { date: -1, totalGoals: -1 }, // Ensure correct latest result per player-team combo
      },
      {
        $group: {
          _id: { player_id: "$player_id", team_id: "$team_id" }, // Group by player and their team context
          latestResult: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestResult" },
      },
       {
        $lookup: {
          from: "players",
          localField: "player_id",
          foreignField: "_id",
          as: "playerInfo"
        }
      },
      { $unwind: { path: "$playerInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "teams",
          localField: "team_id", // team_id from PlayerResult
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
      {
          $project: {
              _id: 1,
              player_id: 1,
              team_id: 1,
              season_id: 1,
              matchesPlayed: "$matchesplayed",
              totalGoals: "$totalGoals",
              assists: 1,
              yellowCards: 1,
              redCards: 1,
              date: 1,
              playerName: { $ifNull: ["$playerInfo.name", "N/A"] },
              playerNumber: { $ifNull: ["$playerInfo.number", "N/A"] },
              teamName: { $ifNull: ["$teamInfo.team_name", "N/A"] } // team name from PlayerResult's team_id
          }
      }
    ]);

    if (!playerResults.length) {
       return successResponse(res, [], "No player results found for this season and date");
    }

    return successResponse(
      res,
      playerResults,
      "Latest player results retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getPlayerResultbySeasonIdAndDate:", error);
    return next(error);
  }
};

const getPlayerResultsById = async (req, res, next) => {
  const { playerid } = req.params;
  try {
    const { success, error } = PlayerIdSchema.safeParse({ playerid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_player_id = new mongoose.Types.ObjectId(playerid);
    // This might need refinement if a player can be in multiple teams in a season.
    // For now, it gets the absolute latest result for the player, regardless of team context.
    const playerResult = await PlayerResult.findOne({
      player_id: Check_player_id,
    }).sort({date: -1});

    if (!playerResult) {
      // Return empty or specific message instead of 404 if it's a valid scenario
      return successResponse(res, null, "Player result not found");
    }

    return successResponse(
      res,
      playerResult,
      "Latest player result found successfully"
    );
  } catch (error) {
    return next(error);
  }
};

const updatePlayerResults = async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success: idSuccess, error: idError } =
      PlayerResultIdSchema.safeParse({ id });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const { success: dataSuccess, error: dataError } = UpdatePlayerResultSchema.partial().safeParse(updateData);
    if (!dataSuccess) {
      const validationError = new Error(dataError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const playerResultToUpdate = await PlayerResult.findById(PlayerResultID).session(session);

    if(!playerResultToUpdate){
        const error = new Error("Player result not found to update");
        error.status = 404;
        throw error;
    }
    
    // Prevent manual update of date, player_id, team_id, season_id if not allowed
    const forbiddenUpdates = ['date', 'player_id', 'team_id', 'season_id'];
    for (const field of forbiddenUpdates) {
        if (updateData.hasOwnProperty(field) && updateData[field] !== playerResultToUpdate[field]?.toString()) {
            // Allow updating date if it's part of schema and explicitly sent
            if (field === 'date' && updateData.date) {
                 const newDate = new Date(updateData.date);
                 newDate.setUTCHours(0,0,0,0);
                 updateData.date = newDate; // Normalize
            } else if (field !== 'date') {
                throw Object.assign(new Error(`Manual update of '${field}' is not allowed.`), { status: 400 });
            }
        }
    }


    const result = await PlayerResult.updateOne(
      { _id: PlayerResultID },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      const error = new Error("Player result not found (no match for update)");
      error.status = 404;
      throw error;
    }

    const affectedPlayerId = playerResultToUpdate.player_id;
    const affectedTeamId = playerResultToUpdate.team_id;
    const affectedSeasonId = playerResultToUpdate.season_id;
    // Use the date from the updated record or the original if not changed
    const dateOfManuallyUpdatedResult = updateData.date ? new Date(updateData.date) : new Date(playerResultToUpdate.date);
    dateOfManuallyUpdatedResult.setUTCHours(0,0,0,0);


    const subsequentResultsToRecalculate = await PlayerResult.find({
        player_id: affectedPlayerId,
        season_id: affectedSeasonId,
        team_id: affectedTeamId, // Recalculate for the same team context
        date: { $gt: dateOfManuallyUpdatedResult }
    }, null, { session }).distinct('date');

    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));

    for(const dateStrToRecalc of sortedSubsequentDatesForPlayer){
        const dateToRecalc = new Date(dateStrToRecalc);
        dateToRecalc.setUTCHours(0,0,0,0);
        await updatePlayerResultsForDateInternal(affectedPlayerId, affectedTeamId, affectedSeasonId, dateToRecalc, session);
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, null, "Updated player result successfully and recalculated subsequent dates.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};

const deletePlayerResults = async (req, res, next) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = PlayerResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const playerResult = await PlayerResult.findById(PlayerResultID).session(session);
    if (!playerResult) {
      const error = new Error("Player result not found");
      error.status = 404;
      throw error;
    }

    const deletedDate = new Date(playerResult.date);
    deletedDate.setUTCHours(0,0,0,0);
    const affectedPlayerId = playerResult.player_id;
    const affectedTeamId = playerResult.team_id;
    const affectedSeasonId = playerResult.season_id;

    await PlayerResult.deleteOne({ _id: PlayerResultID }).session(session);

     const subsequentResultsToRecalculate = await PlayerResult.find({
        player_id: affectedPlayerId,
        season_id: affectedSeasonId,
        team_id: affectedTeamId,
        date: { $gte: deletedDate } // Start from the deleted date itself
    }, null, { session }).distinct('date');

    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));
    
    // Ensure the deletedDate is processed first if it's not already in subsequentResultsToRecalculate
    // or if it's the only date (i.e., subsequentResultsToRecalculate is empty after deletion of the last record)
    const datesToProcess = [...new Set([deletedDate.toISOString().split('T')[0], ...sortedSubsequentDatesForPlayer.map(d => new Date(d).toISOString().split('T')[0])])]
                            .map(dstr => new Date(dstr))
                            .sort((a,b) => a - b);


    for(const dateToRecalc of datesToProcess){
        await updatePlayerResultsForDateInternal(affectedPlayerId, affectedTeamId, affectedSeasonId, dateToRecalc, session);
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, null, "Player result deleted successfully and recalculated subsequent dates.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};


export {
  createPlayerResults,
  getPlayerResultbySeasonIdAndDate,
  getPlayerResultsById,
  updatePlayerResultsafterMatch,
  updatePlayerResults,
  deletePlayerResults,
};