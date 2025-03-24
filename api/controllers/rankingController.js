const { ObjectId } = require("mongodb");
const { GET_DB } = require("../config/db");

const createRanking = async (req, res) => {
  const TeamResultID = new ObjectId(req.params.team_result_id);
  let { season_id } = req.body;
  season_id = new ObjectId(season_id);
  if (!TeamResultID || !season_id) {
    return res.status(400).json({ message: "Team Result ID is required" });
  }
  try {
    const db = GET_DB();
    const teamResult = await db
      .collection("team_results")
      .findOne({ _id: TeamResultID, season_id });
    if (!teamResult) {
      return res.status(404).json({ message: "Team Result not found" });
    }
    const checkExist = await db
      .collection("rankings")
      .findOne({ team_result_id: TeamResultID });
    if (checkExist) {
      return res.status(400).json({ message: "Ranking already exists" });
    }
    const ranked = 0;
    await db
      .collection("rankings")
      .insertOne({ team_result_id: TeamResultID, season_id, ranked });
    res.status(201).json({ message: "Ranking created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to create ranking", error });
  }
};

const getSeasonRanking = async (req, res) => {
  const season_id = req.params.seasonid;
  if (!season_id) {
    return res.status(400).json({ message: "Season ID is required" });
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    console.log(SeasonID);
    const seasonranking = await db
      .collection("rankings")
      .find({ season_id: SeasonID })
      .toArray();
    console.log(seasonranking);
    res.status(200).json(seasonranking);
  } catch (error) {
    res.status(500).json({ message: "Failed to get season ranking", error });
  }
};

// const updateRanking = async (req, res) => {
//   const season_id = req.params.seasonid;
//   const SeasonID = new ObjectId(season_id);
//   if (!season_id) {
//     return res.status(400).json({ message: "Season ID is required" });
//   }
//   try{
//     const db = GET_DB();
//     const SeasonRegulation = await db.collection("rankings").findOne({ season_id: SeasonID, regulation_name: "Ranking Rules" });
//     if (!SeasonRegulation) {
//       return res.status(404).json({ message: "Season Regulation not found" });
//     }
//     const rankingCriteria = SeasonRegulation.rules.rankingCriteria;
//     if (!rankingCriteria || !Array.isArray(rankingCriteria) || rankingCriteria.length === 0) {
//       return res.status(400).json({ message: "Invalid ranking criteria" });
//     }
//     const sortStage = {};
//     rankingCriteria.forEach(field => {
//         const validFields = ['points', 'goalDifference', 'wins']
//     })
//   }
// };

module.exports = { createRanking, getSeasonRanking };
