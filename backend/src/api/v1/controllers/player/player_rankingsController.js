import PlayerRanking from "../../../../models/PlayerRanking.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Match from "../../../../models/Match.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerRankingSchema,
  MatchIdSchema,
  PlayerRankingIdSchema,
  GetPlayerRankingsBySeasonIdAndDateSchema,
} from "../../../../schemas/playerRankingSchema.js";
import mongoose from "mongoose";

// Tạo bảng xếp hạng cầu thủ
const createPlayerRankings = async (req, res, next) => {
  const { season_id, player_results_id } = req.body;
  try {
    const { success, error } = CreatePlayerRankingSchema.safeParse({
      season_id,
      player_results_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(season_id);
    const PlayerResultsID = new mongoose.Types.ObjectId(player_results_id);

    const player_results = await PlayerResult.findById(PlayerResultsID);
    if (!player_results) {
      const error = new Error("Player Result not found");
      error.status = 404;
      return next(error);
    }

    const checkExist = await PlayerRanking.findOne({
      player_results_id: PlayerResultsID,
    });
    if (checkExist) {
      const error = new Error("Player Ranking already exists");
      error.status = 400;
      return next(error);
    }

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    const newPlayerRanking = new PlayerRanking({
      season_id: SeasonID,
      player_results_id: PlayerResultsID,
      player_id: player_results.player_id,
      rank: 0,
      date,
    });
    await newPlayerRanking.save();

    return successResponse(
      res,
      null,
      "Created player ranking successfully",
      201
    );
  } catch (error) {
    return next(error);
  }
};

// Cập nhật bảng xếp hạng cầu thủ sau trận đấu
const updatePlayerRankingsafterMatch = async (req, res, next) => {
  const { matchid } = req.params;
  try {
    const { success, error } = MatchIdSchema.safeParse({ matchid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const MatchID = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(MatchID);
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error);
    }

    const matchDate = new Date(match.date);
    matchDate.setUTCHours(0, 0, 0, 0);

    const player_results = await PlayerResult.aggregate([
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
    ]);

    if (!player_results.length) {
      const error = new Error("Player Result not found");
      error.status = 404;
      return next(error);
    }

    player_results.sort((a, b) => b.totalGoals - a.totalGoals);

    const existingRankings = await PlayerRanking.find({
      season_id: match.season_id,
      date: matchDate,
    });

    const rankingUpdates = [];
    for (let i = 0; i < player_results.length; i++) {
      const player = player_results[i];
      const existingRanking = existingRankings.find(
        (r) => r.player_results_id.toString() === player._id.toString()
      );

      if (existingRanking) {
        if (existingRanking.rank !== i + 1) {
          rankingUpdates.push({
            updateOne: {
              filter: { player_results_id: player._id, date: matchDate },
              update: { $set: { rank: i + 1 } },
            },
          });
        }
      } else {
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
      await PlayerRanking.bulkWrite(rankingUpdates);
    }

    return successResponse(
      res,
      { date: matchDate },
      "Updated player rankings successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Xóa bảng xếp hạng cầu thủ
const deletePlayerRankings = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = PlayerRankingIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerRankingID = new mongoose.Types.ObjectId(id);
    const player_ranking = await PlayerRanking.findById(PlayerRankingID);
    if (!player_ranking) {
      const error = new Error("Player Ranking not found");
      error.status = 404;
      return next(error);
    }

    await PlayerRanking.deleteOne({ _id: PlayerRankingID });
    return successResponse(
      res,
      null,
      "Player Ranking deleted successfully",
      200
    );
  } catch (error) {
    return next(error);
  }
};

// Lấy bảng xếp hạng cầu thủ theo season_id và ngày
const getPlayerRankingsbySeasonIdAndDate = async (req, res, next) => {
  const { seasonid } = req.params;
  const { date } = req.body;
  try {
    const { success, error } =
      GetPlayerRankingsBySeasonIdAndDateSchema.safeParse({ seasonid, date });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);

    const playerRankings = await PlayerRanking.aggregate([
      {
        $match: {
          season_id: SeasonID,
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
    ]);

    if (!playerRankings.length) {
      const error = new Error(
        "No player rankings found for this season and date"
      );
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      playerRankings,
      "Latest player rankings retrieved successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export {
  createPlayerRankings,
  updatePlayerRankingsafterMatch,
  deletePlayerRankings,
  getPlayerRankingsbySeasonIdAndDate,
};
