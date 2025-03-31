const { ObjectId } = require("mongodb");
const { GET_DB } = require("../../../config/db");
const { successResponse } = require("../../../../utils/responseFormat");

// Tạo bảng xếp hạng cầu thủ
const createRanking = async (req, res, next) => {
  const TeamResultID = new ObjectId(req.params.team_result_id);
  let { season_id } = req.body;
  season_id = new ObjectId(season_id);
  if (!TeamResultID || !season_id) {
    const error = new Error("Team Result ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const teamResult = await db
      .collection("team_results")
      .findOne({ _id: TeamResultID, season_id });
    if (!teamResult) {
      const error = new Error("Team Result not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const checkExist = await db
      .collection("rankings")
      .findOne({ team_result_id: TeamResultID });
    if (checkExist) {
      const error = new Error("Ranking already exists");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const rank = 0;
    await db.collection("rankings").insertOne({
      team_result_id: TeamResultID,
      season_id,
      rank,
      date: teamResult.date,
    });
    return successResponse(res, null, "Ranking created successfully", 201);
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Lấy bảng xếp hạng mùa giải
const getSeasonRanking = async (req, res, next) => {
  const season_id = req.params.seasonid;
  if (!season_id) {
    const error = new Error("Season ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const seasonranking = await db
      .collection("rankings")
      .find({ season_id: SeasonID })
      .toArray();
    return successResponse(
      res,
      seasonranking,
      "Fetched season rankings successfully"
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Cập nhật bảng xếp hạng
const updateRanking = async (req, res, next) => {
  const season_id = req.params.seasonid;
  const { match_date } = req.body;
  const SeasonID = new ObjectId(season_id);

  if (!season_id || !match_date) {
    const error = new Error("Season ID and Match Date are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }

  try {
    const db = GET_DB();
    let currentDate = new Date(match_date);
    currentDate.setUTCHours(0, 0, 0, 0); // Chuẩn hóa ngày về UTC

    const SeasonRegulation = await db
      .collection("regulations")
      .findOne({ season_id: SeasonID, regulation_name: "Ranking Rules" });
    if (!SeasonRegulation) {
      const error = new Error("Season Regulation not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const rankingCriteria = SeasonRegulation.rules.rankingCriteria;
    if (
      !rankingCriteria ||
      !Array.isArray(rankingCriteria) ||
      rankingCriteria.length === 0
    ) {
      const error = new Error("Invalid ranking criteria");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
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
        const error = new Error("Invalid ranking criteria");
        error.status = 400;
        return next(error); // Ném lỗi cho middleware xử lý
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
        const error = new Error(
          `No team results found for ${
            currentDate.toISOString().split("T")[0]
          }, cannot update ranking`
        );
        error.status = 404;
        return next(error); // Ném lỗi cho middleware xử lý
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
      return successResponse(
        res,
        null,
        `Ranking updated for date ${currentDate.toISOString()}`
      );
    } else {
      const teamAggregation = await db
        .collection("team_results")
        .aggregate([
          { $match: { season_id: SeasonID, date: { $lte: currentDate } } },
          { $group: { _id: "$team_id", latestResult: { $max: "$date" } } },
        ])
        .toArray();

      if (teamAggregation.length === 0) {
        const error = new Error(
          "No previous team results found to create ranking"
        );
        error.status = 404;
        return next(error); // Ném lỗi cho middleware xử lý
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
      return successResponse(
        res,
        null,
        `New ranking created for date ${currentDate.toISOString()}`,
        201
      );
    }
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Xóa bảng xếp hạng
const deleteRanking = async (req, res, next) => {
  const ranking_id = new ObjectId(req.params.id);
  try {
    const db = GET_DB();
    const ranking = await db
      .collection("rankings")
      .findOne({ _id: ranking_id });
    if (!ranking) {
      const error = new Error("Ranking not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    await db.collection("rankings").deleteOne({ _id: ranking_id });
    return successResponse(res, null, "Ranking deleted successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

module.exports = {
  createRanking,
  getSeasonRanking,
  updateRanking,
  deleteRanking,
};
