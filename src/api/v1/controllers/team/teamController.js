const { GET_DB } = require("../../../config/db");

const { ObjectId } = require("mongodb");
const { successResponse } = require("../../../../utils/responseFormat");

// Lấy tất cả đội bóng
const getTeams = async (req, res, next) => {
  try {
    const db = GET_DB();
    const teams = await db.collection("teams").find().toArray();
    return successResponse(res, teams, "Fetched teams successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Lấy đội bóng theo ID
const getTeamsByID = async (req, res, next) => {
  try {
    const db = GET_DB();
    const team_id = new ObjectId(req.params.id);
    const team = await db.collection("teams").findOne({ _id: team_id });
    if (!team) return next(new Error("Team not found"));
    return successResponse(res, team, "Team found successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Thêm đội bóng
const createTeam = async (req, res, next) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;

  if (!season_id || !team_name || !stadium || !coach || !logo) {
    return next(new Error("All fields are required"));
  }
  try {
    const db = GET_DB();
    const Check_season_id = new ObjectId(season_id);
    const season = await db
      .collection("seasons")
      .findOne({ _id: Check_season_id });
    if (!season) return next(new Error("Season not found"));
    const existingTeam = await db
      .collection("teams")
      .findOne({ team_name, season_id: Check_season_id });
    if (existingTeam) return next(new Error("Team name already exists"));
    const result = await db.collection("teams").insertOne({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });

    return successResponse(
      res,
      { id: result.insertedId },
      "Created team successfully",
      201
    );
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Sửa đội bóng
const updateTeam = async (req, res, next) => {
  const { team_name, stadium, coach, logo } = req.body;
  try {
    const db = GET_DB();
    const teamId = new ObjectId(req.params.id);

    const existingTeam = await db.collection("teams").findOne({ _id: teamId });
    if (!existingTeam) return next(new Error("Team not found"));
    const updatedTeam = {};
    if (team_name) updatedTeam.team_name = team_name;
    if (stadium) updatedTeam.stadium = stadium;
    if (coach) updatedTeam.coach = coach;
    if (logo) updatedTeam.logo = logo;
    const checkExist = await db.collection("teams").findOne({
      team_name: updatedTeam.team_name,
      season_id: existingTeam.season_id,
    });
    if (checkExist) return next(new Error("Team name already exists"));
    const result = await db.collection("teams").updateOne(
      { _id: teamId },
      {
        $set: updateTeam,
      }
    );

    if (result.modifiedCount === 0) return next(new Error("No changes made"));

    return successResponse(res, null, "Team updated successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Xóa đội bóng
const deleteTeam = async (req, res, next) => {
  try {
    const db = GET_DB();
    const teamId = new ObjectId(req.params.id);

    const existingTeam = await db.collection("teams").findOne({ _id: teamId });
    if (!existingTeam) return next(new Error("Team not found"));

    await db.collection("teams").deleteOne({ _id: teamId });
    return successResponse(res, null, "Deleted team successfully", 204);
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Lấy đội bóng theo season_id
const getTeamsByIDSeason = async (req, res, next) => {
  try {
    const db = GET_DB();
    const season_id = new ObjectId(req.params.id);

    const season = await db.collection("seasons").findOne({ _id: season_id });
    if (!season) return next(new Error("Season not found"));

    const teams = await db.collection("teams").find({ season_id }).toArray();
    if (teams.length === 0) {
      return next(new Error("No teams found for this season"));
    }

    return successResponse(
      res,
      teams,
      "Fetched teams successfully for this season"
    );
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
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
