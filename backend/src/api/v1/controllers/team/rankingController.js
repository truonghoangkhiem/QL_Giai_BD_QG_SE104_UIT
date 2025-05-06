import Ranking from "../../../../models/Ranking.js";
import TeamResult from "../../../../models/TeamResult.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateRankingSchema,
  SeasonIdSchema,
  UpdateRankingSchema,
  RankingIdSchema,
} from "../../../../schemas/rankingSchema.js";
import mongoose from "mongoose";

// Tạo bảng xếp hạng cầu thủ
const createRanking = async (req, res, next) => {
  const { team_result_id } = req.params;
  const { season_id } = req.body;
  try {
    const { success, error } = CreateRankingSchema.safeParse({
      team_result_id,
      season_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const TeamResultID = new mongoose.Types.ObjectId(team_result_id);
    const SeasonID = new mongoose.Types.ObjectId(season_id);

    const teamResult = await TeamResult.findOne({
      _id: TeamResultID,
      season_id: SeasonID,
    });
    if (!teamResult) {
      const error = new Error("Team Result not found");
      error.status = 404;
      return next(error);
    }

    const checkExist = await Ranking.findOne({ team_result_id: TeamResultID });
    if (checkExist) {
      const error = new Error("Ranking already exists");
      error.status = 400;
      return next(error);
    }

    const newRanking = new Ranking({
      team_result_id: TeamResultID,
      season_id: SeasonID,
      rank: 0,
      date: teamResult.date,
    });
    await newRanking.save();

    return successResponse(res, null, "Ranking created successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// Lấy bảng xếp hạng mùa giải
const getSeasonRanking = async (req, res, next) => {
  const { seasonid } = req.params;
  try {
    const { success, error } = SeasonIdSchema.safeParse({ seasonid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const seasonRanking = await Ranking.find({ season_id: SeasonID });
    return successResponse(
      res,
      seasonRanking,
      "Fetched season rankings successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Cập nhật bảng xếp hạng
const updateRanking = async (req, res, next) => {
  const { seasonid } = req.params;
  const { match_date } = req.body;
  try {
    const { success, error } = UpdateRankingSchema.safeParse({
      seasonid,
      match_date,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    let currentDate = new Date(match_date);
    currentDate.setUTCHours(0, 0, 0, 0);

    const SeasonRegulation = await Regulation.findOne({
      season_id: SeasonID,
      regulation_name: "Ranking Rules",
    });
    if (!SeasonRegulation) {
      const error = new Error("Season Regulation not found");
      error.status = 404;
      return next(error);
    }

    const rankingCriteria = SeasonRegulation.rules.rankingCriteria;
    if (
      !rankingCriteria ||
      !Array.isArray(rankingCriteria) ||
      rankingCriteria.length === 0
    ) {
      const error = new Error("Invalid ranking criteria");
      error.status = 400;
      return next(error);
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
        return next(error);
      }
      sortStage[field] = -1;
    });

    const existingRanking = await Ranking.findOne({
      season_id: SeasonID,
      date: currentDate,
    });

    let sortedTeamResults;
    if (existingRanking) {
      let teamResults = await TeamResult.find({
        season_id: SeasonID,
        date: currentDate,
      });
      if (teamResults.length === 0) {
        const error = new Error(
          `No team results found for ${
            currentDate.toISOString().split("T")[0]
          }, cannot update ranking`
        );
        error.status = 404;
        return next(error);
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
            (a.headToHeadPoints && a.headToHeadPoints.get(teamBId)) || 0;
          const pointsB =
            (b.headToHeadPoints && b.headToHeadPoints.get(teamAId)) || 0;
          return pointsB - pointsA;
        }
        return 0;
      });

      for (let i = 0; i < sortedTeamResults.length; i++) {
        const teamResultId = sortedTeamResults[i]._id;
        const rankingNumber = i + 1;
        await Ranking.updateOne(
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
      const teamAggregation = await TeamResult.aggregate([
        { $match: { season_id: SeasonID, date: { $lte: currentDate } } },
        { $group: { _id: "$team_id", latestResult: { $max: "$date" } } },
      ]);

      if (teamAggregation.length === 0) {
        const error = new Error(
          "No previous team results found to create ranking"
        );
        error.status = 404;
        return next(error);
      }

      const teamIds = teamAggregation.map((team) => team._id);
      let latestTeamResults = [];
      for (const teamId of teamIds) {
        const latestResult = await TeamResult.findOne({
          team_id: teamId,
          season_id: SeasonID,
          date: { $lte: currentDate },
        }).sort({ date: -1 });
        if (latestResult) {
          latestTeamResults.push(latestResult);
        }
      }

      const currentDayResults = await TeamResult.find({
        season_id: SeasonID,
        date: currentDate,
      });

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
            (a.headToHeadPoints && a.headToHeadPoints.get(teamBId)) || 0;
          const pointsB =
            (b.headToHeadPoints && b.headToHeadPoints.get(teamAId)) || 0;
          return pointsB - pointsA;
        }
        return 0;
      });

      for (let i = 0; i < sortedTeamResults.length; i++) {
        const teamResultId = sortedTeamResults[i]._id;
        const rankingNumber = i + 1;
        const newRanking = new Ranking({
          team_result_id: teamResultId,
          season_id: SeasonID,
          rank: rankingNumber,
          date: currentDate,
        });
        await newRanking.save();
      }
      return successResponse(
        res,
        null,
        `New ranking created for date ${currentDate.toISOString()}`,
        201
      );
    }
  } catch (error) {
    return next(error);
  }
};

// Xóa bảng xếp hạng
const deleteRanking = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = RankingIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const ranking_id = new mongoose.Types.ObjectId(id);
    const ranking = await Ranking.findById(ranking_id);
    if (!ranking) {
      const error = new Error("Ranking not found");
      error.status = 404;
      return next(error);
    }

    await Ranking.deleteOne({ _id: ranking_id });
    return successResponse(res, null, "Ranking deleted successfully");
  } catch (error) {
    return next(error);
  }
};

export { createRanking, getSeasonRanking, updateRanking, deleteRanking };
