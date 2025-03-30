const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

// Create player rankings
const createPlayerRankings = async (req, res) => {
  const { season_id, player_results_id } = req.body;
  if (!season_id || !player_results_id) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const PlayerResultsID = new ObjectId(player_results_id);
    const player_results = await db
      .collection("player_results")
      .findOne({ _id: PlayerResultsID });
    if (!player_results) {
      return res.status(404).json({ message: "Player Result not found" });
    }
    const checkExist = await db
      .collection("player_rankings")
      .findOne({ player_results_id: PlayerResultsID });
    if (checkExist) {
      return res.status(400).json({ message: "Player Ranking already exists" });
    }
    date = new Date();
    date.setUTCHours(0, 0, 0, 0); // Set time to midnight
    await db.collection("player_rankings").insertOne({
      season_id: SeasonID,
      player_results_id: PlayerResultsID,
      player_id: player_results.player_id,
      rank: 0,
      date: date,
    });
    res.status(201).json({ message: "Created player ranking successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a player ranking", error });
  }
};
// API cập nhật bảng xếp hạng cầu thủ sau trận đấu
const updatePlayerRankingsafterMatch = async (req, res) => {
  const match_id = req.params.matchid;
  if (!match_id) {
    return res.status(400).json({ message: "Match ID is required" });
  }
  try {
    const db = GET_DB();
    const MatchID = new ObjectId(match_id);
    const match = await db.collection("matches").findOne({ _id: MatchID });
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
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
      return res.status(404).json({ message: "Player Result not found" });
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

    res.status(200).json({
      message: "Updated player rankings successfully",
      date: matchDate,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update player rankings", error });
  }
};
// API xóa bảng xếp hạng cầu thủ
const deletePlayerRankings = async (req, res) => {
  const player_ranking_id = req.params.id;
  if (!player_ranking_id) {
    return res.status(400).json({ message: "Player Ranking ID is required" });
  }
  try {
    const db = GET_DB();
    const PlayerRankingID = new ObjectId(player_ranking_id);
    const player_ranking = await db
      .collection("player_rankings")
      .findOne({ _id: PlayerRankingID });
    if (!player_ranking) {
      return res.status(404).json({ message: "Player Ranking not found" });
    }
    await db.collection("player_rankings").deleteOne({ _id: PlayerRankingID });
    res.status(200).json({ message: "Player Ranking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete player ranking", error });
  }
};
// API lấy bảng xếp hạng cầu thủ theo season_id và ngày
const getPlayerRankingsbySeasonIdAndDate = async (req, res) => {
  const { seasonid: season_id } = req.params;
  const { date } = req.body;

  if (!season_id || !date) {
    return res.status(400).json({ message: "Season ID and Date are required" });
  }

  try {
    const db = GET_DB();
    let seasonId;
    try {
      seasonId = new ObjectId(season_id);
    } catch (e) {
      return res.status(400).json({ message: "Invalid Season ID format" });
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({ message: "Invalid Date format" });
    }
    queryDate.setUTCHours(0, 0, 0, 0);

    // Aggregation để lấy bản ghi gần nhất <= queryDate
    const playerRankings = await db
      .collection("player_rankings") // Assuming player rankings are stored in this collection
      .aggregate([
        {
          $match: {
            season_id: seasonId,
            date: { $lte: queryDate }, // Chỉ lấy các bản ghi trước hoặc bằng queryDate
          },
        },
        {
          $sort: { date: -1 }, // Sắp xếp theo date giảm dần (gần queryDate nhất lên đầu)
        },
        {
          $group: {
            _id: "$player_id", // Nhóm theo player_id
            latestRanking: { $first: "$$ROOT" }, // Lấy bản ghi gần nhất
          },
        },
        {
          $replaceRoot: { newRoot: "$latestRanking" }, // Chuyển latestRanking thành document chính
        },
      ])
      .toArray();

    if (!playerRankings.length) {
      return res.status(404).json({
        message: "No player rankings found for this season and date",
      });
    }

    res.status(200).json({
      message: "Latest player rankings retrieved successfully",
      data: playerRankings,
      total: playerRankings.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get player rankings",
      error: error.message,
    });
  }
};

module.exports = {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
};
