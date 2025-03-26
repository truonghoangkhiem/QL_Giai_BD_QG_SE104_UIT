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
    await db.collection("player_results").insertOne({
      season_id: SeasonID,
      player_id: PlayerID,
      team_id: TeamID,
      matchesplayed: 0,
      totalGoals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    });
    res.status(201).json({ message: "Created player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a player result", error });
  }
};
// API lấy kết quả cầu thủ theo mùa giải
const getPlayerResultbySeasonId = async (req, res) => {
  const season_id = req.params.seasonid;
  if (!season_id)
    return res.status(400).json({ message: "SeasonId are required" });
  try {
    const db = GET_DB();
    const Check_season_id = new ObjectId(season_id);
    const playerresult = await db
      .collection("player_results")
      .find({ season_id: Check_season_id })
      .toArray();
    res.status(200).json(playerresult);
  } catch (error) {
    res.status(500).json({ message: "Failed to get player result", error });
  }
};

const getPlayerResultsById = async (req, res) => {
  const player_id = req.params.playerid;
  if (!player_id)
    return res.status(400).json({ message: "PlayerId are required" });
  try {
    const db = GET_DB();
    const Check_player_id = new ObjectId(player_id);
    console.log(Check_player_id);
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

    // Lấy thông tin trận đấu
    const match = await db.collection("matches").findOne({ _id: MatchID });
    if (!match) return res.status(404).json({ message: "Match not found" });

    const goalDetails = match.goalDetails;

    // Cập nhật số bàn thắng cho mỗi cầu thủ ghi bàn
    for (let goal of goalDetails) {
      const { player_id } = goal;
      const PlayerID = new ObjectId(player_id);

      const playerresult = await db
        .collection("player_results")
        .findOne({ player_id: PlayerID });

      if (!playerresult)
        return res.status(404).json({ message: "Player result not found" });

      const updatedTotalGoals = playerresult.totalGoals + 1;

      // Cập nhật tổng số bàn thắng cho cầu thủ
      await db
        .collection("player_results")
        .updateOne(
          { player_id: PlayerID },
          { $set: { totalGoals: updatedTotalGoals } }
        );
    }

    // Cập nhật số trận đấu đã chơi cho đội 1
    const updateMatchesPlayed = async (teamId) => {
      const playerresults = await db
        .collection("player_results")
        .find({ team_id: teamId })
        .toArray();

      for (let playerresult of playerresults) {
        const updatedMatchesPlayed = playerresult.matchesplayed + 1;

        await db
          .collection("player_results")
          .updateOne(
            { _id: playerresult._id },
            { $set: { matchesplayed: updatedMatchesPlayed } }
          );
      }
    };

    // Cập nhật cho đội 1 và đội 2
    await updateMatchesPlayed(match.team1);
    await updateMatchesPlayed(match.team2);

    res.status(200).json({ message: "Updated player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update player result", error });
  }
};

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
    await db
      .collection("player_results")
      .updateOne({ _id: PlayerResultID }, { $set: updateplayerresult });
    res.status(200).json({ message: "Updated player result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update player result", error });
  }
};

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
  getPlayerResultbySeasonId,
  getPlayerResultsById,
  updatePlayerResultsafterMatch,
  updatePlayerResults,
  deletePlayerResults,
};
