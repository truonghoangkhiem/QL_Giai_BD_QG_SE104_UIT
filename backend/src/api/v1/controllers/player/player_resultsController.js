import PlayerResult from "../../../../models/PlayerResult.js";
import Player from "../../../../models/Player.js";
import Season from "../../../../models/Season.js";
import Match from "../../../../models/Match.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerResultSchema,
  GetPlayerResultBySeasonIdAndDateSchema,
  PlayerIdSchema,
  MatchIdSchema,
  UpdatePlayerResultSchema,
  PlayerResultIdSchema,
} from "../../../../schemas/playerResultSchema.js";
import mongoose from "mongoose";

const updatePlayerResultsForDateInternal = async (playerId, teamId, seasonId, dateToUpdate) => {
  const Check_player_id = new mongoose.Types.ObjectId(playerId);
  const Check_team_id = new mongoose.Types.ObjectId(teamId);
  const Check_season_id = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateToUpdate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const latestPlayerResultBeforeDate = await PlayerResult.findOne({
    player_id: Check_player_id,
    season_id: Check_season_id,
    date: { $lt: targetDate },
  }).sort({ date: -1 });

  const baseResult = latestPlayerResultBeforeDate || {
    matchesplayed: 0, totalGoals: 0, assists: 0, yellowCards: 0, redCards: 0,
  };

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23,59,59,999);

  // Chỉ lấy các trận đã có tỉ số hợp lệ để tính toán
  const matchesOnTargetDate = await Match.find({
    season_id: Check_season_id,
    date: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ team1: Check_team_id }, { team2: Check_team_id }],
    score: { $ne: null, $regex: /^\d+-\d+$/ } // Chỉ lấy trận có score hợp lệ
  }).populate('goalDetails.player_id');


  let dailyMatchesPlayed = 0;
  let dailyGoals = 0;
  
  const playerInMatch = (match, playerIdToCheck, teamIdOfPlayer) => {
    return match.team1.equals(teamIdOfPlayer) || match.team2.equals(teamIdOfPlayer);
  }

  for (const m of matchesOnTargetDate) {
    // Trận đấu này đã được lọc là có score hợp lệ
    if(playerInMatch(m, Check_player_id, Check_team_id)){
        dailyMatchesPlayed += 1; // Tính là tham gia nếu cầu thủ thuộc một trong hai đội của trận đấu đã có tỉ số
        const playerGoalsInMatch = m.goalDetails.filter(
            (goal) => goal.player_id.equals(Check_player_id) && goal.goalType !== 'OG'
        ).length;
        dailyGoals += playerGoalsInMatch;
    }
  }

  const finalStats = {
    matchesplayed: baseResult.matchesplayed + dailyMatchesPlayed,
    totalGoals: baseResult.totalGoals + dailyGoals,
    assists: baseResult.assists, 
    yellowCards: baseResult.yellowCards, 
    redCards: baseResult.redCards, 
    date: targetDate,
    player_id: Check_player_id,
    team_id: Check_team_id,
    season_id: Check_season_id,
  };
  
  await PlayerResult.findOneAndUpdate(
    { player_id: Check_player_id, season_id: Check_season_id, date: targetDate },
    { $set: finalStats },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const updatePlayerResultsafterMatch = async (req, res, next) => {
  const { matchid } = req.params;
  try {
    const { success: validMatchId, error: matchIdError } = MatchIdSchema.safeParse({ matchid });
    if (!validMatchId) {
      const validationError = new Error(matchIdError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const MatchID = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(MatchID);
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error);
    }

    // Nếu trận đấu chưa có tỉ số (score is null hoặc không hợp lệ), không cập nhật PlayerResult
    if (match.score === null || !/^\d+-\d+$/.test(match.score)) {
        return successResponse(res, null, "Match has no valid score, player results not updated.");
    }

    if (!match.season_id) {
        const error = new Error("Match season_id is required");
        error.status = 400;
        return next(error);
    }

    const { team1: team1Id, team2: team2Id, season_id, date: matchDate } = match;
    const normalizedMatchDate = new Date(matchDate);
    normalizedMatchDate.setUTCHours(0, 0, 0, 0);

    const playersTeam1 = await Player.find({ team_id: team1Id });
    const playersTeam2 = await Player.find({ team_id: team2Id });
    // Chỉ những cầu thủ trong đội hình của trận đấu đó mới được cập nhật
    const allPlayersInMatch = [...playersTeam1, ...playersTeam2]; 

    const allAffectedPlayerIds = [];

    for (const player of allPlayersInMatch) {
      await updatePlayerResultsForDateInternal(player._id, player.team_id, season_id, normalizedMatchDate);
      allAffectedPlayerIds.push(player._id);
    }
    
    const subsequentPlayerResultDates = await PlayerResult.find({
      player_id: { $in: allAffectedPlayerIds },
      season_id: season_id,
      date: { $gt: normalizedMatchDate },
    }).distinct('date');

    const sortedSubsequentDates = subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of sortedSubsequentDates) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);

      for (const playerIdToRecalculate of allAffectedPlayerIds) {
        const playerDoc = allPlayersInMatch.find(p => p._id.equals(playerIdToRecalculate));
        if (playerDoc) {
            const playerHasResultOnThisDate = await PlayerResult.findOne({
                player_id: playerIdToRecalculate,
                season_id: season_id,
                date: dateToRecalculate // đã chuẩn hóa
            });
            if(playerHasResultOnThisDate){
                 await updatePlayerResultsForDateInternal(playerIdToRecalculate, playerDoc.team_id, season_id, dateToRecalculate);
            }
        }
      }
    }

    return successResponse(res, null, "Player results updated successfully, including subsequent dates.");
  } catch (error) {
    console.error("Error in updatePlayerResultsafterMatch:", error);
    return next(error);
  }
};

const createPlayerResults = async (req, res, next) => {
  const { player_id, season_id, team_id } = req.body;
  try {
    const { success, error } = CreatePlayerResultSchema.safeParse({
      player_id,
      season_id,
      team_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerID = new mongoose.Types.ObjectId(player_id);
    const TeamID = new mongoose.Types.ObjectId(team_id);
    const SeasonID = new mongoose.Types.ObjectId(season_id);

    const player = await Player.findOne({ _id: PlayerID, team_id: TeamID });
    if (!player) {
      const error = new Error("Player not found for the given team");
      error.status = 404;
      return next(error);
    }

    const season = await Season.findById(SeasonID);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    const initialDate = new Date(season.start_date); // Khởi tạo với ngày bắt đầu mùa giải
    initialDate.setUTCHours(0, 0, 0, 0);

    const checkExistForDate = await PlayerResult.findOne({
      player_id: PlayerID,
      season_id: SeasonID,
      date: initialDate,
    });

    if (checkExistForDate) {
      const error = new Error("Player result for this initial date already exists");
      error.status = 400;
      return next(error);
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
    await newPlayerResult.save();

    return successResponse(
      res,
      null,
      "Created player result successfully",
      201
    );
  } catch (error) {
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
          _id: "$player_id",
          latestResult: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestResult" },
      },
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
  } = req.body; // Bỏ season_id, player_id, team_id, date khỏi đây
  try {
    const { success: idSuccess, error: idError } =
      PlayerResultIdSchema.safeParse({ id });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    // Chỉ validate các trường được phép cập nhật thủ công
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
      return next(validationError);
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const playerResultToUpdate = await PlayerResult.findById(PlayerResultID);

    if(!playerResultToUpdate){
        const error = new Error("Player result not found to update");
        error.status = 404;
        return next(error);
    }

    const updatePlayerResultData = {};
    if (matchesplayed !== undefined)
      updatePlayerResultData.matchesplayed = matchesplayed;
    if (totalGoals !== undefined) updatePlayerResultData.totalGoals = totalGoals;
    if (assists !== undefined) updatePlayerResultData.assists = assists;
    if (yellowCards !== undefined) updatePlayerResultData.yellowCards = yellowCards;
    if (redCards !== undefined) updatePlayerResultData.redCards = redCards;
    
    const result = await PlayerResult.updateOne(
      { _id: PlayerResultID },
      { $set: updatePlayerResultData }
    );

    if (result.matchedCount === 0) {
      const error = new Error("Player result not found (no match for update)");
      error.status = 404;
      return next(error);
    }
   
    // Cần tính toán lại cho các ngày sau ngày của playerResultToUpdate.date
    const affectedPlayerId = playerResultToUpdate.player_id;
    const affectedTeamId = playerResultToUpdate.team_id;
    const affectedSeasonId = playerResultToUpdate.season_id;
    const dateOfManuallyUpdatedResult = new Date(playerResultToUpdate.date);
    dateOfManuallyUpdatedResult.setUTCHours(0,0,0,0);

    const subsequentResultsToRecalculate = await PlayerResult.find({
        player_id: affectedPlayerId,
        season_id: affectedSeasonId,
        date: { $gt: dateOfManuallyUpdatedResult }
    }).distinct('date');

    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));

    for(const dateStrToRecalc of sortedSubsequentDatesForPlayer){
        const dateToRecalc = new Date(dateStrToRecalc);
        dateToRecalc.setUTCHours(0,0,0,0);
        await updatePlayerResultsForDateInternal(affectedPlayerId, affectedTeamId, affectedSeasonId, dateToRecalc);
    }


    return successResponse(res, null, "Updated player result successfully and recalculated subsequent dates.");
  } catch (error) {
    return next(error);
  }
};

const deletePlayerResults = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = PlayerResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const playerResult = await PlayerResult.findById(PlayerResultID);
    if (!playerResult) {
      const error = new Error("Player result not found");
      error.status = 404;
      return next(error);
    }
    
    const deletedDate = new Date(playerResult.date);
    deletedDate.setUTCHours(0,0,0,0);
    const affectedPlayerId = playerResult.player_id;
    const affectedTeamId = playerResult.team_id;
    const affectedSeasonId = playerResult.season_id;

    await PlayerResult.deleteOne({ _id: PlayerResultID });

    // Tính toán lại các ngày sau ngày đã xóa
     const subsequentResultsToRecalculate = await PlayerResult.find({
        player_id: affectedPlayerId,
        season_id: affectedSeasonId,
        date: { $gte: deletedDate } // Bắt đầu từ ngày xóa (nếu có các bản ghi khác trong cùng ngày) hoặc các ngày sau đó
    }).distinct('date');
    
    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));

    for(const dateStrToRecalc of sortedSubsequentDatesForPlayer){
        const dateToRecalc = new Date(dateStrToRecalc);
        dateToRecalc.setUTCHours(0,0,0,0);
        await updatePlayerResultsForDateInternal(affectedPlayerId, affectedTeamId, affectedSeasonId, dateToRecalc);
    }


    return successResponse(res, null, "Player result deleted successfully and recalculated subsequent dates.");
  } catch (error) {
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