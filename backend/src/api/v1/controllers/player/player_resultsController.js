import PlayerResult from "../../../../models/PlayerResult.js";
import Player from "../../../../models/Player.js";
import Season from "../../../../models/Season.js";
import Match from "../../../../models/Match.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerResultSchema,
  GetPlayerResultBySeasonIdAndDateSchema,
  PlayerIdSchema,
  MatchIdSchema as PlayerResultMatchIdSchema, // Alias
  UpdatePlayerResultSchema,
  PlayerResultIdSchema,
} from "../../../../schemas/playerResultSchema.js";
import mongoose from "mongoose";

export const updatePlayerResultsForDateInternal = async (playerId, teamId, seasonId, dateToUpdate, session = null) => {
  const Check_player_id = new mongoose.Types.ObjectId(playerId);
  const Check_team_id = new mongoose.Types.ObjectId(teamId);
  const Check_season_id = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateToUpdate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const queryOptions = session ? { session } : {};

  const latestPlayerResultBeforeDate = await PlayerResult.findOne({
    player_id: Check_player_id,
    season_id: Check_season_id,
    team_id: Check_team_id,
    date: { $lt: targetDate },
  }, null, queryOptions).sort({ date: -1 });

  const baseResult = latestPlayerResultBeforeDate || {
    matchesplayed: 0, totalGoals: 0, assists: 0, yellowCards: 0, redCards: 0,
  };

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23,59,59,999);

  const matchesOnTargetDate = await Match.find({
    season_id: Check_season_id,
    date: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ team1: Check_team_id }, { team2: Check_team_id }],
    score: { $ne: null, $regex: /^\d+-\d+$/ }
  }, null, queryOptions).populate('goalDetails.player_id participatingPlayersTeam1 participatingPlayersTeam2');


  let dailyMatchesPlayed = 0;
  let dailyGoals = 0;
  let dailyAssists = 0;
  let dailyYellowCards = 0;
  let dailyRedCards = 0;

  for (const m of matchesOnTargetDate) {
    let playerParticipated = false;
    if (m.team1.equals(Check_team_id)) {
      playerParticipated = m.participatingPlayersTeam1?.some(pId => pId.equals(Check_player_id));
    } else if (m.team2.equals(Check_team_id)) {
      playerParticipated = m.participatingPlayersTeam2?.some(pId => pId.equals(Check_player_id));
    }

    if(playerParticipated){
        dailyMatchesPlayed += 1;
        const playerGoalsInMatch = m.goalDetails.filter(
            (goal) => goal.player_id.equals(Check_player_id) && goal.goalType !== 'OG'
        ).length;
        dailyGoals += playerGoalsInMatch;
        // Add logic for assists, yellowCards, redCards if available in match details
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
    team_id: Check_team_id,
    season_id: Check_season_id,
  };

  await PlayerResult.findOneAndUpdate(
    { player_id: Check_player_id, season_id: Check_season_id, team_id: Check_team_id, date: targetDate },
    { $set: finalStats },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );
  console.log(`PlayerResult for player ${playerId} on ${targetDate.toISOString().split("T")[0]} updated/created. Matches Played Today: ${dailyMatchesPlayed}`);
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
        .populate('participatingPlayersTeam1 participatingPlayersTeam2') // Populate participating players
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

    // Get all players who *actually participated* in the match based on the new fields
    const participatingPlayerIdsTeam1 = match.participatingPlayersTeam1.map(p => p._id);
    const participatingPlayerIdsTeam2 = match.participatingPlayersTeam2.map(p => p._id);
    const allParticipatingPlayerIds = [...participatingPlayerIdsTeam1, ...participatingPlayerIdsTeam2];

    // Fetch player documents for team context
    const playersInMatch = await Player.find({ _id: { $in: allParticipatingPlayerIds } }).session(session);


    for (const player of playersInMatch) {
      // Determine which team the player belongs to for this match's context
      let playerTeamIdInMatchContext = null;
      if (participatingPlayerIdsTeam1.some(pId => pId.equals(player._id))) {
          playerTeamIdInMatchContext = team1Id;
      } else if (participatingPlayerIdsTeam2.some(pId => pId.equals(player._id))) {
          playerTeamIdInMatchContext = team2Id;
      }

      if (playerTeamIdInMatchContext) {
          await updatePlayerResultsForDateInternal(player._id, playerTeamIdInMatchContext, season_id, normalizedMatchDate, session);
      } else {
          console.warn(`Could not determine team context for player ${player._id} in match ${match._id}`);
      }
    }

    const subsequentPlayerResultDates = await PlayerResult.find({
      player_id: { $in: allParticipatingPlayerIds.map(id => new mongoose.Types.ObjectId(id)) },
      season_id: new mongoose.Types.ObjectId(season_id),
      date: { $gt: normalizedMatchDate },
    }, null, { session }).distinct('date');


    const sortedSubsequentDates = subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of sortedSubsequentDates) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);

      for (const playerIdToRecalculate of allParticipatingPlayerIds) {
        const playerDoc = playersInMatch.find(p => p._id.equals(playerIdToRecalculate));
        if (playerDoc) {
            const playerHasResultOnThisDate = await PlayerResult.findOne({
                player_id: new mongoose.Types.ObjectId(playerIdToRecalculate),
                season_id: new mongoose.Types.ObjectId(season_id),
                date: dateToRecalculate
            }, null, { session });

            if(playerHasResultOnThisDate){
                 // Determine player's team for the context of this date/match.
                 // This logic might need refinement if players can switch teams mid-season and we are recalculating for old matches.
                 // For now, assume current team_id from playerDoc is sufficient for subsequent date recalculations.
                 await updatePlayerResultsForDateInternal(playerIdToRecalculate, playerDoc.team_id, season_id, dateToRecalculate, session);
            }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Player results updated successfully based on participating players, including subsequent dates.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updatePlayerResultsafterMatch:", error);
    return next(error);
  }
};

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
        $sort: { date: -1, totalGoals: -1 },
      },
      {
        $group: {
          _id: { player_id: "$player_id", team_id: "$team_id" },
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
          localField: "team_id",
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
              teamName: { $ifNull: ["$teamInfo.team_name", "N/A"] }
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
    const playerResult = await PlayerResult.findOne({
      player_id: Check_player_id,
    }).sort({date: -1});

    if (!playerResult) {
      const error = new Error("Player result not found");
      error.status = 404;
      return next(error);
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
  const {
    matchesplayed,
    totalGoals,
    assists,
    yellowCards,
    redCards,
  } = req.body;
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

    const { success, error } = UpdatePlayerResultSchema.partial().safeParse({
      matchesplayed,
      totalGoals,
      assists,
      yellowCards,
      redCards,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
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

    const updatePlayerResultData = {};
    if (matchesplayed !== undefined) updatePlayerResultData.matchesplayed = matchesplayed;
    if (totalGoals !== undefined) updatePlayerResultData.totalGoals = totalGoals;
    if (assists !== undefined) updatePlayerResultData.assists = assists;
    if (yellowCards !== undefined) updatePlayerResultData.yellowCards = yellowCards;
    if (redCards !== undefined) updatePlayerResultData.redCards = redCards;

    const result = await PlayerResult.updateOne(
      { _id: PlayerResultID },
      { $set: updatePlayerResultData },
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
    const dateOfManuallyUpdatedResult = new Date(playerResultToUpdate.date);
    dateOfManuallyUpdatedResult.setUTCHours(0,0,0,0);

    const subsequentResultsToRecalculate = await PlayerResult.find({
        player_id: affectedPlayerId,
        season_id: affectedSeasonId,
        team_id: affectedTeamId,
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
        date: { $gte: deletedDate }
    }, null, { session }).distinct('date');

    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));

    // If the deleted date itself is present, it should be the first to recalculate (to potentially reset to previous day's stats)
    if (!sortedSubsequentDatesForPlayer.some(d => new Date(d).getTime() === deletedDate.getTime())) {
        // Check if there was any match for this player on the deleted date
        const matchesOnDeletedDate = await Match.find({
            season_id: affectedSeasonId,
            date: { $gte: deletedDate, $lt: new Date(deletedDate.getTime() + 24 * 60 * 60 * 1000) },
            $or: [{ team1: affectedTeamId, participatingPlayersTeam1: affectedPlayerId }, { team2: affectedTeamId, participatingPlayersTeam2: affectedPlayerId }],
            score: { $ne: null, $regex: /^\d+-\d+$/ }
        }, null, {session});

        if (matchesOnDeletedDate.length === 0) { // Only recalculate for this date if no matches were played by this player
            await updatePlayerResultsForDateInternal(affectedPlayerId, affectedTeamId, affectedSeasonId, deletedDate, session);
        }
    }


    for(const dateStrToRecalc of sortedSubsequentDatesForPlayer){
        const dateToRecalc = new Date(dateStrToRecalc);
        dateToRecalc.setUTCHours(0,0,0,0);
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