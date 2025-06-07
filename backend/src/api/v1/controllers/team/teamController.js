// File: backend/src/api/v1/controllers/team/teamController.js

import Team from "../../../../models/Team.js";
import Season from "../../../../models/Season.js";
import Player from "../../../../models/Player.js";
import Match from "../../../../models/Match.js";
import TeamResult from "../../../../models/TeamResult.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Regulation from "../../../../models/Regulation.js";
import MatchLineup from "../../../../models/MatchLineup.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdSchema,
  NameTeamSchema,
} from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// Import các hàm helper
import { updateTeamResultsForDateInternal } from "./team_resultsController.js";
import { calculateAndSaveTeamRankings } from "./rankingController.js";
import { updatePlayerResultsForDateInternal } from "../player/player_resultsController.js";
import { calculateAndSavePlayerRankings } from "../player/player_rankingsController.js";


// HÀM TÍNH TOÁN LẠI DỮ LIỆU MÙA GIẢI (HÀM NÀY SẼ ĐƯỢC CHẠY NGẦM)
const recalculateSeasonData = async (season_id_str, excluded_team_id_str = null) => {
    console.log(`[BACKGROUND JOB] Starting recalculation for season ${season_id_str}, excluding team ${excluded_team_id_str}`);
    const backgroundSession = await mongoose.startSession();
    backgroundSession.startTransaction();
    try {
        const seasonId = new mongoose.Types.ObjectId(season_id_str);
        
        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(backgroundSession);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw new Error("Ranking Regulation not found or rules not defined for the season.");
        }
        const teamRegulationRules = {
            winPoints: rankingRegulation.rules.winPoints || 3,
            drawPoints: rankingRegulation.rules.drawPoints || 1,
            losePoints: rankingRegulation.rules.losePoints || 0,
        };

        const teamsQuery = { season_id: seasonId };
        if (excluded_team_id_str) {
            teamsQuery._id = { $ne: new mongoose.Types.ObjectId(excluded_team_id_str) };
        }
        const activeTeams = await Team.find(teamsQuery).session(backgroundSession);
        const activeTeamIds = activeTeams.map(t => t._id);
        
        // Cập nhật lại tất cả các trận đấu còn lại
        const relevantMatches = await Match.find({ season_id: seasonId, team1: { $in: activeTeamIds }, team2: { $in: activeTeamIds }, score: { $ne: null, $regex: /^\d+-\d+$/ } }).session(backgroundSession);

        // Xóa sạch dữ liệu cũ của các đội còn lại
        await TeamResult.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds } }).session(backgroundSession);
        await Ranking.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds } }).session(backgroundSession);
        
        const activePlayers = await Player.find({ team_id: { $in: activeTeamIds }}).session(backgroundSession);
        const activePlayerIds = activePlayers.map(p => p._id);
        await PlayerResult.deleteMany({ season_id: seasonId, player_id: { $in: activePlayerIds } }).session(backgroundSession);
        await PlayerRanking.deleteMany({ season_id: seasonId, player_id: { $in: activePlayerIds } }).session(backgroundSession);

        const season = await Season.findById(seasonId).session(backgroundSession);
        if (!season) throw new Error("Season not found during recalculation.");
        const seasonStartDate = new Date(season.start_date);
        seasonStartDate.setUTCHours(0, 0, 0, 0);

        // Tạo lại dữ liệu ban đầu
        for (const team of activeTeams) {
            await TeamResult.create([{ team_id: team._id, season_id: seasonId, date: seasonStartDate }], { session: backgroundSession });
            const playersOfTeam = activePlayers.filter(p => p.team_id.equals(team._id));
            for (const player of playersOfTeam) {
                await PlayerResult.create([{ player_id: player._id, season_id: seasonId, team_id: team._id, date: seasonStartDate }], { session: backgroundSession });
            }
        }
        
        const allMatchDatesInvolved = [...new Set(relevantMatches.map(m => new Date(m.date).toISOString().split('T')[0]))];
        const datesToProcess = [...new Set([seasonStartDate.toISOString().split('T')[0], ...allMatchDatesInvolved])]
                                .map(dstr => new Date(dstr))
                                .sort((a,b) => a - b);

        for (const currentDate of datesToProcess) {
            // Tính toán lại kết quả
            for (const team of activeTeams) {
                await updateTeamResultsForDateInternal(team._id, seasonId, currentDate, teamRegulationRules, backgroundSession);
                const playersOfTeam = activePlayers.filter(p => p.team_id.equals(team._id));
                for (const player of playersOfTeam) {
                    await updatePlayerResultsForDateInternal(player._id, team._id, seasonId, currentDate, backgroundSession);
                }
            }
            // Tính toán lại xếp hạng
            await calculateAndSaveTeamRankings(seasonId, currentDate, backgroundSession);
            await calculateAndSavePlayerRankings(seasonId, currentDate, backgroundSession);
        }

        await backgroundSession.commitTransaction();
        console.log(`[BACKGROUND JOB] Recalculation for season ${season_id_str} (excluding team ${excluded_team_id_str || 'none'}) completed successfully.`);
    } catch (error) {
        await backgroundSession.abortTransaction();
        console.error(`[BACKGROUND JOB] Error during season data recalculation for season ${season_id_str}:`, error);
    } finally {
        backgroundSession.endSession();
    }
};

// GET all teams
const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().populate("season_id");
    return successResponse(res, teams, "Fetched teams successfully");
  } catch (error) {
    return next(error);
  }
};

// GET team by name and season ID
const getTeamsByNameAndSeasonId = async (req, res, next) => {
  const season_id_param = req.params.season_id;
  const team_name_param = req.params.team_name;

  try {
    const { success: nameSuccess, error: nameError } = NameTeamSchema.safeParse({ team_name: team_name_param });
    if (!nameSuccess) {
      const validationError = new Error(nameError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    if (!mongoose.Types.ObjectId.isValid(season_id_param)) {
      const validationError = new Error("Invalid season_id format");
      validationError.status = 400;
      return next(validationError);
    }
    const seasonIdObj = new mongoose.Types.ObjectId(season_id_param);

    const team = await Team.findOne({ team_name: team_name_param, season_id: seasonIdObj });
    if (!team) {
      const error = new Error("Không tìm thấy đội bóng được yêu cầu.");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, team, "Fetched team successfully");
  } catch (error) {
    return next(error);
  }
};

// GET team by ID
const getTeamsByID = async (req, res, next) => {
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team_id_obj = new mongoose.Types.ObjectId(req.params.id);
    const team = await Team.findById(team_id_obj).populate("season_id");
    if (!team) {
      const error = new Error("Không tìm thấy đội bóng được yêu cầu.");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, team, "Team found successfully");
  } catch (error) {
    return next(error);
  }
};

// CREATE a team
const createTeam = async (req, res, next) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = CreateTeamSchema.safeParse({
      season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const season = await Season.findById(Check_season_id).session(session);
    if (!season) {
      const error = new Error("Không tìm thấy mùa giải bạn đã chọn.");
      error.status = 404;
      throw error;
    }

    const existingTeam = await Team.findOne({
      team_name,
      season_id: Check_season_id,
    }).session(session);
    if (existingTeam) {
      const error = new Error("Team name already exists in this season");
      error.status = 400;
      throw error;
    }

    const newTeam = new Team({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    const savedTeam = await newTeam.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      savedTeam,
      "Created team successfully.",
      201
    );
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in createTeam:", error);
    return next(error);
  }
};

// UPDATE a team
const updateTeam = async (req, res, next) => {
  const { team_name, stadium, coach, logo } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success: idSuccess, error: idError } = TeamIdSchema.safeParse({
      id: req.params.id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const { success, error } = UpdateTeamSchema.safeParse({
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const existingTeam = await Team.findById(teamId).session(session);
    if (!existingTeam) {
      const error = new Error("Không tìm thấy đội bóng được yêu cầu.");
      error.status = 404;
      throw error;
    }

    const updatedTeamData = {};
    if (team_name) updatedTeamData.team_name = team_name;
    if (stadium) updatedTeamData.stadium = stadium;
    if (coach) updatedTeamData.coach = coach;
    if (logo) updatedTeamData.logo = logo;

    if (team_name && team_name !== existingTeam.team_name) {
      const checkExist = await Team.findOne({
        team_name,
        season_id: existingTeam.season_id,
        _id: { $ne: teamId },
      }).session(session);
      if (checkExist) {
        const error = new Error("Team name already exists in this season");
        error.status = 400;
        throw error;
      }
    }
    
    if (Object.keys(updatedTeamData).length === 0) {
        await session.abortTransaction();
        session.endSession();
        return successResponse(res, existingTeam, "No changes made to the team");
    }

    const result = await Team.findByIdAndUpdate(teamId, { $set: updatedTeamData }, { new: true, session });
    
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, result, "Team updated successfully");
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    return next(error);
  }
};

// DELETE a team - OPTIMIZED
const deleteTeam = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let teamToDeleteInfo = null;
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      throw Object.assign(new Error(error.errors[0].message), { status: 400 });
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const teamToDelete = await Team.findById(teamId).session(session);
    if (!teamToDelete) {
      throw Object.assign(new Error("Không tìm thấy đội bóng được yêu cầu."), { status: 404 });
    }

    // --- PHASE 1: GATHER INFO & DELETE ---
    teamToDeleteInfo = {
        seasonId: teamToDelete.season_id.toString(),
        teamId: teamToDelete._id.toString()
    };
    
    // 1. Delete Players and their data
    const playersToDelete = await Player.find({ team_id: teamId }).session(session);
    if (playersToDelete.length > 0) {
        const playerIdsToDelete = playersToDelete.map(p => p._id);
        await PlayerResult.deleteMany({ player_id: { $in: playerIdsToDelete } }, { session });
        await PlayerRanking.deleteMany({ player_id: { $in: playerIdsToDelete } }, { session });
        await Player.deleteMany({ _id: { $in: playerIdsToDelete } }, { session });
    }

    // 2. Delete Matches involving the team
    await Match.deleteMany({ $or: [{ team1: teamId }, { team2: teamId }] }, { session });
    await MatchLineup.deleteMany({ team_id: teamId }, { session });

    // 3. Delete TeamResult & Ranking
    await TeamResult.deleteMany({ team_id: teamId }, { session });
    await Ranking.deleteMany({ team_id: teamId }, { session });

    // 4. Delete the Team
    await Team.deleteOne({ _id: teamId }, { session });
    
    await session.commitTransaction(); 
    session.endSession(); 

    // --- PHASE 2: IMMEDIATE RESPONSE ---
    successResponse(res, null, "Đã xóa đội bóng thành công. Dữ liệu mùa giải đang được tính toán lại trong nền...", 200);

    // --- PHASE 3: ASYNC (FIRE-AND-FORGET) RECALCULATION ---
    // Gọi hàm tính toán lại mà không cần `await`
    recalculateSeasonData(teamToDeleteInfo.seasonId, teamToDeleteInfo.teamId);

  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in deleteTeam:", error); 
    return next(error);
  }
};

// GET teams by season ID
const getTeamsByIDSeason = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const season_id_obj = new mongoose.Types.ObjectId(req.params.season_id);
    const season = await Season.findById(season_id_obj);
    if (!season) {
      const error = new Error("Không tìm thấy mùa giải bạn đã chọn.");
      error.status = 404;
      return next(error);
    }
    const teams = await Team.find({ season_id: season_id_obj }).populate("season_id");
    if (teams.length === 0) {
      return successResponse(res, [], "No teams found for this season");
    }
    return successResponse(
      res,
      teams,
      "Fetched teams successfully for this season"
    );
  } catch (error) {
    console.error("Error in getTeamsByIDSeason:", error);
    return next(error);
  }
};

export {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
  getTeamsByNameAndSeasonId,
  recalculateSeasonData, // Export để có thể gọi từ nơi khác nếu cần
};