import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateRegulationSchema,
  UpdateRegulationSchema,
  RegulationIdSchema,
  GetIdRegulationsSchema,
  VALID_REGULATIONS,
} from "../../../../schemas/regulationSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// Kiểm tra logic dữ liệu
const validateRules = (regulation_name, rules) => {
  switch (regulation_name) {
    case "Age Regulation":
      if (
        typeof rules.minAge !== "number" ||
        typeof rules.maxAge !== "number" ||
        rules.minAge >= rules.maxAge ||
        typeof rules.minPlayersPerTeam !== "number" ||
        typeof rules.maxPlayersPerTeam !== "number" ||
        rules.minPlayersPerTeam > rules.maxPlayersPerTeam ||
        typeof rules.maxForeignPlayers !== "number"
      )
        return false;
      break;

    case "Match Rules":
      if (
        typeof rules.matchRounds !== "number" ||
        typeof rules.homeTeamRule !== "string"
      )
        return false;
      break;

    case "Goal Rules":
      if (
        !Array.isArray(rules.goalTypes) ||
        typeof rules.goalTimeLimit !== "object" ||
        typeof rules.goalTimeLimit.minMinute !== "number" ||
        typeof rules.goalTimeLimit.maxMinute !== "number"
      )
        return false;
      break;

    case "Ranking Rules":
      if (
        typeof rules.winPoints !== "number" ||
        typeof rules.drawPoints !== "number" ||
        typeof rules.losePoints !== "number" ||
        rules.winPoints <= rules.drawPoints ||
        rules.drawPoints <= rules.losePoints ||
        !rules.winPoints ||
        !rules.drawPoints ||
        !rules.losePoints ||
        !Array.isArray(rules.rankingCriteria)
      )
        return false;
      break;

    default:
      return false;
  }
  return true;
};

const getRegulationsBySeasonId = async (req, res, next) => {
  const { season_id } = req.params;
  try {
    console.log(`Tìm quy định với season_id: ${season_id}`); // Debug log
    const { success, error } = SeasonIdSchema.safeParse({ id: season_id });
    if (!success) {
      const validationError = new Error(`ID mùa giải không hợp lệ: ${error.errors[0].message}`);
      validationError.status = 400;
      return next(validationError);
    }
    const regulations = await Regulation.find({ season_id: new mongoose.Types.ObjectId(season_id) });
    return successResponse(
      res,
      regulations,
      "Lấy quy định theo mùa giải thành công"
    );
  } catch (error) {
    console.error(`Lỗi trong getRegulationsBySeasonId: ${error.message}`); // Debug log
    return next(error);
  }
};

// API tạo quy định
const createRegulation = async (req, res, next) => {
  const { season_id, regulation_name, rules } = req.body;
  try {
    // Validate schema với Zod
    const { success, error } = CreateRegulationSchema.safeParse({
      season_id,
      regulation_name,
      rules,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    // Kiểm tra đủ các trường trong rules
    const requiredFields = VALID_REGULATIONS[regulation_name];
    for (let field of requiredFields) {
      if (!(field in rules)) {
        const error = new Error(`Missing field: ${field}`);
        error.status = 400;
        return next(error);
      }
    }

    // Kiểm tra logic dữ liệu
    if (!validateRules(regulation_name, rules)) {
      const error = new Error("Invalid rules data");
      error.status = 400;
      return next(error);
    }

    const existingRegulation = await Regulation.findOne({
      season_id,
      regulation_name,
    });
    if (existingRegulation) {
      const error = new Error("Regulation already exists for this season");
      error.status = 400;
      return next(error);
    }

    const newRegulation = new Regulation({
      season_id: new mongoose.Types.ObjectId(season_id),
      regulation_name,
      rules,
    });
    await newRegulation.save();

    return successResponse(res, null, "Regulation created successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// API lấy danh sách quy định
const getRegulations = async (req, res, next) => {
  try {
    const regulations = await Regulation.find();
    return successResponse(
      res,
      regulations,
      "Fetched regulations successfully"
    );
  } catch (error) {
    return next(error);
  }
};

// API lấy quy định theo id
const getRegulationById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = RegulationIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const regulation = await Regulation.findById(id);
    if (!regulation) {
      const error = new Error("Regulation not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, regulation, "Regulation found successfully");
  } catch (error) {
    return next(error);
  }
};

// API cập nhật quy định
const updateRegulation = async (req, res, next) => {
  const { rules } = req.body;
  const { id } = req.params;
  try {
    const { success: idSuccess, error: idError } = RegulationIdSchema.safeParse(
      { id }
    );
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const { success, error } = UpdateRegulationSchema.safeParse({ rules });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const regulation = await Regulation.findById(id);
    if (!regulation) {
      const error = new Error("Regulation not found");
      error.status = 404;
      return next(error);
    }

    // Kiểm tra logic dữ liệu
    if (!validateRules(regulation.regulation_name, rules)) {
      const error = new Error("Invalid rules data");
      error.status = 400;
      return next(error);
    }

    await Regulation.updateOne({ _id: id }, { $set: { rules } });
    return successResponse(res, null, "Regulation updated successfully");
  } catch (error) {
    return next(error);
  }
};

// API xóa quy định
const deleteRegulation = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { success, error } = RegulationIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const regulation = await Regulation.findById(id);
    if (!regulation) {
      const error = new Error("Regulation not found");
      error.status = 404;
      return next(error);
    }

    await Regulation.deleteOne({ _id: id });
    return successResponse(res, null, "Regulation deleted successfully");
  } catch (error) {
    return next(error);
  }
};

// API lấy id quy định
const getIdRegulations = async (req, res, next) => {
  const { season_id, regulation_name } = req.params;
  try {
    const { success, error } = GetIdRegulationsSchema.safeParse({
      season_id,
      regulation_name,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const Season_Id = new mongoose.Types.ObjectId(season_id);
    const regulation = await Regulation.findOne({
      season_id: Season_Id,
      regulation_name,
    });
    if (!regulation) {
      const error = new Error("Regulation not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, regulation._id, "Regulation id found");
  } catch (error) {
    return next(error);
  }
};

export {
  createRegulation,
  getRegulations,
  getRegulationById,
  updateRegulation,
  deleteRegulation,
  getIdRegulations,
  getRegulationsBySeasonId,
};
