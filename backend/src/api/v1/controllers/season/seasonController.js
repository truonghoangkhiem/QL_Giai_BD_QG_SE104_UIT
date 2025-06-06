import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js";
import Match from "../../../../models/Match.js";
import TeamResult from "../../../../models/TeamResult.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateSeasonSchema,
  UpdateSeasonSchema,
  SeasonIdSchema,
  SeasonNameSchema,
} from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";
// Import the deleteTeam function if it's not already part of a shared service
// For now, we'll assume direct model operations or replicate parts of team deletion logic.
// Ideally, you'd have a TeamService.delete(teamId, session) method.
import { deleteTeam as deleteTeamService } from "../team/teamController.js"; // Assuming it can be imported and used

// --- Other functions (getSeasons, getSeasonById, createSeason, updateSeason, getSeasonIdBySeasonName) remain the same ---
// Add them here if you need the full file content.

// Lấy tất cả mùa giải
const getSeasons = async (req, res, next) => {
  try {
    const seasons = await Season.find();
    return successResponse(res, seasons, "Fetched seasons successfully");
  } catch (error) {
    return next(error);
  }
};

// Lấy mùa giải theo ID
const getSeasonById = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const season_id_obj = new mongoose.Types.ObjectId(req.params.id); // Renamed to avoid conflict
    const season = await Season.findById(season_id_obj);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, season, "Season found successfully");
  } catch (error) {
    return next(error);
  }
};

// Tạo mùa giải
const createSeason = async (req, res, next) => {
  let { season_name, start_date, end_date, status } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = CreateSeasonSchema.safeParse({
      season_name,
      start_date,
      end_date,
      status,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const checkExist = await Season.findOne({ season_name });
    if (checkExist) {
      const error = new Error("Tên mùa giải đã tồn tại");
      error.status = 400;
      return next(error);
    }

    const newSeason = new Season({
      season_name,
      start_date,
      end_date,
      status,
    });
    const savedSeason = await newSeason.save(); // get the saved season document

    return successResponse(res, savedSeason, "Created season successfully", 201); // return savedSeason
  } catch (error) {
    return next(error);
  }
};

// Cập nhật mùa giải
const updateSeason = async (req, res, next) => {
  const { season_name, start_date, end_date, status } = req.body;
  try {
    const { success: idSuccess, error: idError } = SeasonIdSchema.safeParse({
      id: req.params.id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const { success, error } = UpdateSeasonSchema.safeParse({
      season_name,
      start_date,
      end_date,
      status,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const season_id_obj = new mongoose.Types.ObjectId(req.params.id); // Renamed
    
    // Check if a season with the new name already exists (excluding the current season being updated)
    if (season_name) {
        const checkExist = await Season.findOne({
          season_name,
          _id: { $ne: season_id_obj },
        });
        if (checkExist) {
          const error = new Error("Tên mùa giải đã tồn tại");
          error.status = 400;
          return next(error);
        }
    }
    
    const updateData = {};
    if (season_name !== undefined) updateData.season_name = season_name;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;


    if (Object.keys(updateData).length === 0) {
        const currentSeason = await Season.findById(season_id_obj);
        return successResponse(res, currentSeason, "No changes made to the season.");
    }


    const updatedSeason = await Season.findByIdAndUpdate(
      season_id_obj,
      updateData, // Use updateData
      { new: true }
    );
    if (!updatedSeason) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, updatedSeason, "Season updated successfully");
  } catch (error) {
    return next(error);
  }
};


// Xóa mùa giải
const deleteSeason = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const seasonId = new mongoose.Types.ObjectId(req.params.id);
    const seasonToDelete = await Season.findById(seasonId).session(session);
    if (!seasonToDelete) {
      const error = new Error("Season not found");
      error.status = 404;
      throw error;
    }

    // 1. Find all teams in the season
    const teamsInSeason = await Team.find({ season_id: seasonId }).session(session);

    for (const team of teamsInSeason) {
      // For each team, perform cascading deletions similar to deleteTeam logic
      const teamId = team._id;

      // Delete Players of the team and their PlayerResults/PlayerRankings
      const playersToDelete = await Player.find({ team_id: teamId }).session(session);
      const playerIdsToDelete = playersToDelete.map(p => p._id);

      if (playerIdsToDelete.length > 0) {
        await PlayerResult.deleteMany({ player_id: { $in: playerIdsToDelete }, season_id: seasonId }).session(session);
        await PlayerRanking.deleteMany({ player_id: { $in: playerIdsToDelete }, season_id: seasonId }).session(session);
        await Player.deleteMany({ team_id: teamId }).session(session);
      }

      // Delete Matches involving the team for this season
      await Match.deleteMany({ season_id: seasonId, $or: [{ team1: teamId }, { team2: teamId }] }).session(session);
      
      // Delete TeamResult for this team in this season
      await TeamResult.deleteMany({ team_id: teamId, season_id: seasonId }).session(session);
      
      // Delete Ranking for this team in this season
      await Ranking.deleteMany({ team_id: teamId, season_id: seasonId }).session(session); // Assuming Ranking has team_id

      // Delete the Team itself
      await Team.deleteOne({ _id: teamId }).session(session);
    }

    // 2. Delete all matches that might not have been caught by team deletion (e.g., if a match had invalid team refs)
    await Match.deleteMany({ season_id: seasonId }).session(session);

    // 3. Delete all remaining TeamResults, PlayerResults, Rankings, PlayerRankings for the season
    // (Should mostly be covered by team-specific deletions, but this is a fallback)
    await TeamResult.deleteMany({ season_id: seasonId }).session(session);
    await Ranking.deleteMany({ season_id: seasonId }).session(session);
    await PlayerResult.deleteMany({ season_id: seasonId }).session(session);
    await PlayerRanking.deleteMany({ season_id: seasonId }).session(session);
    
    // 4. Delete Regulations for the season
    await Regulation.deleteMany({ season_id: seasonId }).session(session);

    // 5. Delete the Season itself
    await Season.deleteOne({ _id: seasonId }).session(session);

    await session.commitTransaction();
    return successResponse(res, null, "Deleted season and all related data successfully", 200); // Changed to 200

  } catch (error) {
    await session.abortTransaction();
    console.error("Error in deleteSeason:", error);
    return next(error);
  } finally {
    session.endSession();
  }
};


// Lấy ID mùa giải theo tên
const getSeasonIdBySeasonName = async (req, res, next) => {
  const { season_name } = req.params;
  try {
    const { success, error } = SeasonNameSchema.safeParse({ season_name });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const season = await Season.findOne({ season_name });
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, season._id, "Season ID found successfully");
  } catch (error) {
    return next(error);
  }
};


export {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
  getSeasonIdBySeasonName,
};