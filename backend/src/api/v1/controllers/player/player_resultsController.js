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
    season_id: Check_season_id, // Đảm bảo cùng mùa giải
    team_id: Check_team_id,     // Đảm bảo cùng đội (nếu cầu thủ có thể chuyển đội giữa mùa)
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
  }, null, queryOptions).populate('goalDetails.player_id');


  let dailyMatchesPlayed = 0;
  let dailyGoals = 0;
  let dailyAssists = 0; // Giả sử chưa có logic tính assists
  let dailyYellowCards = 0; // Giả sử chưa có logic tính thẻ
  let dailyRedCards = 0;   // Giả sử chưa có logic tính thẻ
  
  // Hàm kiểm tra xem cầu thủ có trong đội hình của trận đấu không
  // (cần một cách để xác định điều này, ví dụ: dựa vào danh sách đăng ký trận đấu hoặc cầu thủ có ghi bàn/thẻ)
  // Hiện tại, chúng ta sẽ coi như cầu thủ có tham gia nếu đội của họ thi đấu và trận đấu có kết quả
  const playerInMatch = (match, playerIdToCheck, teamIdOfPlayer) => {
      // Logic này cần được cải thiện nếu có thông tin đội hình cụ thể cho từng trận.
      // Hiện tại, chỉ cần đội của cầu thủ tham gia là tính.
    return match.team1.equals(teamIdOfPlayer) || match.team2.equals(teamIdOfPlayer);
  }


  for (const m of matchesOnTargetDate) {
    if(playerInMatch(m, Check_player_id, Check_team_id)){
        dailyMatchesPlayed += 1; 
        const playerGoalsInMatch = m.goalDetails.filter(
            (goal) => goal.player_id.equals(Check_player_id) && goal.goalType !== 'OG' // Không tính phản lưới nhà cho cầu thủ
        ).length;
        dailyGoals += playerGoalsInMatch;
        // Thêm logic cho assists, yellowCards, redCards nếu có
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
    { upsert: true, new: true, setDefaultsOnInsert: true, session } // Thêm session
  );
  console.log(`PlayerResult for player ${playerId} on ${targetDate.toISOString().split("T")[0]} updated/created.`);
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
    const match = await Match.findById(MatchID).session(session);
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

    const playersTeam1 = await Player.find({ team_id: team1Id }).session(session);
    const playersTeam2 = await Player.find({ team_id: team2Id }).session(session);
    const allPlayersInMatch = [...playersTeam1, ...playersTeam2]; 

    const allAffectedPlayerIds = [];

    for (const player of allPlayersInMatch) {
      await updatePlayerResultsForDateInternal(player._id, player.team_id, season_id, normalizedMatchDate, session);
      allAffectedPlayerIds.push(player._id);
    }
    
    const subsequentPlayerResultDates = await PlayerResult.find({
      player_id: { $in: allAffectedPlayerIds.map(id => new mongoose.Types.ObjectId(id)) }, // Chuyển đổi sang ObjectId
      season_id: new mongoose.Types.ObjectId(season_id),
      date: { $gt: normalizedMatchDate },
    }, null, { session }).distinct('date');


    const sortedSubsequentDates = subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of sortedSubsequentDates) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);

      for (const playerIdToRecalculate of allAffectedPlayerIds) {
        const playerDoc = allPlayersInMatch.find(p => p._id.equals(playerIdToRecalculate)); // So sánh ObjectId
        if (playerDoc) {
            const playerHasResultOnThisDate = await PlayerResult.findOne({
                player_id: new mongoose.Types.ObjectId(playerIdToRecalculate),
                season_id: new mongoose.Types.ObjectId(season_id),
                date: dateToRecalculate
            }, null, { session });
            if(playerHasResultOnThisDate){
                 await updatePlayerResultsForDateInternal(playerIdToRecalculate, playerDoc.team_id, season_id, dateToRecalculate, session);
            }
        }
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Player results updated successfully, including subsequent dates.");
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
      team_id: TeamID, // Thêm team_id vào query để đảm bảo tính duy nhất theo cả đội
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
        $sort: { date: -1, totalGoals: -1 }, // Sắp xếp theo ngày giảm dần, sau đó là tổng bàn thắng
      },
      {
        $group: {
          _id: { player_id: "$player_id", team_id: "$team_id" }, // Nhóm theo cả player_id và team_id
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
              matchesPlayed: "$matchesplayed", // Đổi tên matchesplayed
              totalGoals: "$totalGoals",     // Đổi tên totalGoals
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
    // Lấy bản ghi PlayerResult mới nhất của cầu thủ đó (không phân biệt mùa giải hay đội)
    const playerResult = await PlayerResult.findOne({
      player_id: Check_player_id,
    }).sort({date: -1});

    if (!playerResult) {
      // Trả về 404 nếu không tìm thấy PlayerResult nào
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
        team_id: affectedTeamId, // Thêm team_id
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
        team_id: affectedTeamId, // Thêm team_id
        date: { $gte: deletedDate } 
    }, null, { session }).distinct('date');
    
    const sortedSubsequentDatesForPlayer = subsequentResultsToRecalculate.sort((a,b) => new Date(a) - new Date(b));

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
  // updatePlayerResultsForDateInternal, // Đã export ở trên
};