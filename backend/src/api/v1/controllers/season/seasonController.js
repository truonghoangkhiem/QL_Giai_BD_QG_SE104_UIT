// File: backend/src/api/v1/controllers/season/seasonController.js

import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js";
import Match from "../../../../models/Match.js";
import TeamResult from "../../../../models/TeamResult.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Regulation from "../../../../models/Regulation.js";
import MatchLineup from "../../../../models/MatchLineup.js"; // Import MatchLineup
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateSeasonSchema,
  UpdateSeasonSchema,
  SeasonIdSchema,
  SeasonNameSchema,
} from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// GET all seasons
const getSeasons = async (req, res, next) => {
  try {
    const seasons = await Season.find();
    return successResponse(res, seasons, "Fetched seasons successfully");
  } catch (error) {
    return next(error);
  }
};

// GET season by ID
const getSeasonById = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const season_id_obj = new mongoose.Types.ObjectId(req.params.id);
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

// CREATE season
const createSeason = async (req, res, next) => {
  let { season_name, start_date, end_date, status } = req.body;
  try {
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
    const savedSeason = await newSeason.save();

    return successResponse(res, savedSeason, "Created season successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// UPDATE season
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

    const season_id_obj = new mongoose.Types.ObjectId(req.params.id);
    
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
      updateData,
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


// DELETE season - OPTIMIZED
const deleteSeason = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      throw Object.assign(new Error(error.errors[0].message), { status: 400 });
    }

    const seasonId = new mongoose.Types.ObjectId(req.params.id);
    const seasonToDelete = await Season.findById(seasonId).session(session);
    if (!seasonToDelete) {
      throw Object.assign(new Error("Season not found"), { status: 404 });
    }

    // --- PHASE 1: DELETE ALL RELATED DATA IN A SINGLE TRANSACTION ---
    
    // 1. Find all teams and players to determine which sub-documents to delete
    const teamsInSeason = await Team.find({ season_id: seasonId }).select('_id').session(session);
    const teamIdsInSeason = teamsInSeason.map(t => t._id);
    
    const playersInSeason = await Player.find({ team_id: { $in: teamIdsInSeason } }).select('_id').session(session);
    const playerIdsInSeason = playersInSeason.map(p => p._id);

    // 2. Delete all documents related to the season
    await Regulation.deleteMany({ season_id: seasonId }, { session });
    await MatchLineup.deleteMany({ season_id: seasonId }, { session });
    await Match.deleteMany({ season_id: seasonId }, { session });
    await PlayerRanking.deleteMany({ season_id: seasonId }, { session });
    await PlayerResult.deleteMany({ season_id: seasonId }, { session });
    await Ranking.deleteMany({ season_id: seasonId }, { session });
    await TeamResult.deleteMany({ season_id: seasonId }, { session });
    if (playerIdsInSeason.length > 0) {
        await Player.deleteMany({ _id: { $in: playerIdsInSeason } }, { session });
    }
    if (teamIdsInSeason.length > 0) {
        await Team.deleteMany({ _id: { $in: teamIdsInSeason } }, { session });
    }
    
    // 3. Finally, delete the Season itself
    await Season.deleteOne({ _id: seasonId }, { session });

    await session.commitTransaction();
    session.endSession();

    // --- PHASE 2: IMMEDIATE RESPONSE ---
    // No background task is needed because we deleted EVERYTHING. There's nothing left to recalculate.
    return successResponse(res, null, "Deleted season and all related data successfully.", 200);

  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in deleteSeason:", error);
    return next(error);
  }
};


// GET season ID by name
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