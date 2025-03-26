const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

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
    await db.collection("player_rankings").insertOne({
      season_id: SeasonID,
      player_results_id: PlayerResultsID,
      rank: 0,
    });
    res.status(201).json({ message: "Created player ranking successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a player ranking", error });
  }
};

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
    const player_results = await db
      .collection("player_results")
      .find({ season_id: match.season_id })
      .toArray();
    if (!player_results.length) {
      return res.status(404).json({ message: "Player Result not found" });
    }
    const player_rankings = await db
      .collection("player_rankings")
      .find({ season_id: match.season_id })
      .toArray();
    if (!player_rankings.length) {
      return res.status(404).json({ message: "Player Ranking not found" });
    }
    sortStage = -1; // sap xep giam dan
    player_results.sort((a, b) => b.totalGoals - a.totalGoals);
    const rankingUpdates = [];
    for (let i = 0; i < player_results.length; i++) {
      const player = player_results[i];
      rankingUpdates.push({
        updateOne: {
          filter: { player_results_id: player._id },
          update: { $set: { rank: i + 1 } },
        },
      });
    }
    if (rankingUpdates.length > 0) {
      await db.collection("player_rankings").bulkWrite(rankingUpdates);
    }
    res.status(200).json({ message: "Updated player rankings successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update player rankings", error });
  }
};

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

module.exports = {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
};
