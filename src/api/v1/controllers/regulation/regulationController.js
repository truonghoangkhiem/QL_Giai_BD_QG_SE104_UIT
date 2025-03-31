const { ObjectId } = require("mongodb");
const { GET_DB } = require("../../../config/db");
const { successResponse } = require("../../../../utils/responseFormat"); // Import các hàm định dạng phản hồi

// Danh sách các quy định hợp lệ
const VALID_REGULATIONS = {
  "Age Regulation": [
    "minAge",
    "maxAge",
    "minPlayersPerTeam",
    "maxPlayersPerTeam",
    "maxForeignPlayers",
  ],
  "Match Rules": ["matchRounds", "homeTeamRule"],
  "Goal Rules": ["goalTypes", "goalTimeLimit"],
  "Ranking Rules": ["winPoints", "drawPoints", "losePoints", "rankingCriteria"],
};

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

// API tạo quy định
const createRegulation = async (req, res, next) => {
  const { season_id, regulation_name, rules } = req.body;

  // Kiểm tra đầu vào hợp lệ
  if (!season_id || !regulation_name || !rules) {
    return next(new Error("All fields are required"));
  }

  // Kiểm tra season_id có hợp lệ không
  if (!ObjectId.isValid(season_id)) {
    return next(new Error("Invalid season_id"));
  }

  // Kiểm tra regulation_name có hợp lệ không
  if (!VALID_REGULATIONS[regulation_name]) {
    return next(new Error("Invalid regulation_name"));
  }

  // Kiểm tra đủ các trường trong rules
  const requiredFields = VALID_REGULATIONS[regulation_name];
  for (let field of requiredFields) {
    if (!(field in rules)) {
      return next(new Error(`Missing field: ${field}`));
    }
  }

  // Kiểm tra logic dữ liệu
  if (!validateRules(regulation_name, rules)) {
    return next(new Error("Invalid rules data"));
  }

  try {
    const db = GET_DB();
    const existingRegulation = await db
      .collection("regulations")
      .findOne({ season_id, regulation_name });

    if (existingRegulation) {
      return next(new Error("Regulation already exists for this season"));
    }

    await db.collection("regulations").insertOne({
      season_id: new ObjectId(season_id),
      regulation_name,
      rules,
    });

    return successResponse(res, null, "Regulation created successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// API lấy danh sách quy định
const getRegulations = async (req, res, next) => {
  try {
    const db = GET_DB();
    const regulations = await db.collection("regulations").find().toArray();
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
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return next(new Error("Invalid id"));
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return next(new Error("Regulation not found"));
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
  if (!ObjectId.isValid(id)) {
    return next(new Error("Invalid regulation_id"));
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return next(new Error("Regulation not found"));
    }
    await db
      .collection("regulations")
      .updateOne({ _id: new ObjectId(id) }, { $set: { rules } });
    return successResponse(res, null, "Regulation updated successfully");
  } catch (error) {
    return next(error);
  }
};

// API xóa quy định
const deleteRegulation = async (req, res, next) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return next(new Error("Invalid regulation_id"));
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return next(new Error("Regulation not found"));
    }
    await db.collection("regulations").deleteOne({ _id: new ObjectId(id) });
    return successResponse(res, null, "Regulation deleted successfully");
  } catch (error) {
    return next(error);
  }
};

// API lấy id quy định
const getIdRegulations = async (req, res, next) => {
  const { season_id, regulation_name } = req.params;
  if (!season_id || !regulation_name) {
    return next(new Error("All fields are required"));
  }
  try {
    const db = GET_DB();
    const Season_Id = new ObjectId(season_id);
    const regulations = await db
      .collection("regulations")
      .findOne({ season_id: Season_Id, regulation_name });
    if (!regulations) {
      return next(new Error("Regulation not found"));
    }
    return successResponse(res, regulations._id, "Regulation id found");
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRegulation,
  getRegulations,
  getRegulationById,
  updateRegulation,
  deleteRegulation,
  getIdRegulations,
};
