const { GET_DB } = require("../../../config/db");
const { ObjectId } = require("mongodb");
const { successResponse } = require("../../../../utils/responseFormat");

// Lấy tất cả cầu thủ
const getPlayers = async (req, res, next) => {
  try {
    const db = GET_DB();
    const players = await db.collection("players").find().toArray();
    return successResponse(res, players, "Fetched players successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Lấy cầu thủ theo id
const getPlayerById = async (req, res, next) => {
  try {
    const db = GET_DB();
    const player_id = new ObjectId(req.params.id);
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) {
      const error = new Error("Player not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    return successResponse(res, player, "Player found successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Thêm cầu thủ
const createPlayer = async (req, res, next) => {
  const { team_id, name, dob, nationality, position, isForeigner, number } =
    req.body;
  if (
    !team_id ||
    !name ||
    !dob ||
    !nationality ||
    !position ||
    !number ||
    isForeigner === undefined
  ) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const TeamID = new ObjectId(team_id);
    const team = await db.collection("teams").findOne({ _id: TeamID });
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (typeof name !== "string" && typeof number !== "string") {
      const error = new Error("Type of Name and Number must be string");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (isNaN(Date.parse(dob))) {
      const error = new Error("Invalid date format");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (
      isForeigner === undefined ||
      isForeigner === null ||
      typeof isForeigner !== "boolean"
    ) {
      isForeigner = false;
    }
    const seasonRegulation = await db.collection("regulations").findOne({
      season_id: team.season_id,
      regulation_name: "Age Regulation",
    });
    const checkExistPlayer = await db
      .collection("players")
      .findOne({ team_id: TeamID, number: number });
    if (checkExistPlayer) {
      const error = new Error("Player number already exists");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    if (!seasonRegulation) {
      const error = new Error("Regulation not found");
      error.status = 500;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const { minAge, maxAge, maxForeignPlayers, maxPlayersPerTeam } =
      seasonRegulation.rules;

    // Kiểm tra tuổi cầu thủ
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const playerAge = currentYear - birthYear;

    if (playerAge < minAge || playerAge > maxAge) {
      const error = new Error(
        `Player age must be between ${minAge} and ${maxAge}`
      );
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Kiểm tra số lượng cầu thủ của đội
    const teamPlayers = await db
      .collection("players")
      .find({ team_id })
      .toArray();
    if (teamPlayers.length >= maxPlayersPerTeam) {
      const error = new Error(
        `Team already has maximum ${maxPlayersPerTeam} players`
      );
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    // Kiểm tra số lượng cầu thủ nước ngoài
    const foreignPlayers = teamPlayers.filter((p) => p.isForeigner).length;
    if (isForeigner && foreignPlayers >= maxForeignPlayers) {
      const error = new Error(
        `Team can have only ${maxForeignPlayers} foreign players`
      );
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }

    await db.collection("players").insertOne({
      team_id,
      name,
      dob,
      nationality,
      position,
      isForeigner,
      number,
    });
    return successResponse(res, null, "Created player successfully", 201);
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Cập nhật cầu thủ
const updatePlayer = async (req, res, next) => {
  const { team_id, name, dob, nationality, position, isForeigner, number } =
    req.body;
  const player_id = new ObjectId(req.params.id);
  if (!player_id) {
    const error = new Error("Player ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const TeamID = new ObjectId(team_id);
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) {
      const error = new Error("Player not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const Updatedfile = {};
    if (name) Updatedfile.name = name;
    if (dob) Updatedfile.dob = dob;
    if (nationality) Updatedfile.nationality = nationality;
    if (position) Updatedfile.position = position;
    if (isForeigner) Updatedfile.isForeigner = isForeigner;
    if (team_id) Updatedfile.team_id = TeamID;
    if (number) {
      const checkExistPlayer = await db
        .collection("players")
        .findOne({ team_id: TeamID, number: number });
      if (checkExistPlayer) {
        const error = new Error("Player number already exists");
        error.status = 400;
        return next(error); // Ném lỗi cho middleware xử lý
      }
      Updatedfile.number = number;
    }
    if (isNaN(Date.parse(dob))) {
      const error = new Error("Invalid date format");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    await db
      .collection("players")
      .updateOne({ _id: player_id }, { $set: Updatedfile });
    return successResponse(res, null, "Updated player successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Xóa cầu thủ
const deletePlayer = async (req, res, next) => {
  const player_id = new ObjectId(req.params.id);
  if (!player_id) {
    const error = new Error("Player ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const player = await db.collection("players").findOne({ _id: player_id });
    if (!player) {
      const error = new Error("Player not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    await db.collection("players").findOneAndDelete({ _id: player_id });
    return successResponse(res, null, "Deleted player successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Lấy cầu thủ theo id đội
const getPlayersByIdTeam = async (req, res, next) => {
  const team_id = new ObjectId(req.params.id);
  if (!team_id) {
    const error = new Error("Team ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const team = await db.collection("teams").findOne({ _id: team_id });
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const players = await db.collection("players").find({ team_id }).toArray();
    return successResponse(
      res,
      players,
      "Fetched players for team successfully"
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
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
