const { ObjectId } = require("mongodb");
const { GET_DB } = require("../config/db");

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
const createRegulation = async (req, res) => {
  const { season_id, regulation_name, rules } = req.body;

  // Kiểm tra đầu vào hợp lệ
  if (!season_id || !regulation_name || !rules) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Kiểm tra season_id có hợp lệ không
  if (!ObjectId.isValid(season_id)) {
    return res.status(400).json({ message: "Invalid season_id" });
  }

  // Kiểm tra regulation_name có hợp lệ không
  if (!VALID_REGULATIONS[regulation_name]) {
    return res.status(400).json({ message: "Invalid regulation_name" });
  }

  // Kiểm tra đủ các trường trong rules
  const requiredFields = VALID_REGULATIONS[regulation_name];
  for (let field of requiredFields) {
    if (!(field in rules)) {
      return res.status(400).json({ message: `Missing field: ${field}` });
    }
  }

  // Kiểm tra logic dữ liệu
  if (!validateRules(regulation_name, rules)) {
    return res.status(400).json({ message: "Invalid rules data" });
  }

  try {
    const db = GET_DB();
    const existingRegulation = await db
      .collection("regulations")
      .findOne({ season_id, regulation_name });

    if (existingRegulation) {
      return res
        .status(400)
        .json({ message: "Regulation already exists for this season" });
    }

    await db.collection("regulations").insertOne({
      season_id: new ObjectId(season_id),
      regulation_name,
      rules,
    });

    res.status(201).json({ message: "Regulation created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to create regulation", error });
  }
};
// API lấy danh sách quy định
const getRegulations = async (req, res) => {
  try {
    const db = GET_DB();
    const regulations = await db.collection("regulations").find().toArray();
    res.status(200).json(regulations);
  } catch (error) {
    res.status(500).json({ message: "Failed to get regulations", error });
  }
};
// API lấy quy định theo id
const getRegulationById = async (req, res) => {
  const id = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }
    res.status(200).json(regulation);
  } catch (error) {
    res.status(500).json({ message: "Failed to get regulation", error });
  }
};
// API cập nhật quy định
const updateRegulation = async (req, res) => {
  const { rules } = req.body;
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid regulation_id" });
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }
    await db
      .collection("regulations")
      .updateOne({ _id: new ObjectId(id) }, { $set: { rules } });
    res.status(200).json({ message: "Regulation updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update regulation", error });
  }
};
// API xóa quy định
const deleteRegulation = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid regulation_id" });
  }
  try {
    const db = GET_DB();
    const regulation = await db
      .collection("regulations")
      .findOne({ _id: new ObjectId(id) });
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }
    await db.collection("regulations").deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ message: "Regulation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete regulation", error });
  }
};
// API lấy id quy định
const getIdRegulations = async (req, res) => {
  const { season_id, regulation_name } = req.body;
  if (!season_id || !regulation_name) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const db = GET_DB();
    const Season_Id = new ObjectId(season_id);
    const regulations = await db
      .collection("regulations")
      .findOne({ season_id: Season_Id, regulation_name });
    if (!regulations) {
      return res.status(404).json({ message: "Regulation not found" });
    }
    res.status(200).json(regulations._id);
  } catch (error) {
    res.status(500).json({ message: "Failed to get regulation ids", error });
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
