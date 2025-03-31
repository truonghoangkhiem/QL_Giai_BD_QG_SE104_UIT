const { ObjectId } = require("mongodb");
const { GET_DB } = require("../../../config/db");

const { successResponse } = require("../../../../utils/responseFormat");

// Lấy tất cả mùa giải
const getSeasons = async (req, res, next) => {
  try {
    const db = GET_DB();
    const seasons = await db.collection("seasons").find().toArray();
    return successResponse(res, seasons, "Fetched seasons successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
  }
};

// Lấy mùa giải theo ID
const getSeasonById = async (req, res, next) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);
    const season = await db.collection("seasons").findOne({ _id: season_id });
    if (!season) return next(new Error("Season not found")); // Chuyển lỗi vào middleware
    return successResponse(res, season, "Season found successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
  }
};

// Tạo mùa giải
const createSeason = async (req, res, next) => {
  let { season_name, start_date, end_date, status } = req.body;
  try {
    const db = GET_DB();
    if (!season_name || !start_date || !end_date) {
      return next(new Error("All fields are required"));
    }
    if (
      status === undefined ||
      status === null ||
      typeof status !== "boolean"
    ) {
      status = true;
    }
    if (typeof season_name !== "string") {
      return next(new Error("typeof Season Name must be string"));
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
      return next(new Error("Invalid date format"));
    }
    const check_startdate = new Date(start_date);
    const check_enddate = new Date(end_date);
    if (check_startdate > check_enddate) {
      return next(new Error("Start date must be before end date"));
    }
    const checkExist = await db.collection("seasons").findOne({ season_name });
    if (checkExist) {
      return next(new Error("Season name already exists"));
    }
    await db
      .collection("seasons")
      .insertOne({ season_name, start_date, end_date, status });
    return successResponse(res, null, "Created season successfully", 201);
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
  }
};

// Cập nhật mùa giải
const updateSeason = async (req, res, next) => {
  const { season_name, start_date, end_date, status } = req.body;
  try {
    const db = GET_DB();
    if (!season_name || !start_date || !end_date) {
      return next(new Error("All fields are required"));
    }
    if (
      status === undefined ||
      status === null ||
      typeof status !== "boolean"
    ) {
      status = true;
    }
    if (typeof season_name !== "string") {
      return next(new Error("typeof Season Name must be string"));
    }
    checkExist = await db.collection("seasons").findOne({ season_name });
    if (checkExist) {
      return next(new Error("Season name already exists"));
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
      return next(new Error("Invalid date format"));
    }
    const check_startdate = new Date(start_date);
    const check_enddate = new Date(end_date);
    if (check_startdate > check_enddate) {
      return next(new Error("Start date must be before end date"));
    }

    const season_id = new ObjectId(req.params.id);
    const result = await db
      .collection("seasons")
      .findOneAndUpdate(
        { _id: season_id },
        { $set: { season_name, start_date, end_date, status } },
        { returnDocument: "after" }
      );

    if (!result) return next(new Error("Season not found"));
    return successResponse(res, result.value, "Season updated successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
  }
};

// Xóa mùa giải
const deleteSeason = async (req, res, next) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);
    const result = await db
      .collection("seasons")
      .findOneAndDelete({ _id: season_id });
    return successResponse(res, null, "Deleted season successfully", 204);
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
  }
};

const getSeasonIdBySeasonName = async (req, res, next) => {
  const { season_name } = req.params;
  if (!season_name) return next(new Error("Season name is required"));
  try {
    const db = GET_DB();
    const season = await db
      .collection("seasons")
      .findOne({ season_name: season_name });
    if (!season) return next(new Error("Season not found"));
    return successResponse(res, season._id, "Season ID found successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware
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
