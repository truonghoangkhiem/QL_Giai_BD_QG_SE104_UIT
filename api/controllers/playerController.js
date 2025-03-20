const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

//Lay tat ca cau thu
const getPlayers = async (req, res) => {
  try {
    const db = GET_DB();
    const players = await db.collection("players").find().toArray();
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

//Lay cau thu theo id
const getPlayerById = async (req, res) => {
  try {
    const db = GET_DB();
    const player_id = new ObjectId(req.params.id);
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
    res.status(200).json(player);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
//Them cau thu
const createPlayer = async (req, res) => {
  const { team_id, name, dob, nationality, position, isForeigner } = req.body;
  if (
    !team_id ||
    !name ||
    !dob ||
    !nationality ||
    !position ||
    isForeigner === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const db = GET_DB();
    const TeamID = new ObjectId(team_id);
    const team = await db.collection("teams").findOne({ _id: TeamID });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (typeof name !== "string") {
      return res.status(400).json({ message: "typeof Name must is string" });
    }
    if (isNaN(Date.parse(dob)))
      return res.status(400).json({ message: "Invalid date format" });
    if (
      isForeigner === undefined ||
      isForeigner === null ||
      typeof isForeigner !== "boolean"
    ) {
      isForeigner = false;
    }
    await db
      .collection("players")
      .insertOne({ TeamID, name, dob, nationality, position, isForeigner });
    res.status(201).json({ message: "Created player successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a player", error });
  }
};
//Sua cau thu
const updatePlayer = async (req, res) => {
  const { team_id, name, dob, nationality, position, isForeigner } = req.body;
  const player_id = new ObjectId(req.params.id);
  if (!player_id)
    return res.status(400).json({ message: "Player ID is required" });
  try {
    const db = GET_DB();
    const TeamID = new ObjectId(team_id);
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) return res.status(404).json({ message: "player not found" });
    const Updatedfile = {};
    if (name) Updatedfile.name = name;
    if (dob) Updatedfile.dob = dob;
    if (nationality) Updatedfile.nationality = nationality;
    if (position) Updatedfile.position = position;
    if (isForeigner) Updatedfile.isForeigner = isForeigner;
    if (team_id) Updatedfile.team_id = TeamID;
    await db
      .collection("players")
      .updateOne({ _id: player_id }, { $set: Updatedfile });
    res.status(200).json({ message: "Updated player successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update player", error });
  }
};
//Xoa cau thu
const deletePlayer = async (req, res) => {
  const player_id = new ObjectId(req.params.id);
  if (!player_id)
    return res.status(400).json({ message: "Player ID is required" });
  try {
    const db = GET_DB();
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) return res.status(404).json({ message: "Player not found" });
    await db.collection("players").findOneAndDelete({ _id: player_id });
    res.status(200).json({ message: "Delete player successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete player", error });
  }
};
//Lay cau thu theo id doi
const getPlayersByIdTeam = async (req, res) => {
  const team_id = new ObjectId(req.params.id);
  if (!team_id) return res.status(400).json({ message: "Team ID is required" });
  try {
    const db = GET_DB();
    const team = await db.collection("teams").findOne({ _id: team_id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    const players = await db
      .collection("players")
      .find({ TeamID: team_id })
      .toArray();
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayersByIdTeam,
};
