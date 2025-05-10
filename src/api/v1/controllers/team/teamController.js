import Team from "../../../../models/Team.js";
import Season from "../../../../models/Season.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdSchema,
  NameTeamSchema,
} from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// Lấy tất cả đội bóng
const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find();
    return successResponse(res, teams, "Fetched teams successfully");
  } catch (error) {
    return next(error);
  }
};

const getTeamsByNameAndSeasonId = async (req, res, next) => {
  const season_id = req.params.season_id;
  const team_name = req.params.team_name;

  try {
    console.log("season_id", season_id);

    // Xác thực tên đội
    const { success, error } = NameTeamSchema.safeParse({ team_name });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    console.log("team_name", team_name);

    // Kiểm tra định dạng của season_id
    if (!mongoose.Types.ObjectId.isValid(season_id)) {
      const validationError = new Error("Invalid season_id format");
      validationError.status = 400;
      return next(validationError);
    }

    const seasonId = new mongoose.Types.ObjectId(season_id);

    // Xác thực season_id thông qua schema
    const { success: idSuccess, error: idError } = SeasonIdSchema.safeParse({
      id: season_id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Teams = await Team.findOne({ team_name, season_id: seasonId });
    if (!Teams) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, Teams, "Fetched team successfully");
  } catch (error) {
    return next(error);
  }
};

// Lấy đội bóng theo ID
const getTeamsByID = async (req, res, next) => {
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team_id = new mongoose.Types.ObjectId(req.params.id);
    const team = await Team.findById(team_id);
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, team, "Team found successfully");
  } catch (error) {
    return next(error);
  }
};

// Thêm đội bóng
const createTeam = async (req, res, next) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;
  try {
    // Validate schema với Zod
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
      return next(validationError);
    }

    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const season = await Season.findById(Check_season_id);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }

    const existingTeam = await Team.findOne({
      team_name,
      season_id: Check_season_id,
    });
    if (existingTeam) {
      const error = new Error("Team name already exists");
      error.status = 400;
      return next(error);
    }

    const newTeam = new Team({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    const result = await newTeam.save();

    return successResponse(
      res,
      { id: result._id },
      "Created team successfully",
      201
    );
  } catch (error) {
    return next(error);
  }
};

// Sửa đội bóng
const updateTeam = async (req, res, next) => {
  const { team_name, stadium, coach, logo } = req.body;
  try {
    const { success: idSuccess, error: idError } = TeamIdSchema.safeParse({
      id: req.params.id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
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
      return next(validationError);
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const existingTeam = await Team.findById(teamId);
    if (!existingTeam) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    const updatedTeam = {};
    if (team_name) updatedTeam.team_name = team_name;
    if (stadium) updatedTeam.stadium = stadium;
    if (coach) updatedTeam.coach = coach;
    if (logo) updatedTeam.logo = logo;

    if (team_name) {
      const checkExist = await Team.findOne({
        team_name,
        season_id: existingTeam.season_id,
        _id: { $ne: teamId },
      });
      if (checkExist) {
        const error = new Error("Team name already exists");
        error.status = 400;
        return next(error);
      }
    }

    const result = await Team.updateOne({ _id: teamId }, { $set: updatedTeam });
    if (result.modifiedCount === 0) {
      const error = new Error("No changes made");
      error.status = 400;
      return next(error);
    }

    return successResponse(res, null, "Team updated successfully");
  } catch (error) {
    return next(error);
  }
};

// Xóa đội bóng
const deleteTeam = async (req, res, next) => {
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const existingTeam = await Team.findById(teamId);
    if (!existingTeam) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    await Team.deleteOne({ _id: teamId });
    return successResponse(res, null, "Deleted team successfully", 204);
  } catch (error) {
    return next(error);
  }
};

// Lấy đội bóng theo season_id
const getTeamsByIDSeason = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const season_id = new mongoose.Types.ObjectId(req.params.season_id);
    const season = await Season.findById(season_id);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    const teams = await Team.find({ season_id });
    if (teams.length === 0) {
      const error = new Error("No teams found for this season");
      error.status = 404;
      return next(error);
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
};
