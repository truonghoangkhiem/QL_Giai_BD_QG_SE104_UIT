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

const updateTeamResultsForDateInternal = async (teamId, seasonId, dateToUpdate, regulationRules) => {
  const Check_team_id = new mongoose.Types.ObjectId(teamId);
  const Check_season_id = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateToUpdate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const latestTeamResultBeforeDate = await TeamResult.findOne({
    team_id: Check_team_id,
    season_id: Check_season_id,
    date: { $lt: targetDate },
  }).sort({ date: -1 });

  const baseResult = latestTeamResultBeforeDate
    ? {
        matchplayed: latestTeamResultBeforeDate.matchplayed,
        wins: latestTeamResultBeforeDate.wins,
        draws: latestTeamResultBeforeDate.draws,
        losses: latestTeamResultBeforeDate.losses,
        goalsFor: latestTeamResultBeforeDate.goalsFor,
        goalsAgainst: latestTeamResultBeforeDate.goalsAgainst,
        points: latestTeamResultBeforeDate.points,
        goalsForAway: latestTeamResultBeforeDate.goalsForAway,
        headToHeadPoints: new Map(latestTeamResultBeforeDate.headToHeadPoints),
      }
    : {
        matchplayed: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0, goalsForAway: 0,
        headToHeadPoints: new Map(),
      };

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23,59,59,999);

  const matchesOnTargetDate = await Match.find({
    season_id: Check_season_id,
    date: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ team1: Check_team_id }, { team2: Check_team_id }],
    score: { $ne: null, $regex: /^\d+-\d+$/ } // Chỉ lấy các trận đã có tỉ số hợp lệ
  });

  let dailyMatchesPlayed = 0;
  let dailyWins = 0;
  let dailyDraws = 0;
  let dailyLosses = 0;
  let dailyGoalsFor = 0;
  let dailyGoalsAgainst = 0;
  let dailyGoalsForAway = 0;
  const dailyHeadToHeadPoints = new Map(baseResult.headToHeadPoints);

  const { winPoints, drawPoints, losePoints } = regulationRules;

  for (const m of matchesOnTargetDate) {
    // Kiểm tra lại score một lần nữa để chắc chắn
    if (!m.score || !/^\d+-\d+$/.test(m.score)) {
        continue; // Bỏ qua trận này nếu score không hợp lệ
    }
    dailyMatchesPlayed +=1;
    const [s1, s2] = m.score.split('-').map(Number);
    let currentTeamScore, currentOpponentScore, opponentIdObj, opponentIdStr, isHome;

    if (m.team1.equals(Check_team_id)) {
      currentTeamScore = s1;
      currentOpponentScore = s2;
      opponentIdObj = m.team2;
      isHome = true;
    } else { 
      currentTeamScore = s2;
      currentOpponentScore = s1;
      opponentIdObj = m.team1;
      isHome = false;
    }
    opponentIdStr = opponentIdObj.toString();

    dailyGoalsFor += currentTeamScore;
    dailyGoalsAgainst += currentOpponentScore;
    if (!isHome) {
      dailyGoalsForAway += currentTeamScore;
    }
    
    let h2hPointsForThisMatch = 0;
    if (currentTeamScore > currentOpponentScore) {
      dailyWins += 1;
      h2hPointsForThisMatch = winPoints;
    } else if (currentTeamScore < currentOpponentScore) {
      dailyLosses += 1;
      h2hPointsForThisMatch = losePoints;
    } else {
      dailyDraws += 1;
      h2hPointsForThisMatch = drawPoints;
    }
    dailyHeadToHeadPoints.set(opponentIdStr, (baseResult.headToHeadPoints.get(opponentIdStr) || 0) + h2hPointsForThisMatch);
  }
  
  const finalStats = {
    matchplayed: baseResult.matchplayed + dailyMatchesPlayed,
    wins: baseResult.wins + dailyWins,
    draws: baseResult.draws + dailyDraws,
    losses: baseResult.losses + dailyLosses,
    goalsFor: baseResult.goalsFor + dailyGoalsFor,
    goalsAgainst: baseResult.goalsAgainst + dailyGoalsAgainst,
    goalsDifference: (baseResult.goalsFor + dailyGoalsFor) - (baseResult.goalsAgainst + dailyGoalsAgainst),
    points: baseResult.points + (dailyWins * winPoints) + (dailyDraws * drawPoints) + (dailyLosses * losePoints),
    goalsForAway: baseResult.goalsForAway + dailyGoalsForAway,
    headToHeadPoints: dailyHeadToHeadPoints,
    date: targetDate,
    team_id: Check_team_id,
    season_id: Check_season_id,
  };

  await TeamResult.findOneAndUpdate(
    { team_id: Check_team_id, season_id: Check_season_id, date: targetDate },
    { $set: finalStats },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const updateTeamResultsByMatch = async (req, res, next) => {
  const { matchid } = req.params;
  try {
    const { success: validMatchId, error: matchIdError } = MatchIdSchema.safeParse({ matchid });
    if (!validMatchId) {
      const validationError = new Error(matchIdError.errors[0].message);
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

    // Nếu trận đấu chưa có tỉ số (score is null), không làm gì cả
    if (match.score === null || !/^\d+-\d+$/.test(match.score)) {
        return successResponse(res, null, "Match has no score, team results not updated.");
    }

    const { team1, team2, season_id, date: matchDate } = match;
    const normalizedMatchDate = new Date(matchDate);
    normalizedMatchDate.setUTCHours(0, 0, 0, 0);

    const seasonRegulation = await Regulation.findOne({
      season_id: season_id,
      regulation_name: "Ranking Rules",
    });

    if (!seasonRegulation || !seasonRegulation.rules) {
      const err = new Error("Ranking Regulation not found for the season or rules are not defined.");
      err.status = 404;
      return next(err);
    }
    const regulationRules = {
        winPoints: seasonRegulation.rules.winPoints || 3,
        drawPoints: seasonRegulation.rules.drawPoints || 1,
        losePoints: seasonRegulation.rules.losePoints || 0,
    };

    await updateTeamResultsForDateInternal(team1, season_id, normalizedMatchDate, regulationRules);
    await updateTeamResultsForDateInternal(team2, season_id, normalizedMatchDate, regulationRules);

    const subsequentTeamResultDatesTeam1 = await TeamResult.find({
      team_id: team1,
      season_id: season_id,
      date: { $gt: normalizedMatchDate },
    }).distinct('date');

    const subsequentTeamResultDatesTeam2 = await TeamResult.find({
      team_id: team2,
      season_id: season_id,
      date: { $gt: normalizedMatchDate },
    }).distinct('date');
    
    const allSubsequentDatesToRecalculate = [...new Set([
        ...subsequentTeamResultDatesTeam1.map(d => new Date(d).toISOString()),
        ...subsequentTeamResultDatesTeam2.map(d => new Date(d).toISOString())
    ])].sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of allSubsequentDatesToRecalculate) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);
      const team1HasResultOnThisDate = await TeamResult.findOne({ team_id: team1, season_id: season_id, date: dateToRecalculate});
      if (team1HasResultOnThisDate) {
        await updateTeamResultsForDateInternal(team1, season_id, dateToRecalculate, regulationRules);
      }
      const team2HasResultOnThisDate = await TeamResult.findOne({ team_id: team2, season_id: season_id, date: dateToRecalculate});
      if (team2HasResultOnThisDate) {
        await updateTeamResultsForDateInternal(team2, season_id, dateToRecalculate, regulationRules);
      }
    }

    return successResponse(res, null, "Team results updated successfully, including subsequent dates.");
  } catch (error) {
    console.error("Error in updateTeamResultsByMatch:", error);
    return next(error);
  }
};

// Thêm kết quả đội bóng
const createTeamResults = async (req, res, next) => {
  const { team_id, season_id } = req.body;
  try {
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
    
    const currentDate = new Date(season.start_date); // Khởi tạo với ngày bắt đầu mùa giải
    currentDate.setUTCHours(0, 0, 0, 0);

    const checkExistForDate = await TeamResult.findOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      date: currentDate, 
    });

    if (checkExistForDate) {
      const error = new Error("Team result for this initial date already exists");
      error.status = 400;
      return next(error);
    }

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
      headToHeadPoints: new Map(),
      date: currentDate,
    });
    await newTeamResult.save();

    return successResponse(res, null, "Created team result successfully", 201);
  } catch (error) {
    return next(error);
  }
};

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
      return successResponse(res, [], "No team results found for this season");
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
    }).sort({date: -1});

    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      team_result._id, 
      "Fetched latest team result ID successfully"
    );
  } catch (error) {
    return next(error);
  }
};

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