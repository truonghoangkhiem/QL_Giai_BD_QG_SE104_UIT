import TeamResult from "../../../../models/TeamResult.js";
import Team from "../../../../models/Team.js";
import Season from "../../../../models/Season.js";
import Match from "../../../../models/Match.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateTeamResultSchema,
  SeasonIdSchema,
  TeamResultIdSchema,
  GetIdSchema,
  MatchIdSchema,
} from "../../../../schemas/teamResultSchema.js";
import mongoose from "mongoose";

// Thêm kết quả đội bóng
const createTeamResults = async (req, res, next) => {
  const { team_id, season_id } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = CreateTeamResultSchema.safeParse({
      team_id,
      season_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_team_id = new mongoose.Types.ObjectId(team_id);
    const Check_season_id = new mongoose.Types.ObjectId(season_id);

    const team = await Team.findById(Check_team_id);
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    const season = await Season.findById(Check_season_id);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    const checkExist = await TeamResult.findOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
    });
    if (checkExist) {
      const error = new Error("Team result already exists");
      error.status = 400;
      return next(error);
    }

    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    const newTeamResult = new TeamResult({
      team_id: Check_team_id,
      season_id: Check_season_id,
      matchplayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalsDifference: 0,
      points: 0,
      goalsForAway: 0,
      headToHeadPoints: {},
      date: currentDate,
    });
    await newTeamResult.save();

    return successResponse(res, null, "Created team result successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// Lấy kết quả đội bóng theo mùa giải
const getTeamResultsbySeasonId = async (req, res, next) => {
  const { season_id } = req.params;
  try {
    const { success, error } = SeasonIdSchema.safeParse({ season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const team_results = await TeamResult.find({ season_id: Check_season_id });
    if (!team_results || team_results.length === 0) {
      const error = new Error("Team results not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      team_results,
      "Fetched team results successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Lấy kết quả đội bóng theo ID
const getTeamResultsById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = TeamResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_id = new mongoose.Types.ObjectId(id);
    const team_result = await TeamResult.findById(Check_id);
    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, team_result, "Team result found successfully");
  } catch (error) {
    return next(error);
  }
};

// Lấy ID kết quả đội bóng
const getId = async (req, res, next) => {
  const { team_id, season_id } = req.params;
  try {
    const { success, error } = GetIdSchema.safeParse({ team_id, season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_team_id = new mongoose.Types.ObjectId(team_id);
    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const team_result = await TeamResult.findOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
    });
    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      team_result._id,
      "Fetched team result ID successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// Cập nhật kết quả đội bóng (hàm nội bộ)
const updateTeamResults = async (
  team_id,
  season_id,
  team_score,
  opponent_score,
  isHome,
  opponent_team_id,
  match_date
) => {
  const Check_team_id = new mongoose.Types.ObjectId(team_id);
  const Check_season_id = new mongoose.Types.ObjectId(season_id);
  const Check_opponent_team_id = new mongoose.Types.ObjectId(opponent_team_id);

  const currentDate = new Date(match_date);
  currentDate.setUTCHours(0, 0, 0, 0);

  const teamResultSameDay = await TeamResult.findOne({
    team_id: Check_team_id,
    season_id: Check_season_id,
    date: currentDate,
  });

  if (teamResultSameDay) {
    const updatedMatchesPlayed = teamResultSameDay.matchplayed + 1;
    const updatedGoalsFor = teamResultSameDay.goalsFor + team_score;
    const updatedGoalsAgainst = teamResultSameDay.goalsAgainst + opponent_score;
    const updatedGoalDifference = updatedGoalsFor - updatedGoalsAgainst;
    let updatedGoalsForAway = teamResultSameDay.goalsForAway;
    if (!isHome) {
      updatedGoalsForAway += team_score;
    }
    let updatedPoints = teamResultSameDay.points;
    let updatedWins = teamResultSameDay.wins;
    let updatedLosses = teamResultSameDay.losses;
    let updatedDraws = teamResultSameDay.draws;
    let updatedHeadToHeadPoints =
      teamResultSameDay.headToHeadPoints || new Map();
    const opponentKey = Check_opponent_team_id.toString();
    if (!updatedHeadToHeadPoints.has(opponentKey)) {
      updatedHeadToHeadPoints.set(opponentKey, 0);
    }

    const seasonRegulation = await Regulation.findOne({
      season_id: Check_season_id,
      regulation_name: "Ranking Rules",
    });
    if (!seasonRegulation) {
      throw new Error("Regulation not found");
    }
    const pointforwin = seasonRegulation.rules.winPoints;
    const pointfordraw = seasonRegulation.rules.drawPoints;
    const pointforloss = seasonRegulation.rules.losePoints;

    if (team_score > opponent_score) {
      updatedPoints += pointforwin;
      updatedWins += 1;
      updatedHeadToHeadPoints.set(
        opponentKey,
        updatedHeadToHeadPoints.get(opponentKey) + 3
      );
    } else if (team_score < opponent_score) {
      updatedPoints += pointforloss;
      updatedLosses += 1;
      updatedHeadToHeadPoints.set(
        opponentKey,
        updatedHeadToHeadPoints.get(opponentKey) + 0
      );
    } else {
      updatedPoints += pointfordraw;
      updatedDraws += 1;
      updatedHeadToHeadPoints.set(
        opponentKey,
        updatedHeadToHeadPoints.get(opponentKey) + 1
      );
    }

    await TeamResult.updateOne(
      { team_id: Check_team_id, season_id: Check_season_id, date: currentDate },
      {
        $set: {
          matchplayed: updatedMatchesPlayed,
          goalsFor: updatedGoalsFor,
          goalsAgainst: updatedGoalsAgainst,
          goalsDifference: updatedGoalDifference,
          points: updatedPoints,
          wins: updatedWins,
          losses: updatedLosses,
          draws: updatedDraws,
          goalsForAway: updatedGoalsForAway,
          headToHeadPoints: updatedHeadToHeadPoints,
        },
      }
    );
  } else {
    const latestTeamResult = await TeamResult.findOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      date: { $lt: currentDate },
    }).sort({ date: -1 });

    const baseResult = latestTeamResult || null;
    const matchplayed = (baseResult?.matchplayed || 0) + 1;
    const goalsFor = (baseResult?.goalsFor || 0) + team_score;
    const goalsAgainst = (baseResult?.goalsAgainst || 0) + opponent_score;
    const goalsDifference = goalsFor - goalsAgainst;
    let goalsForAway = baseResult?.goalsForAway || 0;
    if (!isHome) {
      goalsForAway += team_score;
    }
    let points = baseResult?.points || 0;
    let wins = baseResult?.wins || 0;
    let losses = baseResult?.losses || 0;
    let draws = baseResult?.draws || 0;
    let headToHeadPoints = baseResult?.headToHeadPoints || new Map();
    const opponentKey = Check_opponent_team_id.toString();
    if (!headToHeadPoints.has(opponentKey)) {
      headToHeadPoints.set(opponentKey, 0);
    }

    const seasonRegulation = await Regulation.findOne({
      season_id: Check_season_id,
      regulation_name: "Ranking Rules",
    });
    if (!seasonRegulation) {
      throw new Error("Regulation not found");
    }
    const pointforwin = seasonRegulation.rules.winPoints;
    const pointfordraw = seasonRegulation.rules.drawPoints;
    const pointforloss = seasonRegulation.rules.losePoints;

    if (team_score > opponent_score) {
      points += pointforwin;
      wins += 1;
      headToHeadPoints.set(opponentKey, headToHeadPoints.get(opponentKey) + 3);
    } else if (team_score < opponent_score) {
      points += pointforloss;
      losses += 1;
      headToHeadPoints.set(opponentKey, headToHeadPoints.get(opponentKey) + 0);
    } else {
      points += pointfordraw;
      draws += 1;
      headToHeadPoints.set(opponentKey, headToHeadPoints.get(opponentKey) + 1);
    }

    const newTeamResult = new TeamResult({
      team_id: Check_team_id,
      season_id: Check_season_id,
      matchplayed,
      goalsFor,
      goalsAgainst,
      goalsDifference,
      points,
      wins,
      losses,
      draws,
      goalsForAway,
      headToHeadPoints,
      date: currentDate,
    });
    await newTeamResult.save();
  }
};

// Cập nhật kết quả đội bóng sau trận đấu
const updateTeamResultsByMatch = async (req, res, next) => {
  const { matchid } = req.params;
  try {
    const { success, error } = MatchIdSchema.safeParse({ matchid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const match_id = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(match_id);
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error);
    }

    const [team1_score, team2_score] = match.score.split("-").map(Number);
    const { team1, team2, season_id, date } = match;

    await updateTeamResults(
      team1,
      season_id,
      team1_score,
      team2_score,
      true,
      team2,
      date
    );
    await updateTeamResults(
      team2,
      season_id,
      team2_score,
      team1_score,
      false,
      team1,
      date
    );

    return successResponse(res, null, "Team results updated successfully");
  } catch (error) {
    return next(error);
  }
};

// Xóa kết quả đội bóng
const deleteTeamResults = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = TeamResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Check_id = new mongoose.Types.ObjectId(id);
    const team_result = await TeamResult.findById(Check_id);
    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      return next(error);
    }

    await TeamResult.deleteOne({ _id: Check_id });
    return successResponse(res, null, "Deleted team result successfully");
  } catch (error) {
    return next(error);
  }
};

export {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
  deleteTeamResults,
};
