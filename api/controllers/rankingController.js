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

const updateRanking = async (req, res) => {
  const season_id = req.params.seasonid;
  const SeasonID = new ObjectId(season_id);
  if (!season_id) {
    return res.status(400).json({ message: "Season ID is required" });
  }
  try {
    const db = GET_DB();
    const SeasonRegulation = await db
      .collection("regulations")
      .findOne({ season_id: SeasonID, regulation_name: "Ranking Rules" });
    if (!SeasonRegulation) {
      return res.status(404).json({ message: "Season Regulation not found" });
    }
    const rankingCriteria = SeasonRegulation.rules.rankingCriteria;
    if (
      !rankingCriteria ||
      !Array.isArray(rankingCriteria) ||
      rankingCriteria.length === 0
    ) {
      return res.status(400).json({ message: "Invalid ranking criteria" });
    }
    const sortStage = {};
    const hasHeadToHead = rankingCriteria.includes("headToHeadPoints");
    rankingCriteria.forEach((field) => {
      const validFields = [
        "points",
        "goalsDifference",
        "headToHeadPoints",
        "goalsForAway",
      ];
      if (!validFields.includes(field)) {
        return res.status(400).json({ message: "Invalid ranking criteria" });
      }
      sortStage[field] = -1; // Mặc định sắp xếp giảm dần
    });
    console.log("test");
    let sortedTeamResults = await db
      .collection("team_results")
      .find({ season_id: SeasonID })
      .sort(sortStage)
      .toArray();
    if (hasHeadToHead) {
      sortedTeamResults.sort((a, b) => {
        // So sánh các tiêu chí trong sortStage trước
        for (const field of Object.keys(sortStage)) {
          const direction = sortStage[field];
          if (a[field] !== b[field]) {
            return direction === 1 ? a[field] - b[field] : b[field] - a[field];
          }
        }
        console.log("test");
        // Nếu các tiêu chí trước bằng nhau, xét headToHeadPoints
        const teamAId = a.team_id.toString();
        const teamBId = b.team_id.toString();
        const pointsA =
          (a.headToHeadPoints && a.headToHeadPoints[teamBId]) || 0;
        const pointsB =
          (b.headToHeadPoints && b.headToHeadPoints[teamAId]) || 0;
        return pointsB - pointsA; // Sắp xếp giảm dần theo điểm đối đầu
      });
    }
    console.log("test");

    // Cập nhật ranking_number trong rankings
    for (let i = 0; i < sortedTeamResults.length; i++) {
      const teamResultId = sortedTeamResults[i]._id;
      const rankingNumber = i + 1; // Thứ hạng bắt đầu từ 1

      await db
        .collection("rankings")
        .updateOne(
          { team_result_id: teamResultId },
          { $set: { ranked: rankingNumber } },
          { upsert: true }
        );
    }
    return res.status(200).json({ message: "Ranking updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update ranking", error });
  }
};

const deleteRanking = async (req, res) => {
  const ranking_id = new ObjectId(req.params.id);
  try {
    const db = GET_DB();
    if (!db.collection("rankings").findOne({ _id: ranking_id }))
      return res.status(404).json({ message: "Ranking not found" });
    await db.collection("rankings").deleteOne({ _id: ranking_id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete ranking", error });
  }
};

module.exports = {
  createRanking,
  getSeasonRanking,
  updateRanking,
  deleteRanking,
};
