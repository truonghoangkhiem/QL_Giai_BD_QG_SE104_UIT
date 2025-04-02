const Season = require("../../../../models/Season");
const { successResponse } = require("../../../../utils/responseFormat");
const {
  CreateSeasonSchema,
  UpdateSeasonSchema,
  SeasonIdSchema,
  SeasonNameSchema,
} = require("../../../../schemas/seasonSchema");
const mongoose = require("mongoose");

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

    const season_id = new mongoose.Types.ObjectId(req.params.id);
    const season = await Season.findById(season_id);
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
      const error = new Error("Season name already exists");
      error.status = 400;
      return next(error);
    }

    const newSeason = new Season({
      season_name,
      start_date,
      end_date,
      status,
    });
    await newSeason.save();

    return successResponse(res, null, "Created season successfully", 201);
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

    const season_id = new mongoose.Types.ObjectId(req.params.id);
    const checkExist = await Season.findOne({
      season_name,
      _id: { $ne: season_id },
    });
    if (checkExist) {
      const error = new Error("Season name already exists");
      error.status = 400;
      return next(error);
    }

    const updatedSeason = await Season.findByIdAndUpdate(
      season_id,
      { season_name, start_date, end_date, status },
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
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const season_id = new mongoose.Types.ObjectId(req.params.id);
    const result = await Season.findByIdAndDelete(season_id);
    if (!result) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, null, "Deleted season successfully", 204);
  } catch (error) {
    return next(error);
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

module.exports = {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
  getSeasonIdBySeasonName,
};
