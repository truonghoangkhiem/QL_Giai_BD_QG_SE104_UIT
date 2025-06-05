import Match from "../../../../models/Match.js";
import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js";
import Regulation from "../../../../models/Regulation.js";
import TeamResult from "../../../../models/TeamResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import MatchLineup from "../../../../models/MatchLineup.js"; // Added

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


// GET all matches (Adjust population as needed, lineups are fetched separately)
const getMatches = async (req, res, next) => {
  try {
    const matches = await Match.find().populate("team1 team2 season_id");
    // Lineups will be fetched via /api/matchlineups/match/:match_id
    return successResponse(res, matches, "Fetched all matches successfully");
  } catch (error) {
    return next(error);
  }
};

// GET match by ID (Adjust population, lineups fetched separately)
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
      return next(Object.assign(new Error("Không tìm thấy trận đấu để cập nhật."), { status: 404 }));
    }
    // Frontend will call /api/matchlineups/match/:match_id to get lineups
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const season = await Season.findById(season_id).session(session);
    if (!season) {
      throw Object.assign(new Error("Season not found"), { status: 404 });
    }

    const teamsInSeason = await Team.find({ season_id }).session(session);
    if (teamsInSeason.length < 2) {
      throw Object.assign(new Error("Không đủ đội trong mùa giải để tạo lịch thi đấu (yêu cầu tối thiểu 2 đội)."), {
        status: 400,
      });
    }

    const ageRegulation = await Regulation.findOne({
      season_id: season_id,
      regulation_name: "Age Regulation",
    }).session(session);

    // This validation now applies to team registration, not directly to match creation's lineup phase
    // Lineup creation itself will validate against minPlayersPerTeam from MatchLineup controller
    if (!ageRegulation || !ageRegulation.rules || typeof ageRegulation.rules.minPlayersPerTeam !== 'number') {
      throw Object.assign(new Error("Age Regulation with minPlayersPerTeam not found or invalid for this season. This is needed for team registration rules."), {
        status: 400,
      });
    }
    const minPlayersRequiredForTeam = ageRegulation.rules.minPlayersPerTeam;

    const nonCompliantTeams = [];
    for (const team of teamsInSeason) {
      const playerCount = await Player.countDocuments({ team_id: team._id }).session(session);
      if (playerCount < minPlayersRequiredForTeam) {
        nonCompliantTeams.push(team.team_name);
      }
    }

    if (nonCompliantTeams.length > 0) {
      throw Object.assign(
        new Error(
          `Không thể tạo lịch. Các đội sau chưa đăng ký đủ số lượng cầu thủ tối thiểu theo quy định: ${nonCompliantTeams.join(", ")}.`
        ),
        { status: 400 }
      );
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
                    score: null, // Score is null initially
                    goalDetails: [],
                    // participatingPlayersTeam1 and participatingPlayersTeam2 are removed
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
         throw Object.assign(new Error(`Tạo lịch thi đấu tự động thất bại. Vui lòng kiểm tra lại các quy định hoặc thử lại sau.`), { status: 400 });
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
        await Match.insertMany(schedule, { session });
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, responseData, responseMessage, 201);

  } catch (error) {
    await session.abortTransaction();
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

    const matches = await Match.aggregate([
      { $match: { season_id: SeasonId } },
      { $lookup: { from: 'teams', localField: 'team1', foreignField: '_id', as: 'team1_data'} },
      { $lookup: { from: 'teams', localField: 'team2', foreignField: '_id', as: 'team2_data'} },
      // Removed lookups for participatingPlayersTeam1_data and participatingPlayersTeam2_data
      { $unwind: { path: '$team1_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$team2_data', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id', // Use id for frontend consistency if needed
          season_id: 1,
          team1: { _id: '$team1_data._id', team_name: { $ifNull: ['$team1_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team1_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          team2: { _id: '$team2_data._id', team_name: { $ifNull: ['$team2_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team2_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          date: 1, stadium: 1, score: 1, goalDetails: 1,
           _id: 0, // Remove default _id if 'id' is preferred
          // participatingPlayers fields removed
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

    const match = await Match.findById(matchId)
        .populate('team1')
        .populate('team2')
        .populate('season_id')
        .session(session);

    if (!match) {
      throw Object.assign(new Error("Không tìm thấy trận đấu để cập nhật."), { status: 404 });
    }

    const updateFields = parseResult.data;
    const oldScore = match.score; // Store old score for comparison

    // Fetch lineups for both teams
    const lineupTeam1 = await MatchLineup.findOne({ match_id: matchId, team_id: match.team1._id }).populate('players.player_id').session(session);
    const lineupTeam2 = await MatchLineup.findOne({ match_id: matchId, team_id: match.team2._id }).populate('players.player_id').session(session);

    const participatingPlayerIdsTeam1 = lineupTeam1 ? lineupTeam1.players.map(p => p.player_id._id.toString()) : [];
    const participatingPlayerIdsTeam2 = lineupTeam2 ? lineupTeam2.players.map(p => p.player_id._id.toString()) : [];


    // Validate participating players count from MatchLineup (if lineups exist)
    // This validation should ideally be in the MatchLineup controller when creating/updating lineup.
    // For updateMatch, we assume lineups are already set correctly or will be set via MatchLineup API.
    // However, for goal validation, we need these lineups.

    if (updateFields.score === '' || updateFields.score === undefined) {
        updateFields.score = null;
    }
    
    // Goal validation using MatchLineup
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

        if (goal.goalType === "OG") {
            if (beneficiaryTeamIdForGoal.equals(match.team1._id)) { // OG benefits team1
                if (!actualPlayerTeamId.equals(match.team2._id)) { // Scorer must be from team2
                    throw Object.assign(new Error(`Lỗi bàn phản lưới nhà: Cầu thủ ghi bàn và đội hưởng lợi không hợp lệ.`), { status: 400 });
                }
                if (!isPlayerInTeam2Participating) {
                     throw Object.assign(new Error(`Own Goal scorer ${playerDoc.name} (from ${match.team2.team_name}) is not listed as participating for ${match.team2.team_name}.`), { status: 400 });
                }
            } else if (beneficiaryTeamIdForGoal.equals(match.team2._id)) { // OG benefits team2
                if (!actualPlayerTeamId.equals(match.team1._id)) { // Scorer must be from team1
                     throw Object.assign(new Error(`Own Goal for ${match.team2.team_name} invalid: Scorer ${playerDoc.name} must be from ${match.team1.team_name}.`), { status: 400 });
                }
                if (!isPlayerInTeam1Participating) {
                    throw Object.assign(new Error(`Own Goal scorer ${playerDoc.name} (from ${match.team1.team_name}) is not listed as participating for ${match.team1.team_name}.`), { status: 400 });
                }
            } else {
                throw Object.assign(new Error("Invalid beneficiary team for an Own Goal."), { status: 400 });
            }
        } else { // Normal goal
            if (!actualPlayerTeamId.equals(beneficiaryTeamIdForGoal)) {
                throw Object.assign(new Error(`Normal Goal: Scorer ${playerDoc.name} (from team ID ${actualPlayerTeamId}) does not belong to the beneficiary team ID ${beneficiaryTeamIdForGoal}.`), { status: 400 });
            }
            if (beneficiaryTeamIdForGoal.equals(match.team1._id) && !isPlayerInTeam1Participating) {
                 throw Object.assign(new Error(`Goal scorer ${playerDoc.name} (for ${match.team1.team_name}) is not listed as participating for ${match.team1.team_name}.`), { status: 400 });
            } else if (beneficiaryTeamIdForGoal.equals(match.team2._id) && !isPlayerInTeam2Participating) {
                throw Object.assign(new Error(`Goal scorer ${playerDoc.name} (for ${match.team2.team_name}) is not listed as participating for ${match.team2.team_name}.`), { status: 400 });
            }
        }

        if (maxTime !== undefined && goal.minute > maxTime) {
          throw Object.assign(new Error("Goal minute exceeds regulation limit"), { status: 400 });
        }
        if (allowedTypes.length > 0 && !allowedTypes.includes(goal.goalType)) {
          throw Object.assign(new Error(`Invalid goal type: ${goal.goalType}. Allowed: ${allowedTypes.join(', ')}`), { status: 400 });
        }
      }
    } else if (updateFields.score === null || updateFields.score === '') {
        updateFields.goalDetails = []; // Clear goal details if score is cleared
    }

    await Match.updateOne({ _id: matchId }, { $set: updateFields }, { session });
    
    const updatedMatchFull = await Match.findById(matchId)
        .populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id")
        .session(session);

    const newScore = updatedMatchFull.score;
    const hadScorePreviously = oldScore !== null && /^\d+-\d+$/.test(oldScore);
    const hasNewScoreNow = newScore !== null && /^\d+-\d+$/.test(newScore);
    
    // Check if score changed, or was added/removed
    const scoreChangedOrAddedOrRemoved = oldScore !== newScore || (hadScorePreviously && !hasNewScoreNow) || (!hadScorePreviously && hasNewScoreNow);

    if (scoreChangedOrAddedOrRemoved) { // Only recalculate if score actually changed or was set/cleared
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

        const subsequentTeamResultDatesTeam1 = await TeamResult.find({ team_id: team1Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const subsequentTeamResultDatesTeam2 = await TeamResult.find({ team_id: team2Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const allTeamSubsequentDates = [...new Set([...subsequentTeamResultDatesTeam1, ...subsequentTeamResultDatesTeam2])].sort((a,b) => new Date(a) - new Date(b));

        for (const dateStrToRecalculate of allTeamSubsequentDates) {
            const dateToRecalculate = new Date(dateStrToRecalculate);
             await updateTeamResultsForDateInternal(team1Id, seasonId, dateToRecalculate, teamRegulationRules, session);
             await updateTeamResultsForDateInternal(team2Id, seasonId, dateToRecalculate, teamRegulationRules, session);
        }

        await calculateAndSaveTeamRankings(seasonId, matchDate, session);
        const distinctRankingDatesAfter = await Ranking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSaveTeamRankings(seasonId, new Date(dateStrToRecalculate), session);
        }
        
        // Recalculate Player Results
        const allPlayerIdsInLineups = [...new Set([...participatingPlayerIdsTeam1, ...participatingPlayerIdsTeam2])];
        const playersToUpdate = await Player.find({ _id: { $in: allPlayerIdsInLineups.map(id => new mongoose.Types.ObjectId(id)) } }).session(session);

        for (const player of playersToUpdate) {
            let playerTeamContext = null;
            if (participatingPlayerIdsTeam1.includes(player._id.toString())) playerTeamContext = updatedMatchFull.team1._id;
            else if (participatingPlayerIdsTeam2.includes(player._id.toString())) playerTeamContext = updatedMatchFull.team2._id;
           
            if (playerTeamContext) {
                 await updatePlayerResultsForDateInternal(player._id, playerTeamContext, seasonId, matchDate, session);
            }
        }
        const subsequentPlayerResultDates = await PlayerResult.find({ player_id: { $in: playersToUpdate.map(p => p._id) }, season_id: seasonId, date: { $gt: matchDate }}, null, {session}).distinct('date');
        for (const dateStrToRecalculate of subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b))) {
            for (const player of playersToUpdate) {
                 let playerTeamContextForSubsequent = null;
                 const currentPlayerData = await Player.findById(player._id).select('team_id').session(session);
                 if (currentPlayerData) {
                    playerTeamContextForSubsequent = currentPlayerData.team_id;
                 }

                 if (playerTeamContextForSubsequent) {
                    await updatePlayerResultsForDateInternal(player._id, playerTeamContextForSubsequent, seasonId, new Date(dateStrToRecalculate), session);
                 }
            }
        }
        await calculateAndSavePlayerRankings(seasonId, matchDate, session); 
        const distinctPlayerRankingDatesAfter = await PlayerRanking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctPlayerRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSavePlayerRankings(seasonId, new Date(dateStrToRecalculate), session); 
        }
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, updatedMatchFull, "Updated match and recalculated related data successfully");

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
      throw Object.assign(new Error("Không tìm thấy trận đấu để cập nhật."), { status: 404 });
    }

    const { season_id: seasonIdObj, team1: team1IdObj, team2: team2IdObj, date: matchDateRaw, score: deletedMatchScore } = matchToDelete;
    const seasonId = seasonIdObj._id; 
    const team1Id = team1IdObj._id;   
    const team2Id = team2IdObj._id;   
    const matchDate = new Date(matchDateRaw);
    matchDate.setUTCHours(0, 0, 0, 0);

    const wasScoredMatch = deletedMatchScore !== null && /^\d+-\d+$/.test(deletedMatchScore);

    // Delete associated MatchLineups
    await MatchLineup.deleteMany({ match_id: matchId }, { session });
    await Match.deleteOne({ _id: matchId }, { session });

    if (wasScoredMatch) {
        console.log(`Match ${matchId} was scored. Recalculating data after deletion...`);
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

        const subsequentTeamResultDatesTeam1 = await TeamResult.find({ team_id: team1Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const subsequentTeamResultDatesTeam2 = await TeamResult.find({ team_id: team2Id, season_id: seasonId, date: { $gt: matchDate } }, null, { session }).distinct('date');
        const allTeamSubsequentDates = [...new Set([...subsequentTeamResultDatesTeam1, ...subsequentTeamResultDatesTeam2])].sort((a,b) => new Date(a) - new Date(b));

        for (const dateStrToRecalculate of allTeamSubsequentDates) {
            const dateToRecalculate = new Date(dateStrToRecalculate);
             await updateTeamResultsForDateInternal(team1Id, seasonId, dateToRecalculate, teamRegulationRules, session);
             await updateTeamResultsForDateInternal(team2Id, seasonId, dateToRecalculate, teamRegulationRules, session);
        }

        await calculateAndSaveTeamRankings(seasonId, matchDate, session);
        const distinctRankingDatesAfter = await Ranking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
        for (const dateStrToRecalculate of distinctRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
            await calculateAndSaveTeamRankings(seasonId, new Date(dateStrToRecalculate), session);
        }

        // For Player Results, we need the players who *were* in the lineup
        // This part is tricky as lineups were deleted. If an audit log or snapshot existed, it would be used.
        // For simplicity, we'll assume that player stats recalculation for this date will effectively "undo" this match's contribution.
        // A more robust solution might involve snapshotting player IDs from lineups before deletion.
        // For now, we'll fetch all players from the two teams and recalculate their results for the matchDate and subsequent dates.

        const playersOfTeam1 = await Player.find({team_id: team1Id}).session(session);
        const playersOfTeam2 = await Player.find({team_id: team2Id}).session(session);
        const allPotentiallyAffectedPlayers = [...playersOfTeam1, ...playersOfTeam2];


        if (allPotentiallyAffectedPlayers.length > 0) {
            for (const player of allPotentiallyAffectedPlayers) {
                await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, matchDate, session);
            }

            const subsequentPlayerResultDates = await PlayerResult.find({ player_id: { $in: allPotentiallyAffectedPlayers.map(p => p._id) }, season_id: seasonId, date: { $gt: matchDate }}, null, {session}).distinct('date');
            for (const dateStrToRecalculate of subsequentPlayerResultDates.sort((a,b) => new Date(a) - new Date(b))) {
                for (const player of allPotentiallyAffectedPlayers) {
                     await updatePlayerResultsForDateInternal(player._id, player.team_id, seasonId, new Date(dateStrToRecalculate), session);
                }
            }

            await calculateAndSavePlayerRankings(seasonId, matchDate, session);
            const distinctPlayerRankingDatesAfter = await PlayerRanking.find({ season_id: seasonId, date: { $gt: matchDate } }, null, {session}).distinct('date');
            for (const dateStrToRecalculate of distinctPlayerRankingDatesAfter.sort((a,b) => new Date(a) - new Date(b))) {
                await calculateAndSavePlayerRankings(seasonId, new Date(dateStrToRecalculate), session);
            }
        }
    } else {
         console.log(`Match ${matchId} was not scored. No recalculation needed for player/team stats upon deletion of an unscored match.`);
    }


    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Deleted match and recalculated related data successfully", 200);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in deleteMatch:", error);
    return next(error);
  }
};

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
    }).populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id");
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
    }).populate("team1 team2 season_id goalDetails.player_id goalDetails.team_id");

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