// File: backend/src/api/v1/controllers/match/matchController.js

import Match from "../../../../models/Match.js";
import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js";
import Regulation from "../../../../models/Regulation.js";
import TeamResult from "../../../../models/TeamResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import MatchLineup from "../../../../models/MatchLineup.js";

import {
  createMatchSchema,
  updateMatchSchema,
  MatchIdSchema,
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


// =================================================================
// HÀM CHẠY NGẦM ĐỂ TÍNH TOÁN LẠI DỮ LIỆU
// =================================================================
const recalculateSubsequentData = async (seasonId, matchDate, team1Id, team2Id, teamRegulationRules, allPlayerIdsInLineups) => {
    const backgroundSession = await mongoose.startSession();
    backgroundSession.startTransaction();
    try {
        console.log(`[BACKGROUND JOB] Starting recalculation for subsequent dates after ${matchDate.toISOString()}`);

        // --- 1. TÍNH TOÁN LẠI KẾT QUẢ ĐỘI CHO CÁC NGÀY TƯƠNG LAI ---
        const subsequentTeamResultDatesTeam1 = await TeamResult.find({ team_id: team1Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session: backgroundSession }).distinct('date');
        const subsequentTeamResultDatesTeam2 = await TeamResult.find({ team_id: team2Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session: backgroundSession }).distinct('date');
        const allTeamSubsequentDates = [...new Set([...subsequentTeamResultDatesTeam1, ...subsequentTeamResultDatesTeam2])].sort((a,b) => new Date(a) - new Date(b));

        for (const dateStrToRecalculate of allTeamSubsequentDates) {
            const dateToRecalculate = new Date(dateStrToRecalculate);
            await updateTeamResultsForDateInternal(team1Id, seasonId, dateToRecalculate, teamRegulationRules, backgroundSession);
            await updateTeamResultsForDateInternal(team2Id, seasonId, dateToRecalculate, teamRegulationRules, backgroundSession);
        }

        // --- 2. TÍNH TOÁN LẠI XẾP HẠNG ĐỘI CHO CÁC NGÀY TƯƠNG LAI ---
        const distinctRankingDatesAfter = await Ranking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, { session: backgroundSession }).distinct('date');
        const allDatesToRecalculateRanking = [...new Set([matchDate, ...distinctRankingDatesAfter])].sort((a,b) => new Date(a) - new Date(b));
        for (const dateToRecalculate of allDatesToRecalculateRanking) {
            await calculateAndSaveTeamRankings(seasonId, new Date(dateToRecalculate), backgroundSession);
        }
        
        // --- 3. TÍNH TOÁN LẠI KẾT QUẢ CẦU THỦ CHO CÁC NGÀY TƯƠNG LAI ---
        if (allPlayerIdsInLineups && allPlayerIdsInLineups.length > 0) {
            const playersToUpdate = await Player.find({ _id: { $in: allPlayerIdsInLineups.map(id => new mongoose.Types.ObjectId(id)) } }).session(backgroundSession);
            const subsequentPlayerResultDates = await PlayerResult.find({ player_id: { $in: playersToUpdate.map(p => p._id) }, season_id: seasonId, date: { $gt: matchDate }}, null, {session: backgroundSession}).distinct('date');
            for (const dateStrToRecalculate of subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b))) {
                for (const player of playersToUpdate) {
                    let playerTeamContextForSubsequent = player.team_id;
                    if (playerTeamContextForSubsequent) {
                        await updatePlayerResultsForDateInternal(player._id, playerTeamContextForSubsequent, seasonId, new Date(dateStrToRecalculate), backgroundSession);
                    }
                }
            }
        
            // --- 4. TÍNH TOÁN LẠI XẾP HẠNG CẦU THỦ CHO CÁC NGÀY TƯƠNG LAI ---
            const distinctPlayerRankingDatesAfter = await PlayerRanking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session: backgroundSession}).distinct('date');
            const allDatesToRecalculatePlayerRanking = [...new Set([matchDate, ...distinctPlayerRankingDatesAfter])].sort((a,b) => new Date(a) - new Date(b));

            for (const dateToRecalculate of allDatesToRecalculatePlayerRanking) {
                await calculateAndSavePlayerRankings(seasonId, new Date(dateToRecalculate), backgroundSession); 
            }
        }

        await backgroundSession.commitTransaction();
        console.log(`[BACKGROUND JOB] Recalculation completed successfully.`);
    } catch (error) {
        await backgroundSession.abortTransaction();
        console.error(`[BACKGROUND JOB] Error during subsequent data recalculation:`, error);
    } finally {
        backgroundSession.endSession();
    }
}


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
    const validationResult = MatchIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
        const error = new Error(validationResult.error.errors[0].message);
        error.status = 400;
        return next(error);
    }
    const matchId = new mongoose.Types.ObjectId(validationResult.data.id);

    const match = await Match.findById(matchId).populate(
      "team1 team2 season_id goalDetails.player_id goalDetails.team_id"
    );
    if (!match) {
      return next(Object.assign(new Error("Không tìm thấy trận đấu."), { status: 404 }));
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
        return next(Object.assign(new Error(parseResult.error.errors[0].message), { status: 400 }));
    }

    const { season_id, matchperday } = parseResult.data;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const season = await Season.findById(season_id).session(session);
        if (!season) {
            throw Object.assign(new Error("Season not found"), { status: 404 });
        }

        const teamsInSeason = await Team.find({ season_id }).session(session);
        const numTeams = teamsInSeason.length;
        if (numTeams < 2) {
            throw Object.assign(new Error("Không đủ đội trong mùa giải để tạo lịch thi đấu."), { status: 400 });
        }

        const ageRegulation = await Regulation.findOne({ season_id: season_id, regulation_name: "Age Regulation" }).session(session);
        if (!ageRegulation || !ageRegulation.rules || typeof ageRegulation.rules.minPlayersPerTeam !== 'number') {
            throw Object.assign(new Error("Quy định về 'Số cầu thủ tối thiểu mỗi đội' không được tìm thấy hoặc không hợp lệ."), { status: 400 });
        }
        const minPlayersRequiredForTeam = ageRegulation.rules.minPlayersPerTeam;
        for (const team of teamsInSeason) {
            const playerCount = await Player.countDocuments({ team_id: team._id }).session(session);
            if (playerCount < minPlayersRequiredForTeam) {
                throw Object.assign(new Error(`Đội ${team.team_name} chưa đăng ký đủ số lượng cầu thủ tối thiểu (${minPlayersRequiredForTeam} cầu thủ).`), { status: 400 });
            }
        }
        
        const matchRegulation = await Regulation.findOne({ season_id: season_id, regulation_name: "Match Rules" }).session(session);
        let actualMatchRounds = 2;
        if (matchRegulation && typeof matchRegulation.rules?.matchRounds === 'number' && matchRegulation.rules.matchRounds > 0) {
            actualMatchRounds = matchRegulation.rules.matchRounds;
        }

        // =========================================================================
        // PHẦN KIỂM TRA SỐ NGÀY TỐI THIỂU (ĐÁP ỨNG YÊU CẦU CỦA BẠN)
        // =========================================================================
        
        let totalMatchesToSchedule = 0;
        if (actualMatchRounds === 1) {
            totalMatchesToSchedule = numTeams * (numTeams - 1) / 2;
        } else {
            totalMatchesToSchedule = numTeams * (numTeams - 1);
        }
        
        const maxMatchesPerDayPossible = Math.floor(numTeams / 2);
        const effectiveMatchesPerDay = Math.min(matchperday, maxMatchesPerDayPossible);
        
        if (effectiveMatchesPerDay === 0) {
            throw Object.assign(new Error(`Không thể xếp lịch với ${numTeams} đội và ${matchperday} trận mỗi ngày.`), { status: 400 });
        }

        const daysRequired = Math.ceil(totalMatchesToSchedule / effectiveMatchesPerDay);

        const startDate = new Date(season.start_date);
        const endDate = new Date(season.end_date);
        const seasonDurationInDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        if (seasonDurationInDays < daysRequired) {
            throw Object.assign(new Error(`Mùa giải không đủ ngày để sắp lịch. Cần ít nhất ${daysRequired} ngày, nhưng mùa giải chỉ kéo dài ${seasonDurationInDays} ngày. Vui lòng kéo dài thời gian mùa giải.`), { status: 400 });
        }

        // =========================================================================
        // BẮT ĐẦU THUẬT TOÁN XẾP LỊCH CHI TIẾT
        // =========================================================================

        let matchesPool = [];
        for (let i = 0; i < teamsInSeason.length; i++) {
            for (let j = 0; j < teamsInSeason.length; j++) {
                if (i === j) continue;
                matchesPool.push({ team1: teamsInSeason[i], team2: teamsInSeason[j], stadium: teamsInSeason[i].stadium });
            }
        }
        
        if (actualMatchRounds === 1) {
            const uniquePairs = new Set();
            matchesPool = matchesPool.filter(match => {
                const sortedIds = [match.team1._id.toString(), match.team2._id.toString()].sort().join('-');
                if (uniquePairs.has(sortedIds)) return false;
                uniquePairs.add(sortedIds);
                return true;
            });
        }
        
        for (let i = matchesPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matchesPool[i], matchesPool[j]] = [matchesPool[j], matchesPool[i]];
        }
        
        const schedule = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate && matchesPool.length > 0) {
            const teamsBusyToday = new Set();
            let matchesScheduledToday = 0;
            
            for (let i = matchesPool.length - 1; i >= 0; i--) {
                if(matchesScheduledToday >= matchperday) break;

                const match = matchesPool[i];
                const team1Id = match.team1._id.toString();
                const team2Id = match.team2._id.toString();

                if (!teamsBusyToday.has(team1Id) && !teamsBusyToday.has(team2Id)) {
                    schedule.push({
                        season_id,
                        team1: match.team1._id,
                        team2: match.team2._id,
                        date: new Date(currentDate),
                        stadium: match.stadium,
                        score: null,
                        goalDetails: [],
                    });
                    teamsBusyToday.add(team1Id);
                    teamsBusyToday.add(team2Id);
                    matchesScheduledToday++;
                    matchesPool.splice(i, 1);
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (schedule.length < totalMatchesToSchedule) {
             throw Object.assign(new Error(`Tạo lịch thất bại. Đã xếp được ${schedule.length}/${totalMatchesToSchedule} trận. Có thể do cài đặt 'Số trận mỗi ngày' quá thấp hoặc một lỗi không mong muốn.`), { status: 400 });
        }

        await Match.insertMany(schedule, { session });

        await session.commitTransaction();
        session.endSession();
        return successResponse(res, { createdMatchesCount: schedule.length }, `Tạo thành công ${schedule.length} trận đấu.`, 201);

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("Error in createMatch:", error);
        return next(error);
    }
};


// GET matches by season
const getMatchesBySeasonId = async (req, res, next) => {
  const season_id_param = req.params.season_id;
  const { success, error } = SeasonIdSchema.safeParse({ id: season_id_param });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }

  try {
    let SeasonId = new mongoose.Types.ObjectId(season_id_param);

    const matches = await Match.find({ season_id: SeasonId })
        .populate('team1', 'team_name logo')
        .populate('team2', 'team_name logo')
        .populate('goalDetails.player_id', 'name')
        .sort({ date: 1 });

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
    return next(Object.assign(new Error(parseResult.error.errors[0].message), { status: 400 }));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validationResult = MatchIdSchema.safeParse({ id: req.params.id });
    if (!validationResult.success) {
        throw Object.assign(new Error(validationResult.error.errors[0].message), { status: 400 });
    }
    const matchId = new mongoose.Types.ObjectId(validationResult.data.id);
    const match = await Match.findById(matchId).populate("team1 team2").session(session);

    if (!match) {
      throw Object.assign(new Error("Không tìm thấy trận đấu để cập nhật."), { status: 404 });
    }

    const updateFields = parseResult.data;
    const oldScore = match.score;

    const lineupTeam1 = await MatchLineup.findOne({ match_id: matchId, team_id: match.team1._id }).session(session);
    const lineupTeam2 = await MatchLineup.findOne({ match_id: matchId, team_id: match.team2._id }).session(session);
    const participatingPlayerIdsTeam1 = lineupTeam1 ? lineupTeam1.players.map(p => p.player_id.toString()) : [];
    const participatingPlayerIdsTeam2 = lineupTeam2 ? lineupTeam2.players.map(p => p.player_id.toString()) : [];
    
    if (updateFields.goalDetails && updateFields.score && /^\d+-\d+$/.test(updateFields.score)) {
        const goalRegulation = await Regulation.findOne({
          season_id: match.season_id._id,
          regulation_name: "Goal Rules",
        }).session(session);
        const maxTime = goalRegulation?.rules?.goalTimeLimit?.maxMinute;
        const allowedTypes = goalRegulation?.rules?.goalTypes || [];
  
        for (const goal of updateFields.goalDetails) {
          if(!mongoose.Types.ObjectId.isValid(goal.player_id) || !mongoose.Types.ObjectId.isValid(goal.team_id)) {
              throw Object.assign(new Error("Invalid player_id or team_id in goalDetails"), { status: 400 });
          }
          
          const playerDoc = await Player.findById(goal.player_id).session(session);
          if (!playerDoc) {
              throw Object.assign(new Error(`Player with ID ${goal.player_id} not found for a goal.`), { status: 400 });
          }
  
          const actualPlayerTeamId = playerDoc.team_id;
          const beneficiaryTeamIdForGoal = new mongoose.Types.ObjectId(goal.team_id);
  
          const isPlayerInTeam1Participating = participatingPlayerIdsTeam1.includes(playerDoc._id.toString());
          const isPlayerInTeam2Participating = participatingPlayerIdsTeam2.includes(playerDoc._id.toString());
  
          if (!isPlayerInTeam1Participating && !isPlayerInTeam2Participating) {
              throw Object.assign(new Error(`Lỗi ghi bàn: Cầu thủ được chọn không có trong đội hình thi đấu của trận này.`), { status: 400 });
          }
  
          if (goal.goalType === "OG") { // Xử lý bàn phản lưới nhà
              if (beneficiaryTeamIdForGoal.equals(match.team1._id)) { // OG cho đội 1
                  if (!actualPlayerTeamId.equals(match.team2._id)) { // Người ghi bàn phải từ đội 2
                      throw Object.assign(new Error(`Lỗi bàn phản lưới nhà: Cầu thủ ghi bàn và đội hưởng lợi không hợp lệ.`), { status: 400 });
                  }
              } else if (beneficiaryTeamIdForGoal.equals(match.team2._id)) { // OG cho đội 2
                  if (!actualPlayerTeamId.equals(match.team1._id)) { // Người ghi bàn phải từ đội 1
                       throw Object.assign(new Error(`Lỗi bàn phản lưới nhà: Cầu thủ ghi bàn và đội hưởng lợi không hợp lệ.`), { status: 400 });
                  }
              } else {
                  throw Object.assign(new Error("Đội hưởng lợi bàn phản lưới nhà không hợp lệ."), { status: 400 });
              }
          } else { // Xử lý bàn thắng thường
              if (!actualPlayerTeamId.equals(beneficiaryTeamIdForGoal)) {
                  throw Object.assign(new Error(`Lỗi bàn thắng thường: Cầu thủ ${playerDoc.name} không thuộc đội hưởng lợi.`), { status: 400 });
              }
          }
  
          if (maxTime !== undefined && goal.minute > maxTime) {
            throw Object.assign(new Error("Phút ghi bàn vượt quá giới hạn của quy định."), { status: 400 });
          }
          if (allowedTypes.length > 0 && !allowedTypes.includes(goal.goalType)) {
            throw Object.assign(new Error(`Loại bàn thắng không hợp lệ: ${goal.goalType}. Các loại hợp lệ: ${allowedTypes.join(', ')}`), { status: 400 });
          }
        }
      } else if (updateFields.score === null || updateFields.score === '') {
          updateFields.goalDetails = [];
      }
    
    await Match.updateOne({ _id: matchId }, { $set: updateFields }, { session });
    
    const updatedMatchFull = await Match.findById(matchId).populate("team1 team2 season_id").session(session);

    const newScore = updatedMatchFull.score;
    const scoreChangedOrAddedOrRemoved = oldScore !== newScore;

    if (scoreChangedOrAddedOrRemoved) {
        const seasonId = updatedMatchFull.season_id._id;
        const matchDate = new Date(updatedMatchFull.date);
        matchDate.setUTCHours(0, 0, 0, 0);
        const team1Id = updatedMatchFull.team1._id;
        const team2Id = updatedMatchFull.team2._id;

        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(session);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw Object.assign(new Error("Ranking Regulation not found for the season."), { status: 500 });
        }
        const teamRegulationRules = {
            winPoints: rankingRegulation.rules.winPoints || 3,
            drawPoints: rankingRegulation.rules.drawPoints || 1,
            losePoints: rankingRegulation.rules.losePoints || 0,
        };

        await updateTeamResultsForDateInternal(team1Id, seasonId, matchDate, teamRegulationRules, session);
        await updateTeamResultsForDateInternal(team2Id, seasonId, matchDate, teamRegulationRules, session);
        await calculateAndSaveTeamRankings(seasonId, matchDate, session);

        const allPlayerIdsInLineups = [...new Set([...participatingPlayerIdsTeam1, ...participatingPlayerIdsTeam2])];
        for (const playerIdStr of allPlayerIdsInLineups) {
            const playerTeamContext = participatingPlayerIdsTeam1.includes(playerIdStr) ? team1Id : team2Id;
            await updatePlayerResultsForDateInternal(new mongoose.Types.ObjectId(playerIdStr), playerTeamContext, seasonId, matchDate, session);
        }
        await calculateAndSavePlayerRankings(seasonId, matchDate, session);
    }

    await session.commitTransaction();
    session.endSession();

    successResponse(res, updatedMatchFull, "Updated match successfully. Recalculating subsequent data in background.");

    if (scoreChangedOrAddedOrRemoved) {
        const seasonId = updatedMatchFull.season_id._id;
        const matchDate = new Date(updatedMatchFull.date);
        matchDate.setUTCHours(0, 0, 0, 0);
        const team1Id = updatedMatchFull.team1._id;
        const team2Id = updatedMatchFull.team2._id;
        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" });
        const teamRegulationRules = { winPoints: rankingRegulation?.rules?.winPoints || 3, drawPoints: rankingRegulation?.rules?.drawPoints || 1, losePoints: rankingRegulation?.rules?.losePoints || 0 };
        const allPlayerIdsInLineups = [...new Set([...participatingPlayerIdsTeam1, ...participatingPlayerIdsTeam2])];

        recalculateSubsequentData(seasonId, matchDate, team1Id, team2Id, teamRegulationRules, allPlayerIdsInLineups);
    }

  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
    }
    console.error("Error in updateMatch:", error);
    return next(error);
  }
};


// DELETE match - ĐÃ TỐI ƯU HÓA
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
            throw Object.assign(new Error("Không tìm thấy trận đấu."), { status: 404 });
        }

        const { season_id: seasonId, team1: team1Id, team2: team2Id, date: matchDateRaw, score: deletedMatchScore } = matchToDelete;
        const wasScoredMatch = deletedMatchScore !== null && /^\d+-\d+$/.test(deletedMatchScore);

        const lineups = await MatchLineup.find({ match_id: matchId }).session(session);
        const allPlayerIdsInLineups = lineups.flatMap(l => l.players.map(p => p.player_id.toString()));

        await MatchLineup.deleteMany({ match_id: matchId }, { session });
        await Match.deleteOne({ _id: matchId }, { session });
        
        await session.commitTransaction();
        session.endSession();

        successResponse(res, null, "Deleted match successfully. Recalculation is running in background if needed.", 200);

        if (wasScoredMatch) {
            const matchDate = new Date(matchDateRaw);
            matchDate.setUTCHours(0,0,0,0);
            
            const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" });
            if (!rankingRegulation) {
                console.error(`[BACKGROUND JOB] Cannot start recalculation after delete. Ranking regulation for season ${seasonId} not found.`);
                return;
            }
            const teamRegulationRules = { winPoints: rankingRegulation.rules.winPoints || 3, drawPoints: rankingRegulation.rules.drawPoints || 1, losePoints: rankingRegulation.rules.losePoints || 0 };
            
            await updateTeamResultsForDateInternal(team1Id, seasonId, matchDate, teamRegulationRules);
            await updateTeamResultsForDateInternal(team2Id, seasonId, matchDate, teamRegulationRules);

            recalculateSubsequentData(seasonId, matchDate, team1Id, team2Id, teamRegulationRules, allPlayerIdsInLineups);
        }

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("Error in deleteMatch:", error);
        return next(error);
    }
};

// GET matches by team
const getMatchesByTeamId = async (req, res, next) => {
  const team_id_param = req.params.team_id;
  const { success, error } = TeamIdSchema.safeParse({ id: team_id_param });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }
  try {
    const TeamId = new mongoose.Types.ObjectId(team_id_param);
    const matches = await Match.find({
      $or: [{ team1: TeamId }, { team2: TeamId }],
    }).populate("team1 team2 season_id");
    if (!matches || matches.length === 0) {
      return successResponse(res, [], "No matches found for this team");
    }
    return successResponse(res, matches, "Match found successfully");
  } catch (error) {
    return next(error);
  }
};

// GET matches by season and date
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
    }).populate("team1 team2 season_id");

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