const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

// API tạo kết quả cầu thủ
const createPlayerResults = async (req, res) => {
  const { player_id, season_id, team_id } = req.body;
  if (!player_id || !season_id || !team_id) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const db = GET_DB();
    const PlayerID = new ObjectId(player_id);
    const TeamID = new ObjectId(team_id);
    const SeasonID = new ObjectId(season_id);
    const player = await db
      .collection("players")
      .findOne({ _id: PlayerID, team_id: TeamID });
    if (!player) return res.status(404).json({ message: "Player not found" });
    const season = await db.collection("seasons").findOne({ _id: SeasonID });
    if (!season) return res.status(404).json({ message: "Season not found" });
    const checkExist = await db
      .collection("player_results")
      .findOne({ player_id: PlayerID, season_id: SeasonID });
    if (checkExist)
      return res.status(400).json({ message: "Player result already exists" });
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    await db.collection("player_results").insertOne({
      season_id: SeasonID,
      player_id: PlayerID,
      team_id: TeamID,
      matchesplayed: 0,
      totalGoals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      date: currentDate,
    });
    res.status(201).json({ message: "Created player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a player result", error });
  }
};
// API lấy kết quả cầu thủ theo mùa giải
const getPlayerResultbySeasonIdAndDate = async (req, res) => {
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
    const playerResults = await db
      .collection("player_results")
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
            latestResult: { $first: "$$ROOT" }, // Lấy bản ghi gần nhất
          },
        },
        {
          $replaceRoot: { newRoot: "$latestResult" }, // Chuyển latestResult thành document chính
        },
      ])
      .toArray();

    if (!playerResults.length) {
      return res.status(404).json({
        message: "No player results found for this season and date",
      });
    }

    res.status(200).json({
      message: "Latest player results retrieved successfully",
      data: playerResults,
      total: playerResults.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get player results",
      error: error.message,
    });
  }
};
// API lấy kết quả cầu thủ theo id
const getPlayerResultsById = async (req, res) => {
  const player_id = req.params.playerid;
  if (!player_id)
    return res.status(400).json({ message: "PlayerId are required" });
  try {
    const db = GET_DB();
    const Check_player_id = new ObjectId(player_id);
    const playerresult = await db
      .collection("player_results")
      .findOne({ player_id: Check_player_id });
    if (!playerresult)
      return res.status(404).json({ message: "Player result not found" });
    res.status(200).json(playerresult);
  } catch (error) {
    res.status(500).json({ message: "Failed to get player result", error });
  }
};
// API cập nhật kết quả cầu thủ sau trận đấu
const updatePlayerResultsafterMatch = async (req, res) => {
  const match_id = req.params.matchid;
  if (!match_id)
    return res.status(400).json({ message: "MatchId is required" });

  try {
    const db = GET_DB();
    const MatchID = new ObjectId(match_id);
    const match = await db.collection("matches").findOne({ _id: MatchID });
    if (!match) return res.status(404).json({ message: "Match not found" });

    const matchDate = new Date(match.date);
    matchDate.setUTCHours(0, 0, 0, 0);
    const goalDetails = match.goalDetails || [];
    if (!match.season_id)
      return res.status(400).json({ message: "Match season_id is required" });

    const updateTeamResults = async (teamId) => {
      const players = await db
        .collection("players")
        .find({ team_id: teamId })
        .toArray();
      const bulkOps = []; // Mảng để chứa các lệnh bulk

      for (let player of players) {
        const PlayerID = player._id;
        const goalsScored = goalDetails.filter((goal) =>
          new ObjectId(goal.player_id).equals(PlayerID)
        ).length;

        const existingResult = await db.collection("player_results").findOne({
          player_id: PlayerID,
          date: matchDate,
        });

        if (existingResult) {
          bulkOps.push({
            updateOne: {
              filter: { _id: existingResult._id },
              update: {
                $set: {
                  matchesplayed: existingResult.matchesplayed + 1,
                  totalGoals: existingResult.totalGoals + goalsScored,
                },
              },
            },
          });
        } else {
          const latestResult = await db
            .collection("player_results")
            .find({ player_id: PlayerID, date: { $lt: matchDate } })
            .sort({ date: -1 })
            .limit(1)
            .toArray();

          const baseResult =
            latestResult.length > 0
              ? latestResult[0]
              : {
                  matchesplayed: 0,
                  totalGoals: 0,
                  assists: 0,
                  yellowCards: 0,
                  redCards: 0,
                  season_id: match.season_id,
                  team_id: teamId,
                };

          bulkOps.push({
            insertOne: {
              document: {
                season_id: match.season_id,
                player_id: PlayerID,
                team_id: teamId,
                matchesplayed: baseResult.matchesplayed + 1,
                totalGoals: baseResult.totalGoals + goalsScored,
                assists: baseResult.assists,
                yellowCards: baseResult.yellowCards,
                redCards: baseResult.redCards,
                date: matchDate,
              },
            },
          });
        }
      }

      // Thực hiện tất cả lệnh bulk cùng lúc
      if (bulkOps.length > 0) {
        await db.collection("player_results").bulkWrite(bulkOps);
      }
    };

    await updateTeamResults(match.team1);
    await updateTeamResults(match.team2);

    res.status(200).json({ message: "Updated player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update player result", error });
  }
};
// API cập nhật kết quả cầu thủ thủ công
const updatePlayerResults = async (req, res) => {
  const player_result_id = req.params.id;
  const {
    season_id,
    player_id,
    team_id,
    matchesplayed,
    totalGoals,
    assists,
    yellowCards,
    redCards,
    date,
  } = req.body;
  if (!player_result_id)
    return res.status(400).json({ message: "Player result ID is required" });
  try {
    const db = GET_DB();
    const PlayerResultID = new ObjectId(player_result_id);
    updateplayerresult = {};
    if (season_id) updateplayerresult.season_id = new ObjectId(season_id);
    if (player_id) updateplayerresult.player_id = new ObjectId(player_id);
    if (team_id) updateplayerresult.team_id = new ObjectId(team_id);
    if (matchesplayed) updateplayerresult.matchesplayed = matchesplayed;
    if (totalGoals) updateplayerresult.totalGoals = totalGoals;
    if (assists) updateplayerresult.assists = assists;
    if (yellowCards) updateplayerresult.yellowCards = yellowCards;
    if (redCards) updateplayerresult.redCards = redCards;
    if (date) {
      if (isNaN(Date.parse(date)))
        return res.status(400).json({ message: "Invalid date" });
      const newDate = new Date(date);
      newDate.setUTCHours(0, 0, 0, 0);
      updateplayerresult.date = newDate;
    }

    await db
      .collection("player_results")
      .updateOne({ _id: PlayerResultID }, { $set: updateplayerresult });
    res.status(200).json({ message: "Updated player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update player result", error });
  }
};
// API xóa kết quả cầu thủ
const deletePlayerResults = async (req, res) => {
  const player_result_id = req.params.id;
  if (!player_result_id)
    return res.status(400).json({ message: "Player result ID is required" });
  try {
    const db = GET_DB();
    const PlayerResultID = new ObjectId(player_result_id);
    const playerresult = await db
      .collection("player_results")
      .findOne({ _id: PlayerResultID });
    if (!playerresult)
      return res.status(404).json({ message: "Player result not found" });
    await db.collection("player_results").deleteOne({ _id: PlayerResultID });
    res.status(200).json({ message: "Player result deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete player result", error });
  }
};

module.exports = {
  createPlayerResults,
  getPlayerResultbySeasonIdAndDate,
  getPlayerResultsById,
  updatePlayerResultsafterMatch,
  updatePlayerResults,
  deletePlayerResults,
};
