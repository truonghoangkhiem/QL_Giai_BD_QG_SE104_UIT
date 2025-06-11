import PlayerRanking from "../../../../models/PlayerRanking.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Match from "../../../../models/Match.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerRankingSchema,
  MatchIdSchema as PlayerRankingMatchIdSchema, // Alias để tránh xung đột nếu MatchIdSchema khác được import
  PlayerRankingIdSchema,
  GetPlayerRankingsBySeasonIdAndDateSchema,
} from "../../../../schemas/playerRankingSchema.js";
import mongoose from "mongoose";

// --- HÀM HELPER NỘI BỘ ĐỂ TÍNH TOÁN VÀ LƯU BẢNG XẾP HẠNG ---
// Hàm này sẽ chứa logic chính của updatePlayerRankingsafterMatch
// và có thể được gọi từ nơi khác (ví dụ: sau khi xóa cầu thủ)
const calculateAndSavePlayerRankings = async (seasonId, dateForRanking, session = null) => {
  const player_results = await PlayerResult.aggregate([
    {
      $match: {
        season_id: seasonId,
        date: { $lte: dateForRanking },
      },
    },
    {
      $sort: { date: -1 },
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
  ]).session(session); // Sử dụng session nếu được cung cấp

  if (!player_results.length) {
    // Nếu không có PlayerResult nào, có thể xóa tất cả PlayerRanking cho ngày đó của mùa giải đó
    await PlayerRanking.deleteMany({ season_id: seasonId, date: dateForRanking }).session(session);
    console.log(`No player results found for season ${seasonId} on/before ${dateForRanking}. Cleared existing rankings for this date.`);
    return; // Không có gì để xếp hạng
  }

  // Sắp xếp theo tổng số bàn thắng (hoặc tiêu chí khác nếu cần)
  player_results.sort((a, b) => (b.totalGoals || 0) - (a.totalGoals || 0));

  const existingRankings = await PlayerRanking.find({
    season_id: seasonId,
    date: dateForRanking,
  }).session(session);

  const rankingUpdates = [];
  for (let i = 0; i < player_results.length; i++) {
    const playerResult = player_results[i];
    const existingRanking = existingRankings.find(
      (r) => r.player_results_id.toString() === playerResult._id.toString()
    );

    const rank = i + 1;

    if (existingRanking) {
      if (existingRanking.rank !== rank || !existingRanking.player_id.equals(playerResult.player_id)) {
        rankingUpdates.push({
          updateOne: {
            filter: { _id: existingRanking._id }, // Lọc theo _id của PlayerRanking
            update: { $set: { rank: rank, player_id: playerResult.player_id } }, // Cập nhật player_id nếu cần
          },
        });
      }
    } else {
      rankingUpdates.push({
        insertOne: {
          document: {
            season_id: seasonId,
            player_results_id: playerResult._id,
            player_id: playerResult.player_id,
            rank: rank,
            date: dateForRanking,
          },
        },
      });
    }
  }

  // Xóa các PlayerRanking không còn PlayerResult tương ứng (ví dụ, khi cầu thủ bị xóa)
  const currentPlayerResultIds = new Set(player_results.map(pr => pr._id.toString()));
  const rankingsToDelete = existingRankings.filter(r => !currentPlayerResultIds.has(r.player_results_id.toString()));

  for (const rankToDelete of rankingsToDelete) {
    rankingUpdates.push({
      deleteOne: {
        filter: { _id: rankToDelete._id }
      }
    });
  }
  

  if (rankingUpdates.length > 0) {
    await PlayerRanking.bulkWrite(rankingUpdates, { session });
  }
  console.log(`Player rankings recalculated for season ${seasonId} on ${dateForRanking}. Updates: ${rankingUpdates.length}`);
};
// --- KẾT THÚC HÀM HELPER ---


// Tạo bảng xếp hạng cầu thủ (Hàm này có thể không cần thiết nếu ranking được tạo tự động)
const createPlayerRankings = async (req, res, next) => {
  const { season_id, player_results_id } = req.body; // Sửa: player_results_id lấy từ body
  try {
    const { success, error } = CreatePlayerRankingSchema.safeParse({
      season_id,
      player_results_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(season_id);
    const PlayerResultsID = new mongoose.Types.ObjectId(player_results_id);

    const player_results = await PlayerResult.findById(PlayerResultsID);
    if (!player_results) {
      const error = new Error("Player Result not found");
      error.status = 404;
      return next(error);
    }

    const checkExist = await PlayerRanking.findOne({
      player_results_id: PlayerResultsID,
      // Có thể cần thêm điều kiện date nếu muốn có ranking theo từng ngày cụ thể
    });
    if (checkExist) {
      const error = new Error("Player Ranking for this result already exists");
      error.status = 400;
      return next(error);
    }

    const date = new Date(player_results.date); // Sử dụng ngày của PlayerResult
    date.setUTCHours(0, 0, 0, 0);

    const newPlayerRanking = new PlayerRanking({
      season_id: SeasonID,
      player_results_id: PlayerResultsID,
      player_id: player_results.player_id,
      rank: 0, // Rank sẽ được cập nhật bởi hàm tính toán
      date,
    });
    await newPlayerRanking.save();

    // Tính toán lại ranking cho ngày này
    await calculateAndSavePlayerRankings(SeasonID, date);

    return successResponse(
      res,
      newPlayerRanking, // Trả về PlayerRanking mới tạo
      "Created player ranking successfully and recalculated for the date",
      201
    );
  } catch (error) {
    return next(error);
  }
};

// Cập nhật bảng xếp hạng cầu thủ sau trận đấu
const updatePlayerRankingsafterMatch = async (req, res, next) => {
  const { matchid } = req.params;
  const session = await mongoose.startSession(); // Bắt đầu session
  session.startTransaction();
  try {
    const { success, error } = PlayerRankingMatchIdSchema.safeParse({ matchid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError; // Ném lỗi để rollback transaction
    }

    const MatchID = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(MatchID).session(session); // Thêm session
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      throw error;
    }
     if (match.score === null || !/^\d+-\d+$/.test(match.score)) {
        await session.abortTransaction();
        session.endSession();
        return successResponse(res, { date: match.date }, "Match has no valid score, player rankings not updated.");
    }

    const matchDate = new Date(match.date);
    matchDate.setUTCHours(0, 0, 0, 0);

    // Gọi hàm helper để tính toán và lưu
    await calculateAndSavePlayerRankings(match.season_id, matchDate, session);
    
    await session.commitTransaction(); // Commit transaction
    session.endSession();

    return successResponse(
      res,
      { date: matchDate },
      "Updated player rankings successfully"
    );
  } catch (error) {
    await session.abortTransaction(); // Rollback transaction nếu có lỗi
    session.endSession();
    console.error("Error in updatePlayerRankingsafterMatch:", error);
    return next(error);
  }
};

// Xóa bảng xếp hạng cầu thủ
const deletePlayerRankings = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = PlayerRankingIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerRankingID = new mongoose.Types.ObjectId(id);
    const player_ranking = await PlayerRanking.findById(PlayerRankingID);
    if (!player_ranking) {
      const error = new Error("Player Ranking not found");
      error.status = 404;
      return next(error);
    }
    
    const seasonId = player_ranking.season_id;
    const rankingDate = new Date(player_ranking.date);
    rankingDate.setUTCHours(0,0,0,0);

    await PlayerRanking.deleteOne({ _id: PlayerRankingID });

    // Tính toán lại bảng xếp hạng cho ngày và mùa giải đó
    await calculateAndSavePlayerRankings(seasonId, rankingDate);


    return successResponse(
      res,
      null,
      "Player Ranking deleted successfully and rankings recalculated",
      200
    );
  } catch (error) {
    return next(error);
  }
};

// Lấy bảng xếp hạng cầu thủ theo season_id và ngày
const getPlayerRankingsbySeasonIdAndDate = async (req, res, next) => {
  const { seasonid } = req.params;
  const { date } = req.query;

  try {
    const { success, error } =
      GetPlayerRankingsBySeasonIdAndDateSchema.safeParse({ seasonid, date });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);

    // Sử dụng aggregate để join các collection và lấy dữ liệu cần thiết
    const playerRankings = await PlayerRanking.aggregate([
      {
        $match: {
          season_id: SeasonID,
          date: { $lte: queryDate },
        },
      },
      {
        $sort: { date: -1, rank: 1 },
      },
      {
        $group: {
          _id: "$player_id",
          latestRankingDoc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestRankingDoc" },
      },
      {
        $lookup: { // Join với PlayerResult
          from: "playerresults",
          localField: "player_results_id",
          foreignField: "_id",
          as: "playerResultInfo"
        }
      },
      {
        $unwind: { path: "$playerResultInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: { // Join với Player để lấy avatar và các thông tin khác
          from: "players",
          localField: "player_id",
          foreignField: "_id",
          as: "playerInfo"
        }
      },
      {
        $unwind: { path: "$playerInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: { // Join với Team
          from: "teams",
          localField: "playerResultInfo.team_id",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      {
        $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $project: { // Định dạng lại dữ liệu trả về cho frontend
          _id: 1,
          rank: 1,
          date: 1,
          season_id: 1,
          player_id: 1,
          playerName: { $ifNull: ["$playerInfo.name", "N/A"] },
          playerNumber: { $ifNull: ["$playerInfo.number", "N/A"] },
          playerInfo: "$playerInfo", // Quan trọng: Gửi cả object playerInfo
          team_id: "$playerResultInfo.team_id",
          teamName: { $ifNull: ["$teamInfo.team_name", "N/A"] },
          matchesPlayed: { $ifNull: ["$playerResultInfo.matchesplayed", 0] },
          goals: { $ifNull: ["$playerResultInfo.totalGoals", 0] },
          assists: { $ifNull: ["$playerResultInfo.assists", 0] },
          yellowCards: { $ifNull: ["$playerResultInfo.yellowCards", 0] },
          redCards: { $ifNull: ["$playerResultInfo.redCards", 0] }
        }
      },
      {
        $sort: { rank: 1 }
      }
    ]);
    
    if (!playerRankings.length) {
       return successResponse(res, [], "No player rankings found for this season and date");
    }

    return successResponse(
      res,
      playerRankings,
      "Latest player rankings retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getPlayerRankingsbySeasonIdAndDate:", error);
    return next(error);
  }
};

export {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
  calculateAndSavePlayerRankings, // Export hàm helper để playerController có thể sử dụng
};