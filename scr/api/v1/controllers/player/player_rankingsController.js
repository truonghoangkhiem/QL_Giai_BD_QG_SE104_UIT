const { GET_DB } = require("../../../config/db");
const { ObjectId } = require("mongodb");
const { successResponse } = require("../../../../utils/responseFormat"); // Import các hàm định dạng phản hồi

// Tạo bảng xếp hạng cầu thủ
const createPlayerRankings = async (req, res, next) => {
  const { season_id, player_results_id } = req.body;
  if (!season_id || !player_results_id) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const PlayerResultsID = new ObjectId(player_results_id);
    const player_results = await db
      .collection("player_results")
      .findOne({ _id: PlayerResultsID });
    if (!player_results) {
      const error = new Error("Player Result not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const checkExist = await db
      .collection("player_rankings")
      .findOne({ player_results_id: PlayerResultsID });
    if (checkExist) {
      const error = new Error("Player Ranking already exists");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0); // Set time to midnight
    await db.collection("player_rankings").insertOne({
      season_id: SeasonID,
      player_results_id: PlayerResultsID,
      player_id: player_results.player_id,
      rank: 0,
      date: date,
    });
    return successResponse(
      res,
      null,
      "Created player ranking successfully",
      201
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// API cập nhật bảng xếp hạng cầu thủ sau trận đấu
const updatePlayerRankingsafterMatch = async (req, res, next) => {
  const match_id = req.params.matchid;
  if (!match_id) {
    const error = new Error("Match ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const MatchID = new ObjectId(match_id);
    const match = await db.collection("matches").findOne({ _id: MatchID });
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    const matchDate = new Date(match.date);
    matchDate.setUTCHours(0, 0, 0, 0);

    // Lấy kết quả mới nhất từ player_results
    const player_results = await db
      .collection("player_results")
      .aggregate([
        {
          $match: {
            season_id: match.season_id,
            date: { $lte: matchDate },
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
      ])
      .toArray();

    if (!player_results.length) {
      const error = new Error("Player Result not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Sắp xếp theo totalGoals giảm dần
    player_results.sort((a, b) => b.totalGoals - a.totalGoals);

    // Kiểm tra rankings hiện tại cho ngày matchDate
    const existingRankings = await db
      .collection("player_rankings")
      .find({
        season_id: match.season_id,
        date: matchDate,
      })
      .toArray();

    const rankingUpdates = [];
    for (let i = 0; i < player_results.length; i++) {
      const player = player_results[i];
      const existingRanking = existingRankings.find(
        (r) => r.player_results_id.toString() === player._id.toString()
      );

      if (existingRanking) {
        // Chỉ cập nhật nếu rank thay đổi
        if (existingRanking.rank !== i + 1) {
          rankingUpdates.push({
            updateOne: {
              filter: { player_results_id: player._id, date: matchDate },
              update: { $set: { rank: i + 1 } },
            },
          });
        }
      } else {
        // Tạo mới nếu chưa có
        rankingUpdates.push({
          insertOne: {
            document: {
              season_id: match.season_id,
              player_results_id: player._id,
              player_id: player.player_id,
              rank: i + 1,
              date: matchDate,
            },
          },
        });
      }
    }

    if (rankingUpdates.length > 0) {
      await db.collection("player_rankings").bulkWrite(rankingUpdates);
    }

    return successResponse(
      res,
      { date: matchDate },
      "Updated player rankings successfully"
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// API xóa bảng xếp hạng cầu thủ
const deletePlayerRankings = async (req, res, next) => {
  const player_ranking_id = req.params.id;
  if (!player_ranking_id) {
    const error = new Error("Player Ranking ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const PlayerRankingID = new ObjectId(player_ranking_id);
    const player_ranking = await db
      .collection("player_rankings")
      .findOne({ _id: PlayerRankingID });
    if (!player_ranking) {
      const error = new Error("Player Ranking not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    await db.collection("player_rankings").deleteOne({ _id: PlayerRankingID });
    return successResponse(
      res,
      null,
      "Player Ranking deleted successfully",
      200
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// API lấy bảng xếp hạng cầu thủ theo season_id và ngày
const getPlayerRankingsbySeasonIdAndDate = async (req, res, next) => {
  const { seasonid: season_id } = req.params;
  const { date } = req.body;

  if (!season_id || !date) {
    const error = new Error("Season ID and Date are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }

  try {
    const db = GET_DB();
    let seasonId;
    try {
      seasonId = new ObjectId(season_id);
    } catch (e) {
      const error = new Error("Invalid Season ID format");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      const error = new Error("Invalid Date format");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    queryDate.setUTCHours(0, 0, 0, 0);

    // Aggregation để lấy bản ghi gần nhất <= queryDate
    const playerRankings = await db
      .collection("player_rankings")
      .aggregate([
        {
          $match: {
            season_id: seasonId,
            date: { $lte: queryDate },
          },
        },
        {
          $sort: { date: -1 },
        },
        {
          $group: {
            _id: "$player_id",
            latestRanking: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: { newRoot: "$latestRanking" },
        },
      ])
      .toArray();

    if (!playerRankings.length) {
      const error = new Error(
        "No player rankings found for this season and date"
      );
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    return successResponse(
      res,
      playerRankings,
      "Latest player rankings retrieved successfully"
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

module.exports = {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
};
