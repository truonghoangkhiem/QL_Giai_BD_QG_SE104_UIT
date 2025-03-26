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
    const rank = 0;
    await db.collection("rankings").insertOne({
      team_result_id: TeamResultID,
      season_id,
      rank,
      date: teamResult.date,
    });
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
  const { match_date } = req.body; // Sửa ở đây
  const SeasonID = new ObjectId(season_id);

  if (!season_id || !match_date) {
    return res
      .status(400)
      .json({ message: "Season ID and Match Date are required" });
  }

  try {
    const db = GET_DB();
    let currentDate = new Date(match_date);
    currentDate.setUTCHours(0, 0, 0, 0); // Chuẩn hóa ngày về UTC
    console.log("currentDate:", currentDate);

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
      sortStage[field] = -1;
    });

    const existingRanking = await db
      .collection("rankings")
      .findOne({ season_id: SeasonID, date: currentDate });

    let sortedTeamResults;
    if (existingRanking) {
      let teamResults = await db
        .collection("team_results")
        .find({ season_id: SeasonID, date: currentDate })
        .toArray();

      if (teamResults.length === 0) {
        return res.status(404).json({
          message: `No team results found for ${
            currentDate.toISOString().split("T")[0]
          }, cannot update ranking`,
        });
      }

      sortedTeamResults = teamResults.sort((a, b) => {
        for (const field of Object.keys(sortStage)) {
          const direction = sortStage[field];
          if (a[field] !== b[field]) {
            return direction === 1 ? a[field] - b[field] : b[field] - a[field];
          }
        }
        if (hasHeadToHead) {
          const teamAId = a.team_id.toString();
          const teamBId = b.team_id.toString();
          const pointsA =
            (a.headToHeadPoints && a.headToHeadPoints[teamBId]) || 0;
          const pointsB =
            (b.headToHeadPoints && b.headToHeadPoints[teamAId]) || 0;
          return pointsB - pointsA;
        }
        return 0;
      });
      for (let i = 0; i < sortedTeamResults.length; i++) {
        const teamResultId = sortedTeamResults[i]._id;
        const rankingNumber = i + 1;
        await db
          .collection("rankings")
          .updateOne(
            { team_result_id: teamResultId, date: currentDate },
            { $set: { rank: rankingNumber, season_id: SeasonID } }
          );
      }
      return res.status(200).json({
        message: `Ranking updated for date ${currentDate.toISOString()}`,
      });
    } else {
      const teamAggregation = await db
        .collection("team_results")
        .aggregate([
          { $match: { season_id: SeasonID, date: { $lte: currentDate } } },
          { $group: { _id: "$team_id", latestResult: { $max: "$date" } } },
        ])
        .toArray();

      if (teamAggregation.length === 0) {
        return res.status(404).json({
          message: "No previous team results found to create ranking",
        });
      }

      const teamIds = teamAggregation.map((team) => team._id);
      let latestTeamResults = [];
      for (const teamId of teamIds) {
        const latestResult = await db
          .collection("team_results")
          .find({
            team_id: teamId,
            season_id: SeasonID,
            date: { $lte: currentDate },
          })
          .sort({ date: -1 })
          .limit(1)
          .toArray();
        if (latestResult.length > 0) {
          latestTeamResults.push(latestResult[0]);
        }
      }

      const currentDayResults = await db
        .collection("team_results")
        .find({ season_id: SeasonID, date: currentDate })
        .toArray();

      const teamResultMap = new Map();
      latestTeamResults.forEach((result) =>
        teamResultMap.set(result.team_id.toString(), result)
      );
      currentDayResults.forEach((result) =>
        teamResultMap.set(result.team_id.toString(), result)
      );
      sortedTeamResults = Array.from(teamResultMap.values()).sort((a, b) => {
        for (const field of Object.keys(sortStage)) {
          const direction = sortStage[field];
          if (a[field] !== b[field]) {
            return direction === 1 ? a[field] - b[field] : b[field] - a[field];
          }
        }
        if (hasHeadToHead) {
          const teamAId = a.team_id.toString();
          const teamBId = b.team_id.toString();
          const pointsA =
            (a.headToHeadPoints && a.headToHeadPoints[teamBId]) || 0;
          const pointsB =
            (b.headToHeadPoints && b.headToHeadPoints[teamAId]) || 0;
          return pointsB - pointsA;
        }
        return 0;
      });

      for (let i = 0; i < sortedTeamResults.length; i++) {
        const teamResultId = sortedTeamResults[i]._id;
        const rankingNumber = i + 1;
        await db.collection("rankings").insertOne({
          team_result_id: teamResultId,
          season_id: SeasonID,
          rank: rankingNumber,
          date: currentDate,
        });
      }
      return res.status(201).json({
        message: `New ranking created for date ${currentDate.toISOString()}`,
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update ranking", error: error.message });
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
