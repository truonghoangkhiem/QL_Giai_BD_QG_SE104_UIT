import PlayerResult from "../../../../models/PlayerResult.js";
import Player from "../../../../models/Player.js";
import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Match from "../../../../models/Match.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreatePlayerResultSchema,
  GetPlayerResultBySeasonIdAndDateSchema,
  PlayerIdSchema,
  MatchIdSchema,
  UpdatePlayerResultSchema,
  PlayerResultIdSchema,
} from "../../../../schemas/playerResultSchema.js";
import mongoose from "mongoose";

// Tạo kết quả cầu thủ
const createPlayerResults = async (req, res, next) => {
  const { player_id, season_id, team_id } = req.body;
  try {
    const { success, error } = CreatePlayerResultSchema.safeParse({
      player_id,
      season_id,
      team_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerID = new mongoose.Types.ObjectId(player_id);
    const TeamID = new mongoose.Types.ObjectId(team_id);
    const SeasonID = new mongoose.Types.ObjectId(season_id);

    const player = await Player.findOne({ _id: PlayerID, team_id: TeamID });
    if (!player) {
      const error = new Error("Player not found");
      error.status = 404;
      return next(error);
    }

    const season = await Season.findById(SeasonID);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    const checkExist = await PlayerResult.findOne({
      player_id: PlayerID,
      season_id: SeasonID,
    });
    if (checkExist) {
      const error = new Error("Player result already exists");
      error.status = 400;
      return next(error);
    }

    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    const newPlayerResult = new PlayerResult({
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
    await newPlayerResult.save();

    return successResponse(
      res,
      null,
      "Created player result successfully",
      201
    );
  } catch (error) {
    return next(error);
  }
};

// Lấy kết quả cầu thủ theo mùa giải và ngày
const getPlayerResultbySeasonIdAndDate = async (req, res, next) => {
  const { seasonid } = req.params;
  const { date } = req.body;
  try {
    const { success, error } = GetPlayerResultBySeasonIdAndDateSchema.safeParse(
      { seasonid, date }
    );
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);

    const playerResults = await PlayerResult.aggregate([
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
          latestResult: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestResult" },
      },
    ]);

    if (!playerResults.length) {
      const error = new Error(
        "No player results found for this season and date"
      );
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      playerResults,
      "Latest player results retrieved successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Lấy kết quả cầu thủ theo id
const getPlayerResultsById = async (req, res, next) => {
  const { playerid } = req.params;
  try {
    const { success, error } = PlayerIdSchema.safeParse({ playerid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_player_id = new mongoose.Types.ObjectId(playerid);
    const playerResult = await PlayerResult.findOne({
      player_id: Check_player_id,
    });
    if (!playerResult) {
      const error = new Error("Player result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      playerResult,
      "Player result found successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Cập nhật kết quả cầu thủ sau trận đấu
const updatePlayerResultsafterMatch = async (req, res, next) => {
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
    const goalDetails = match.goalDetails || [];
    if (!match.season_id) {
      const error = new Error("Match season_id is required");
      error.status = 400;
      return next(error);
    }

    const updateTeamResults = async (teamId) => {
      const players = await Player.find({ team_id: teamId });
      const bulkOps = [];

      for (let player of players) {
        const PlayerID = player._id;
        const goalsScored = goalDetails.filter((goal) =>
          new mongoose.Types.ObjectId(goal.player_id).equals(PlayerID)
        ).length;

        const existingResult = await PlayerResult.findOne({
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
          const latestResult = await PlayerResult.findOne({
            player_id: PlayerID,
            date: { $lt: matchDate },
          }).sort({ date: -1 });

          const baseResult = latestResult || {
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

      if (bulkOps.length > 0) {
        await PlayerResult.bulkWrite(bulkOps);
      }
    };

    await updateTeamResults(match.team1);
    await updateTeamResults(match.team2);

    return successResponse(res, null, "Updated player result successfully");
  } catch (error) {
    return next(error);
  }
};

// Cập nhật kết quả cầu thủ thủ công
const updatePlayerResults = async (req, res, next) => {
  const { id } = req.params;
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
  try {
    const { success: idSuccess, error: idError } =
      PlayerResultIdSchema.safeParse({ id });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const { success, error } = UpdatePlayerResultSchema.safeParse({
      season_id,
      player_id,
      team_id,
      matchesplayed,
      totalGoals,
      assists,
      yellowCards,
      redCards,
      date,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const updatePlayerResult = {};
    if (season_id)
      updatePlayerResult.season_id = new mongoose.Types.ObjectId(season_id);
    if (player_id)
      updatePlayerResult.player_id = new mongoose.Types.ObjectId(player_id);
    if (team_id)
      updatePlayerResult.team_id = new mongoose.Types.ObjectId(team_id);
    if (matchesplayed !== undefined)
      updatePlayerResult.matchesplayed = matchesplayed;
    if (totalGoals !== undefined) updatePlayerResult.totalGoals = totalGoals;
    if (assists !== undefined) updatePlayerResult.assists = assists;
    if (yellowCards !== undefined) updatePlayerResult.yellowCards = yellowCards;
    if (redCards !== undefined) updatePlayerResult.redCards = redCards;
    if (date) {
      const newDate = new Date(date);
      newDate.setUTCHours(0, 0, 0, 0);
      updatePlayerResult.date = newDate;
    }

    const result = await PlayerResult.updateOne(
      { _id: PlayerResultID },
      { $set: updatePlayerResult }
    );
    if (result.matchedCount === 0) {
      const error = new Error("Player result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, null, "Updated player result successfully");
  } catch (error) {
    return next(error);
  }
};

// Xóa kết quả cầu thủ
const deletePlayerResults = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = PlayerResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const PlayerResultID = new mongoose.Types.ObjectId(id);
    const playerResult = await PlayerResult.findById(PlayerResultID);
    if (!playerResult) {
      const error = new Error("Player result not found");
      error.status = 404;
      return next(error);
    }

    await PlayerResult.deleteOne({ _id: PlayerResultID });
    return successResponse(res, null, "Player result deleted successfully");
  } catch (error) {
    return next(error);
  }
};

export {
  createPlayerResults,
  getPlayerResultbySeasonIdAndDate,
  getPlayerResultsById,
  updatePlayerResultsafterMatch,
  updatePlayerResults,
  deletePlayerResults,
};
