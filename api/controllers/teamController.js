const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

const getTeams = async (req, res) => {
  try {
    const db = getDB();
    const teams = await db.collection("teams").find().toArray();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

const createTeam = async (req, res) => {
  const {
    team_name,
    logo_url,
    team_points,
    goals_scored,
    goals_conceded,
    team_wins,
    team_draws,
    team_losses,
  } = req.body;

  if (
    !team_name ||
    !logo_url ||
    team_points === undefined ||
    goals_scored === undefined ||
    goals_conceded === undefined ||
    team_wins === undefined ||
    team_draws === undefined ||
    team_losses === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const db = getDB();
    const result = await db.collection("teams").insertOne({
      team_name,
      logo_url,
      team_points,
      goals_scored,
      goals_conceded,
      team_wins,
      team_draws,
      team_losses,
      createdAt: new Date(),
    });

    res
      .status(201)
      .json({ message: "Created team successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a team", error });
  }
};

const updateTeam = async (req, res) => {
  const { id } = req.params;
  const {
    team_name,
    logo_url,
    team_points,
    goals_scored,
    goals_conceded,
    team_wins,
    team_draws,
    team_losses,
  } = req.body;

  if (
    !team_name ||
    !logo_url ||
    team_points === undefined ||
    goals_scored === undefined ||
    goals_conceded === undefined ||
    team_wins === undefined ||
    team_draws === undefined ||
    team_losses === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const db = getDB();
    const teamId = new ObjectId(id);

    const existingTeam = await db.collection("teams").findOne({ _id: teamId });
    if (!existingTeam)
      return res.status(404).json({ message: "Team not found" });

    const result = await db.collection("teams").updateOne(
      { _id: teamId },
      {
        $set: {
          team_name,
          logo_url,
          team_points,
          goals_scored,
          goals_conceded,
          team_wins,
          team_draws,
          team_losses,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0)
      return res.status(400).json({ message: "No changes made" });

    res.json({ message: "Team updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update a team", error });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const db = getDB();
    const teamId = new ObjectId(req.params.id);

    const existingTeam = await db.collection("teams").findOne({ _id: teamId });
    if (!existingTeam)
      return res.status(404).json({ message: "Team not found" });

    await db.collection("teams").deleteOne({ _id: teamId });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team", error });
  }
};

module.exports = { getTeams, createTeam, updateTeam, deleteTeam };
