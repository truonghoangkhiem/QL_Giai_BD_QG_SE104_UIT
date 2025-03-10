const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

//Lay tat ca mua giai
const getSeasons = async (req, res) => {
  try {
    const db = GET_DB();
    const seasons = await db.collection("seasons").find().toArray();
    res.status(200).json(seasons);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
//Lay mua giai theo id
const getSeasonById = async (req, res) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);
    const season = await db.collection("seasons").findOne({ _id: season_id });
    if (!season) return res.status(404).json({ message: "Season not found" });
    res.json(season);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
//Them mua giai
const createSeason = async (req, res) => {
  let { season_name, start_date, end_date, status } = req.body;
  try {
    const db = GET_DB();
    if (!season_name || !start_date || !end_date) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (
      status === undefined ||
      status === null ||
      typeof status !== "boolean"
    ) {
      status = true;
    }
    if (typeof season_name !== "string") {
      return res
        .status(400)
        .json({ message: "typeof Season Name must is string" });
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date)))
      return res.status(400).json({ message: "Invalid date format" });
    const check_startdate = new Date(start_date);
    const check_enddate = new Date(end_date);
    if (check_startdate > check_enddate)
      return res
        .status(400)
        .json({ message: "Start date must be before end date" });
    await db
      .collection("seasons")
      .insertOne({ season_name, start_date, end_date, status });
    res.status(201).json({ message: "Created season successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a season", error });
  }
};
//Cap nhat mua giai
const updateSeason = async (req, res) => {
  const { season_name, start_date, end_date, status } = req.body;
  try {
    const db = GET_DB();
    if (!season_name || !start_date || !end_date) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (
      status === undefined ||
      status === null ||
      typeof status !== "boolean"
    ) {
      status = true;
    }
    if (typeof season_name !== "string") {
      return res
        .status(400)
        .json({ message: "typeof Season Name must is string" });
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date)))
      return res.status(400).json({ message: "Invalid date format" });
    const check_startdate = new Date(start_date);
    const check_enddate = new Date(end_date);
    if (check_startdate > check_enddate)
      return res
        .status(400)
        .json({ message: "Start date must be before end date" });
    const season_id = new ObjectId(req.params.id);
    const result = await db
      .collection("seasons")
      .findOneAndUpdate(
        { _id: season_id },
        { $set: { season_name, start_date, end_date, status } },
        { returnDocument: "after" }
      );

    if (!result) return res.status(404).json({ message: "Season not found" });
    res.json(result.value);
  } catch (error) {
    res.status(500).json({ message: "Failed to update season", error });
  }
};
//Xoa mua giai
const deleteSeason = async (req, res) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);
    await db.collection("seasons").findOneAndDelete({ _id: season_id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete season", error });
  }
};

module.exports = {
  getSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonById,
};
