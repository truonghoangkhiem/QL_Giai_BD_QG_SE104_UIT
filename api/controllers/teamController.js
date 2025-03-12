const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");
//Lay tat ca doi bong
const getTeams = async (req, res) => {
  try {
    const db = GET_DB();
    const teams = await db.collection("teams").find().toArray();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
//Lay doi bong theo iddoibong
const getTeamsByID = async (req, res) => {
  try {
    const db = GET_DB();
    const team_id = new ObjectId(req.params.id);
    const team = await db.collection("teams").findOne({ _id: team_id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
//Them doi bong
const createTeam = async (req, res) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;

  if (!season_id || !team_name || !stadium || !coach || !logo) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (
    typeof team_name !== "string" ||
    typeof stadium !== "string" ||
    typeof coach !== "string" ||
    typeof logo !== "string"
  ) {
    return res.status(400).json({ message: "Invalid input type" });
  }
  try {
    const db = GET_DB();
    const Check_season_id = new ObjectId(season_id);
    const season = await db
      .collection("seasons")
      .findOne({ _id: Check_season_id });
    if (!season) return res.status(404).json({ message: "Season not found" });
    const result = await db.collection("teams").insertOne({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });

    res
      .status(201)
      .json({ message: "Created team successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a team", error });
  }
};
//Sua doi bong
const updateTeam = async (req, res) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;

  if (season_id === undefined || !team_name || !stadium || !coach || !logo) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (
    typeof team_name !== "string" ||
    typeof stadium !== "string" ||
    typeof coach !== "string" ||
    typeof logo !== "string"
  ) {
    return res.status(400).json({ message: "Invalid input type" });
  }

  try {
    const db = GET_DB();
    const teamId = new ObjectId(req.params.id);

    const existingTeam = await db.collection("teams").findOne({ _id: teamId });
    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }

    const result = await db.collection("teams").updateOne(
      { _id: teamId },
      {
        $set: {
          season_id: ObjectId(season_id),
          team_name,
          stadium,
          coach,
          logo,
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
// Xoa doi bong
const deleteTeam = async (req, res) => {
  try {
    const db = GET_DB();
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
//Lay doi bong theo idseason
const getTeamsByIDSeason = async (req, res) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);

    console.log("Season ID received:", season_id);

    // Kiểm tra mùa giải
    const season = await db.collection("seasons").findOne({ _id: season_id });
    console.log("Season found:", season);

    // Tìm các đội bóng theo season_id
    const team = await db
      .collection("teams")
      .find({ season_id: season_id })
      .toArray();
    console.log("Found teams:", team);

    if (team.length === 0) {
      return res
        .status(404)
        .json({ message: "No teams found for this season" });
    }

    res.json(team); // Trả về danh sách các đội bóng
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
};
