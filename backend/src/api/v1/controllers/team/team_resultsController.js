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

// Đảm bảo hàm này có thể được gọi từ matchController
export const updateTeamResultsForDateInternal = async (teamId, seasonId, dateToUpdate, regulationRules, session = null) => {
  const Check_team_id = new mongoose.Types.ObjectId(teamId);
  const Check_season_id = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateToUpdate);
  targetDate.setUTCHours(0, 0, 0, 0);

  const queryOptions = session ? { session } : {};

  const latestTeamResultBeforeDate = await TeamResult.findOne({
    team_id: Check_team_id,
    season_id: Check_season_id,
    date: { $lt: targetDate },
  }, null, queryOptions).sort({ date: -1 });

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
    score: { $ne: null, $regex: /^\d+-\d+$/ }
  }, null, queryOptions);

  let dailyMatchesPlayed = 0;
  let dailyWins = 0;
  let dailyDraws = 0;
  let dailyLosses = 0;
  let dailyGoalsFor = 0;
  let dailyGoalsAgainst = 0;
  let dailyGoalsForAway = 0;
  // Khởi tạo dailyHeadToHeadPoints từ headToHeadPoints TÍCH LŨY trước đó,
  // nhưng chỉ cập nhật cho các đối thủ trong ngày.
  // Tuy nhiên, để đơn giản và đúng đắn hơn, H2H nên được tính lại toàn bộ dựa trên các trận giữa 2 đội.
  // Trong ngữ cảnh này, chúng ta đang cập nhật cho một ngày, H2H points nên được tính dựa trên trận đấu cụ thể trong ngày.
  const dailyHeadToHeadPoints = new Map(); // Map này sẽ lưu điểm H2H kiếm được CHỈ TRONG NGÀY này.

  const { winPoints, drawPoints, losePoints } = regulationRules;

  for (const m of matchesOnTargetDate) {
    if (!m.score || !/^\d+-\d+$/.test(m.score)) {
        continue;
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
    // Cập nhật H2H points cho đối thủ này trong ngày
    dailyHeadToHeadPoints.set(opponentIdStr, (dailyHeadToHeadPoints.get(opponentIdStr) || 0) + h2hPointsForThisMatch);
  }
  
  // Kết hợp H2H của ngày hiện tại với H2H tích lũy từ baseResult
  const combinedHeadToHeadPoints = new Map(baseResult.headToHeadPoints);
  dailyHeadToHeadPoints.forEach((points, opponentId) => {
      combinedHeadToHeadPoints.set(opponentId, (combinedHeadToHeadPoints.get(opponentId) || 0) + points);
  });


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
    headToHeadPoints: combinedHeadToHeadPoints, // Sử dụng H2H đã kết hợp
    date: targetDate,
    team_id: Check_team_id,
    season_id: Check_season_id,
  };

  await TeamResult.findOneAndUpdate(
    { team_id: Check_team_id, season_id: Check_season_id, date: targetDate },
    { $set: finalStats },
    { upsert: true, new: true, setDefaultsOnInsert: true, session } // Thêm session vào query options
  );
  console.log(`TeamResult for team ${teamId} on ${targetDate.toISOString().split("T")[0]} updated/created.`);
};


const updateTeamResultsByMatch = async (req, res, next) => {
  const { matchid } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success: validMatchId, error: matchIdError } = MatchIdSchema.safeParse({ matchid });
    if (!validMatchId) {
      const validationError = new Error(matchIdError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const match_id = new mongoose.Types.ObjectId(matchid);
    const match = await Match.findById(match_id).session(session);
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      throw error;
    }

    if (match.score === null || !/^\d+-\d+$/.test(match.score)) {
        await session.abortTransaction();
        session.endSession();
        return successResponse(res, null, "Match has no score, team results not updated.");
    }

    const { team1, team2, season_id, date: matchDate } = match;
    const normalizedMatchDate = new Date(matchDate);
    normalizedMatchDate.setUTCHours(0, 0, 0, 0);

    const seasonRegulation = await Regulation.findOne({
      season_id: season_id,
      regulation_name: "Ranking Rules",
    }).session(session);

    if (!seasonRegulation || !seasonRegulation.rules) {
      const err = new Error("Ranking Regulation not found for the season or rules are not defined.");
      err.status = 404;
      throw err;
    }
    const regulationRules = {
        winPoints: seasonRegulation.rules.winPoints || 3,
        drawPoints: seasonRegulation.rules.drawPoints || 1,
        losePoints: seasonRegulation.rules.losePoints || 0,
    };

    await updateTeamResultsForDateInternal(team1, season_id, normalizedMatchDate, regulationRules, session);
    await updateTeamResultsForDateInternal(team2, season_id, normalizedMatchDate, regulationRules, session);

    const subsequentTeamResultDatesTeam1 = await TeamResult.find({
      team_id: team1,
      season_id: season_id,
      date: { $gt: normalizedMatchDate },
    }, null, { session }).distinct('date');

    const subsequentTeamResultDatesTeam2 = await TeamResult.find({
      team_id: team2,
      season_id: season_id,
      date: { $gt: normalizedMatchDate },
    }, null, { session }).distinct('date');
    
    const allSubsequentDatesToRecalculate = [...new Set([
        ...subsequentTeamResultDatesTeam1.map(d => new Date(d).toISOString()),
        ...subsequentTeamResultDatesTeam2.map(d => new Date(d).toISOString())
    ])].sort((a,b) => new Date(a) - new Date(b));

    for (const dateStrToRecalculate of allSubsequentDatesToRecalculate) {
        const dateToRecalculate = new Date(dateStrToRecalculate);
        dateToRecalculate.setUTCHours(0,0,0,0);

      const team1HasResultOnThisDate = await TeamResult.findOne({ team_id: team1, season_id: season_id, date: dateToRecalculate}, null, { session });
      if (team1HasResultOnThisDate) {
        await updateTeamResultsForDateInternal(team1, season_id, dateToRecalculate, regulationRules, session);
      }
      const team2HasResultOnThisDate = await TeamResult.findOne({ team_id: team2, season_id: season_id, date: dateToRecalculate}, null, { session });
      if (team2HasResultOnThisDate) {
        await updateTeamResultsForDateInternal(team2, season_id, dateToRecalculate, regulationRules, session);
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Team results updated successfully, including subsequent dates.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updateTeamResultsByMatch:", error);
    return next(error);
  }
};

// Thêm kết quả đội bóng
const createTeamResults = async (req, res, next) => {
  const { team_id, season_id } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = CreateTeamResultSchema.safeParse({
      team_id,
      season_id,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const Check_team_id = new mongoose.Types.ObjectId(team_id);
    const Check_season_id = new mongoose.Types.ObjectId(season_id);

    const team = await Team.findById(Check_team_id).session(session);
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      throw error;
    }

    const season = await Season.findById(Check_season_id).session(session);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      throw error;
    }
    
    const currentDate = new Date(season.start_date); 
    currentDate.setUTCHours(0, 0, 0, 0);

    const checkExistForDate = await TeamResult.findOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      date: currentDate, 
    }).session(session);

    if (checkExistForDate) {
      const error = new Error("Team result for this initial date already exists");
      error.status = 400;
      throw error;
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
    await newTeamResult.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    return successResponse(res, newTeamResult, "Created team result successfully", 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
      // Thay vì 404, trả về mảng rỗng và thông báo
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
    }).sort({date: -1}); // Lấy bản ghi mới nhất theo ngày

    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(
      res,
      team_result._id, // Chỉ trả về ID
      "Fetched latest team result ID successfully"
    );
  } catch (error) {
    return next(error);
  }
};

const deleteTeamResults = async (req, res, next) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = TeamResultIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const Check_id = new mongoose.Types.ObjectId(id);
    const team_result = await TeamResult.findById(Check_id).session(session);
    if (!team_result) {
      const error = new Error("Team result not found");
      error.status = 404;
      throw error;
    }

    await TeamResult.deleteOne({ _id: Check_id }).session(session);
    
    // TODO: Sau khi xóa TeamResult, cần tính toán lại Ranking cho ngày đó và các ngày sau đó nếu cần.
    // Việc này tương tự như logic trong updateTeamResultsByMatch sau khi cập nhật TeamResult.
    // Hoặc có thể có một cơ chế tổng quát hơn để trigger recalculation.
    // For simplicity, this part is omitted here but should be considered for full data integrity.
    
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Deleted team result successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
  // updateTeamResultsForDateInternal, // Đã export ở trên
};