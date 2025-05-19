import Match from "../../../../models/Match.js";
import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js"; // Thêm Player model
import Regulation from "../../../../models/Regulation.js";
import TeamResult from "../../../../models/TeamResult.js"; // Thêm TeamResult model
import Ranking from "../../../../models/Ranking.js";       // Thêm Ranking model
import PlayerResult from "../../../../models/PlayerResult.js"; // Thêm PlayerResult model
import PlayerRanking from "../../../../models/PlayerRanking.js"; // Thêm PlayerRanking model

import {
  createMatchSchema,
  updateMatchSchema,
  MatchIdSchema, // Đảm bảo MatchIdSchema được import nếu dùng cho params.id
} from "../../../../schemas/matchSchema.js";
import { TeamIdSchema } from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import mongoose from "mongoose";

// Import các hàm helper từ các controller khác
import { updateTeamResultsForDateInternal } from "../team/team_resultsController.js";
import { calculateAndSaveTeamRankings } from "../team/rankingController.js";
import { updatePlayerResultsForDateInternal } from "../player/player_resultsController.js";
import { calculateAndSavePlayerRankings } from "../player/player_rankingsController.js";


// GET all matches
const getMatches = async (req, res, next) => {
  try {
    const matches = await Match.find().populate("team1 team2 season_id");
    return successResponse(res, matches, "Fetched all matches successfully");
  } catch (error) {
    return next(error);
  }
};

// GET match by ID
const getMatchesById = async (req, res, next) => {
  try {
    // Validate req.params.id bằng MatchIdSchema
    const validationResult = MatchIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
        const error = new Error(validationResult.error.errors[0].message);
        error.status = 400;
        return next(error);
    }
    const matchId = new mongoose.Types.ObjectId(validationResult.data.id);

    const match = await Match.findById(matchId).populate(
      "team1 team2 season_id goalDetails.player_id goalDetails.team_id" // Populate thêm goalDetails
    );
    if (!match) {
      return next(Object.assign(new Error("Match not found"), { status: 404 }));
    }
    return successResponse(res, match, "Match found successfully");
  } catch (error) {
    return next(error);
  }
};

// CREATE match schedule
const createMatch = async (req, res, next) => {
  const parseResult = createMatchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }

  const { season_id, matchperday } = parseResult.data;
  const session = await mongoose.startSession(); // Bắt đầu session
  session.startTransaction();

  try {
    const season = await Season.findById(season_id).session(session);
    if (!season) {
      throw Object.assign(new Error("Season not found"), { status: 404 });
    }

    const teamsInSeason = await Team.find({ season_id }).session(session);
    if (teamsInSeason.length < 2) {
      throw Object.assign(new Error("Not enough teams for a match schedule (minimum 2 teams required)."), {
        status: 400,
      });
    }

    const matchRegulation = await Regulation.findOne({
      season_id: season_id,
      regulation_name: "Match Rules",
    }).session(session);

    let actualMatchRounds = 2; 
    if (matchRegulation && typeof matchRegulation.rules?.matchRounds === 'number' && matchRegulation.rules.matchRounds > 0) {
      actualMatchRounds = matchRegulation.rules.matchRounds;
    } else {
      console.warn(`Match Rules regulation not found or 'matchRounds' not specified/invalid for season ${season_id}. Defaulting to ${actualMatchRounds} rounds.`);
    }
     if (actualMatchRounds <= 0) {
        throw Object.assign(new Error("Match rounds from regulation must be a positive number."), { status: 400 });
    }

    const schedule = [];
    const dailyMatchCount = {}; 
    const teamPlayedOnDate = {}; 
    
    let scheduleStartDate = new Date(season.start_date);
    scheduleStartDate.setUTCHours(0, 0, 0, 0);
    const seasonEndDate = new Date(season.end_date);
    seasonEndDate.setUTCHours(0, 0, 0, 0);

    const allPairings = [];
    if (actualMatchRounds === 1) {
        for (let i = 0; i < teamsInSeason.length; i++) {
            for (let j = i + 1; j < teamsInSeason.length; j++) {
                allPairings.push({ homeTeam: teamsInSeason[i], awayTeam: teamsInSeason[j] });
            }
        }
    } else { 
        for (let i = 0; i < teamsInSeason.length; i++) {
            for (let j = 0; j < teamsInSeason.length; j++) {
                if (i === j) continue;
                allPairings.push({ homeTeam: teamsInSeason[i], awayTeam: teamsInSeason[j] });
            }
        }
        if (actualMatchRounds > 2) {
            console.warn(`Current scheduling logic for actualMatchRounds > 2 (value: ${actualMatchRounds}) will effectively create a standard double round-robin schedule.`);
        }
    }
    
    for (let i = allPairings.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPairings[i], allPairings[j]] = [allPairings[j], allPairings[i]];
    }

    let currentSchedulingDateAttempt = new Date(scheduleStartDate);

    for (const pairing of allPairings) {
        const homeTeam = pairing.homeTeam;
        const awayTeam = pairing.awayTeam;
        let scheduledMatchDate = null;
        let searchDate = new Date(currentSchedulingDateAttempt); 

        while (searchDate <= seasonEndDate) {
            const dateString = searchDate.toISOString().split('T')[0];
            const matchesTodayCount = dailyMatchCount[dateString] || 0;
            const teamsPlayingToday = teamPlayedOnDate[dateString] || new Set();

            if (matchesTodayCount < matchperday &&
                !teamsPlayingToday.has(homeTeam._id.toString()) &&
                !teamsPlayingToday.has(awayTeam._id.toString())) {
                
                scheduledMatchDate = new Date(searchDate);
                
                schedule.push({
                    season_id,
                    team1: homeTeam._id, 
                    team2: awayTeam._id, 
                    date: scheduledMatchDate,
                    stadium: homeTeam.stadium, 
                    score: null,
                    goalDetails: [],
                });

                dailyMatchCount[dateString] = matchesTodayCount + 1;
                if (!teamPlayedOnDate[dateString]) teamPlayedOnDate[dateString] = new Set();
                teamPlayedOnDate[dateString].add(homeTeam._id.toString());
                teamPlayedOnDate[dateString].add(awayTeam._id.toString());
                
                if ((dailyMatchCount[dateString] || 0) >= matchperday) {
                     currentSchedulingDateAttempt = new Date(searchDate);
                     currentSchedulingDateAttempt.setDate(currentSchedulingDateAttempt.getDate() + 1);
                } else {
                    currentSchedulingDateAttempt = new Date(searchDate); 
                }
                break; 
            }
            searchDate.setDate(searchDate.getDate() + 1);
        }

        if (!scheduledMatchDate) {
            console.warn(`Could not schedule match for ${homeTeam.team_name} (H) vs ${awayTeam.team_name} (A).`);
        }
    }
    
    const expectedTotalMatches = actualMatchRounds === 1 
                             ? teamsInSeason.length * (teamsInSeason.length - 1) / 2 
                             : teamsInSeason.length * (teamsInSeason.length - 1);

    if (schedule.length === 0 && teamsInSeason.length >=2 && allPairings.length > 0) {
         throw Object.assign(new Error(`Failed to generate any matches. Expected ${expectedTotalMatches}.`), { status: 400 });
    }
    
    let responseMessage = `Created ${schedule.length} matches successfully.`;
    let responseData = { createdMatchesCount: schedule.length, schedule };

    if (schedule.length < expectedTotalMatches) {
         const warning = `Warning: Only ${schedule.length} out of ${expectedTotalMatches} expected matches could be scheduled.`;
         console.warn(warning);
         responseMessage = `Created ${schedule.length} matches with warnings. Expected ${expectedTotalMatches}.`;
         responseData.warning = warning;
    }

    if (schedule.length > 0) {
        await Match.insertMany(schedule, { session }); // Thêm session
    }
    
    await session.commitTransaction(); // Commit transaction
    session.endSession();
    return successResponse(res, responseData, responseMessage, 201);

  } catch (error) {
    await session.abortTransaction(); // Rollback nếu có lỗi
    session.endSession();
    console.error("Error in createMatch:", error);
    return next(error);
  }
};


// GET matches by season
const getMatchesBySeasonId = async (req, res, next) => {
  const season_id_param = req.params.season_id; // Đổi tên để tránh xung đột
  const { success, error } = SeasonIdSchema.safeParse({ id: season_id_param });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }

  try {
    let SeasonId = new mongoose.Types.ObjectId(season_id_param);

    const matches = await Match.aggregate([
      { $match: { season_id: SeasonId } },
      { $lookup: { from: 'teams', localField: 'team1', foreignField: '_id', as: 'team1_data'} },
      { $lookup: { from: 'teams', localField: 'team2', foreignField: '_id', as: 'team2_data'} },
      { $unwind: { path: '$team1_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$team2_data', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id',
          season_id: 1,
          team1: { _id: '$team1_data._id', team_name: { $ifNull: ['$team1_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team1_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          team2: { _id: '$team2_data._id', team_name: { $ifNull: ['$team2_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team2_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          date: 1, stadium: 1, score: 1, goalDetails: 1, _id: 0, 
        },
      },
      { $sort: { date: 1 } },
    ]);

    if (!matches || matches.length === 0) {
      return successResponse(res, [], "No matches found for this season");
    }

    return successResponse(res, matches, 'Fetched all matches by season ID successfully');
  } catch (error) {
    return next(error);
  }
};

// UPDATE match
const updateMatch = async (req, res, next) => {
  const parseResult = updateMatchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validationResult = MatchIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
        throw Object.assign(new Error(validationResult.error.errors[0].message), { status: 400 });
    }
    const matchId = new mongoose.Types.ObjectId(validationResult.data.id);


    const match = await Match.findById(matchId).session(session);
    if (!match) {
      throw Object.assign(new Error("Match not found"), { status: 404 });
    }
      
    const updateFields = parseResult.data;

    // Xử lý score rỗng hoặc undefined
    if (updateFields.score === '' || updateFields.score === undefined) {
        updateFields.score = null; // Chuẩn hóa thành null
    }

    // Validate goalDetails nếu có score và score hợp lệ
    if (updateFields.goalDetails && updateFields.score && /^\d+-\d+$/.test(updateFields.score)) {
      const regulation = await Regulation.findOne({
        season_id: match.season_id,
        regulation_name: "Goal Rules",
      }).session(session);
      const maxTime = regulation?.rules?.goalTimeLimit?.maxMinute;
      const allowedTypes = regulation?.rules?.goalTypes || [];

      for (const goal of updateFields.goalDetails) {
        if(!mongoose.Types.ObjectId.isValid(goal.player_id) || !mongoose.Types.ObjectId.isValid(goal.team_id)) {
            throw Object.assign(new Error("Invalid player_id or team_id in goalDetails"), { status: 400 });
        }
        if (maxTime !== undefined && goal.minute > maxTime) {
          throw Object.assign(new Error("Goal minute exceeds regulation limit"), { status: 400 });
        }
        if (allowedTypes.length > 0 && !allowedTypes.includes(goal.goalType)) {
          throw Object.assign(new Error(`Invalid goal type: ${goal.goalType}. Allowed: ${allowedTypes.join(', ')}`), { status: 400 });
        }
      }
    } else if (updateFields.score === null || updateFields.score === '') {
        // Nếu score bị xóa hoặc rỗng, xóa luôn goalDetails
        updateFields.goalDetails = [];
    }
    
    // Lưu các giá trị cũ của trận đấu nếu nó có score
    const oldScore = match.score;
    const hadScore = oldScore !== null && /^\d+-\d+$/.test(oldScore);

    await Match.updateOne({ _id: matchId }, { $set: updateFields }, { session });
    const updatedMatch = await Match.findById(matchId).populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id").session(session);

    // --- LOGIC TÍNH TOÁN LẠI ---
    // Chỉ tính toán lại nếu score của trận đấu thay đổi hoặc được thêm/xóa
    const newScore = updatedMatch.score;
    const hasNewScore = newScore !== null && /^\d+-\d+$/.test(newScore);
    const scoreChangedOrAddedOrRemoved = oldScore !== newScore || (hadScore && !hasNewScore) || (!hadScore && hasNewScore);


    if (scoreChangedOrAddedOrRemoved) {
        const seasonId = updatedMatch.season_id._id; // Lấy ObjectId
        const matchDate = new Date(updatedMatch.date);
        matchDate.setUTCHours(0, 0, 0, 0);

        const team1Id = updatedMatch.team1._id;
        const team2Id = updatedMatch.team2._id;

        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(session);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw Object.assign(new Error("Ranking Regulation not found for the season."), { status: 500 });
        }
        const teamRegulationRules = {
            winPoints: rankingRegulation.rules.winPoints || 3,
            drawPoints: rankingRegulation.rules.drawPoints || 1,
            losePoints: rankingRegulation.rules.losePoints || 0,
        };

        // 1. Cập nhật TeamResult cho ngày hiện tại và các ngày sau đó
        await updateTeamResultsForDateInternal(team1Id, seasonId, matchDate, teamRegulationRules, session);
        await updateTeamResultsForDateInternal(team2Id, seasonId, matchDate, teamRegulationRules, session);
        
        const subsequentTeamResultDatesTeam1 = await TeamResult.find({ team_id: team1Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const subsequentTeamResultDatesTeam2 = await TeamResult.find({ team_id: team2Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const allTeamSubsequentDates = [...new Set([...subsequentTeamResultDatesTeam1, ...subsequentTeamResultDatesTeam2])].sort((a,b) => new Date(a) - new Date(b));

        for (const dateStrToRecalculate of allTeamSubsequentDates) {
            const dateToRecalculate = new Date(dateStrToRecalculate);
             await updateTeamResultsForDateInternal(team1Id, seasonId, dateToRecalculate, teamRegulationRules, session);
             await updateTeamResultsForDateInternal(team2Id, seasonId, dateToRecalculate, teamRegulationRules, session);
        }

        // 2. Cập nhật Ranking (BXH đội bóng) cho ngày hiện tại và các ngày sau đó
        await calculateAndSaveTeamRankings(seasonId, matchDate, session);
        const distinctRankingDatesAfter = await Ranking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSaveTeamRankings(seasonId, new Date(dateStrToRecalculate), session);
        }


        // 3. Cập nhật PlayerResult cho ngày hiện tại và các ngày sau đó
        const playersTeam1 = await Player.find({ team_id: team1Id }).session(session);
        const playersTeam2 = await Player.find({ team_id: team2Id }).session(session);
        const allPlayersInMatch = [...playersTeam1, ...playersTeam2];
        const allAffectedPlayerIds = allPlayersInMatch.map(p => p._id);

        for (const player of allPlayersInMatch) {
            await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, matchDate, session);
        }
        const subsequentPlayerResultDates = await PlayerResult.find({ player_id: { $in: allAffectedPlayerIds }, season_id: seasonId, date: { $gt: matchDate }}, null, {session}).distinct('date');
        for (const dateStrToRecalculate of subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b))) {
            for (const player of allPlayersInMatch) {
                 await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, new Date(dateStrToRecalculate), session);
            }
        }

        // 4. Cập nhật PlayerRanking (BXH cầu thủ) cho ngày hiện tại và các ngày sau đó
        await calculateAndSavePlayerRankings(seasonId, matchDate, session); // For player rankings
        const distinctPlayerRankingDatesAfter = await PlayerRanking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctPlayerRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSavePlayerRankings(seasonId, new Date(dateStrToRecalculate), session);
        }
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, updatedMatch, "Updated match and recalculated related data successfully");

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updateMatch:", error);
    return next(error);
  }
};


// DELETE match
const deleteMatch = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const validationResult = MatchIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
        throw Object.assign(new Error(validationResult.error.errors[0].message), { status: 400 });
    }
    const matchId = new mongoose.Types.ObjectId(validationResult.data.id);

    const matchToDelete = await Match.findById(matchId).session(session);
    if (!matchToDelete) {
      throw Object.assign(new Error("Match not found"), { status: 404 });
    }

    const { season_id: seasonIdObj, team1: team1IdObj, team2: team2IdObj, date: matchDateRaw, score: deletedMatchScore } = matchToDelete;
    const seasonId = seasonIdObj._id; // Lấy ObjectId
    const team1Id = team1IdObj._id;
    const team2Id = team2IdObj._id;
    const matchDate = new Date(matchDateRaw);
    matchDate.setUTCHours(0, 0, 0, 0);
    
    const wasScoredMatch = deletedMatchScore !== null && /^\d+-\d+$/.test(deletedMatchScore);

    // Xóa trận đấu
    await Match.deleteOne({ _id: matchId }, { session });

    // Nếu trận đấu đã có tỉ số thì mới cần tính toán lại
    if (wasScoredMatch) {
        console.log(`Match ${matchId} was scored. Recalculating data...`);
        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(session);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw Object.assign(new Error("Ranking Regulation not found for the season."), { status: 500 });
        }
        const teamRegulationRules = {
            winPoints: rankingRegulation.rules.winPoints || 3,
            drawPoints: rankingRegulation.rules.drawPoints || 1,
            losePoints: rankingRegulation.rules.losePoints || 0,
        };

        // 1. Tính toán lại TeamResult cho ngày trận đấu bị xóa và các ngày sau đó
        await updateTeamResultsForDateInternal(team1Id, seasonId, matchDate, teamRegulationRules, session);
        await updateTeamResultsForDateInternal(team2Id, seasonId, matchDate, teamRegulationRules, session);
        
        const subsequentTeamResultDatesTeam1 = await TeamResult.find({ team_id: team1Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const subsequentTeamResultDatesTeam2 = await TeamResult.find({ team_id: team2Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const allTeamSubsequentDates = [...new Set([...subsequentTeamResultDatesTeam1, ...subsequentTeamResultDatesTeam2])].sort((a,b) => new Date(a) - new Date(b));

        for (const dateStrToRecalculate of allTeamSubsequentDates) {
            const dateToRecalculate = new Date(dateStrToRecalculate);
             await updateTeamResultsForDateInternal(team1Id, seasonId, dateToRecalculate, teamRegulationRules, session);
             await updateTeamResultsForDateInternal(team2Id, seasonId, dateToRecalculate, teamRegulationRules, session);
        }

        // 2. Tính toán lại Ranking (BXH đội bóng)
        await calculateAndSaveTeamRankings(seasonId, matchDate, session);
        const distinctRankingDatesAfter = await Ranking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSaveTeamRankings(seasonId, new Date(dateStrToRecalculate), session);
        }

        // 3. Tính toán lại PlayerResult
        const playersTeam1 = await Player.find({ team_id: team1Id }).session(session);
        const playersTeam2 = await Player.find({ team_id: team2Id }).session(session);
        const allPlayersInMatch = [...playersTeam1, ...playersTeam2];
        const allAffectedPlayerIds = allPlayersInMatch.map(p => p._id);

        for (const player of allPlayersInMatch) {
            await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, matchDate, session);
        }
        const subsequentPlayerResultDates = await PlayerResult.find({ player_id: { $in: allAffectedPlayerIds }, season_id: seasonId, date: { $gt: matchDate }}, null, {session}).distinct('date');
        for (const dateStrToRecalculate of subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b))) {
            for (const player of allPlayersInMatch) {
                 await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, new Date(dateStrToRecalculate), session);
            }
        }
        
        // 4. Tính toán lại PlayerRanking (BXH cầu thủ)
        await calculateAndSavePlayerRankings(seasonId, matchDate, session); // For player rankings
        const distinctPlayerRankingDatesAfter = await PlayerRanking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctPlayerRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSavePlayerRankings(seasonId, new Date(dateStrToRecalculate), session);
        }
    } else {
         console.log(`Match ${matchId} was not scored. No recalculation needed.`);
    }


    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Deleted match and recalculated related data successfully", 200); // 200 để có thể gửi body
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in deleteMatch:", error);
    return next(error);
  }
};

const getMatchesByTeamId = async (req, res, next) => {
  const team_id_param = req.params.team_id; // Đổi tên
  const { success, error } = TeamIdSchema.safeParse({ id: team_id_param });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }
  try {
    const TeamId = new mongoose.Types.ObjectId(team_id_param); // Sử dụng tên đã đổi
    const matches = await Match.find({
      $or: [{ team1: TeamId }, { team2: TeamId }],
    }).populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id"); // Populate goalDetails
    if (!matches || matches.length === 0) { 
      return successResponse(res, [], "No matches found for this team");
    }
    return successResponse(res, matches, "Match found successfully");
  } catch (error) {
    return next(error);
  }
};

const getMatchesBySeasonIdAndDate = async (req, res, next) => {
  const { season_id, date } = req.params;

  const { success, error } = SeasonIdSchema.safeParse({ id: season_id });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }

  try {
    const SeasonId = new mongoose.Types.ObjectId(season_id);
    const matchDate = new Date(date); 

    if (isNaN(matchDate.getTime())) {
      return next(
        Object.assign(new Error("Invalid date format"), { status: 400 })
      );
    }

    const startOfDay = new Date(matchDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(matchDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const matches = await Match.find({
      season_id: SeasonId,
      date: { $gte: startOfDay, $lte: endOfDay }, 
    }).populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id"); // Populate goalDetails

    if (!matches || matches.length === 0) {
      return successResponse(res, [], "No matches found for this season and date");
    }

    return successResponse(
      res,
      matches,
      "Fetched all matches by season ID and date successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export {
  getMatches,
  getMatchesById,
  createMatch,
  getMatchesBySeasonId,
  updateMatch,
  deleteMatch,
  getMatchesByTeamId,
  getMatchesBySeasonIdAndDate,
};