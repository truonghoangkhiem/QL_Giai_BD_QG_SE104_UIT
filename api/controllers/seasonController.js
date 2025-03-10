const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

const getSeasons = async (req, res) => {
  try {
    const db = getDB();
    const seasons = await db.collection("seasons").find().toArray();
    res.status(200).json(seasons);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

const createSeason = async (req, res) => {
  const { season_name, start_date, end_date, status } = req.body;
  try {
    const db = getDB();
    await db
      .collection("seasons")
      .insertOne({ season_name, start_date, end_date, status });
    res.status(201).json({ message: "Created season successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a season", error });
  }
};

const updateSeason = async (req, res) => {
  const { season_name, start_date, end_date, status } = req.body;
  try {
    const db = getDB();
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

const deleteSeason = async (req, res) => {
  try {
    const db = getDB();
    const season_id = new ObjectId(req.params.id);
    await db.collection("seasons").findOneAndDelete({ _id: season_id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete season", error });
  }
};

module.exports = { getSeasons, createSeason, updateSeason, deleteSeason };
