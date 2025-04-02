// src/api/config/controllers/playerController.js

const Player = require("../../../../models/Player");
const Team = require("../../../../models/Team");
const Regulation = require("../../../../models/Regulation");
const {
  createPlayerSchema,
  updatePlayerSchema,
} = require("../../../../schemas/playerSchema.js");
const { successResponse } = require("../../../../utils/responseFormat");

const getPlayers = async (req, res, next) => {
  try {
    const players = await Player.find().populate("team_id");
    return successResponse(res, players, "Fetched players successfully");
  } catch (error) {
    return next(error);
  }
};

const getPlayerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id).populate("team_id");
    if (!player)
      return next(
        Object.assign(new Error("Player not found"), { status: 404 })
      );
    return successResponse(res, player, "Player found successfully");
  } catch (error) {
    return next(error);
  }
};

const createPlayer = async (req, res, next) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success)
    return next(
      Object.assign(new Error(parsed.error.errors[0].message), { status: 400 })
    );

  const { team_id, name, dob, nationality, position, isForeigner, number } =
    parsed.data;

  try {
    const team = await Team.findById(team_id);
    if (!team)
      return next(Object.assign(new Error("Team not found"), { status: 404 }));

    const regulation = await Regulation.findOne({
      season_id: team.season_id,
      regulation_name: "Age Regulation",
    });
    if (!regulation)
      return next(
        Object.assign(new Error("Regulation not found"), { status: 500 })
      );

    const { minAge, maxAge, maxForeignPlayers, maxPlayersPerTeam } =
      regulation.rules;

    const existingNumber = await Player.findOne({ team_id, number });
    if (existingNumber)
      return next(
        Object.assign(new Error("Player number already exists"), {
          status: 400,
        })
      );

    const players = await Player.find({ team_id });
    if (players.length >= maxPlayersPerTeam)
      return next(
        Object.assign(
          new Error(`Team already has maximum ${maxPlayersPerTeam} players`),
          { status: 400 }
        )
      );

    if (isForeigner) {
      const foreignCount = players.filter((p) => p.isForeigner).length;
      if (foreignCount >= maxForeignPlayers)
        return next(
          Object.assign(
            new Error(
              `Team can have only ${maxForeignPlayers} foreign players`
            ),
            { status: 400 }
          )
        );
    }

    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < minAge || age > maxAge)
      return next(
        Object.assign(
          new Error(`Player age must be between ${minAge} and ${maxAge}`),
          { status: 400 }
        )
      );

    await Player.create({
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
    return next(error);
  }
};

const updatePlayer = async (req, res, next) => {
  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success)
    return next(
      Object.assign(new Error(parsed.error.errors[0].message), { status: 400 })
    );

  const updates = parsed.data;
  const playerId = req.params.id;

  try {
    const player = await Player.findById(playerId);
    if (!player)
      return next(
        Object.assign(new Error("Player not found"), { status: 404 })
      );

    if (updates.number && updates.team_id) {
      const numberExists = await Player.findOne({
        team_id: updates.team_id,
        number: updates.number,
      });
      if (numberExists && numberExists._id.toString() !== playerId)
        return next(
          Object.assign(new Error("Player number already exists"), {
            status: 400,
          })
        );
    }

    await Player.findByIdAndUpdate(playerId, updates);
    return successResponse(res, null, "Updated player successfully");
  } catch (error) {
    return next(error);
  }
};

const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player)
      return next(
        Object.assign(new Error("Player not found"), { status: 404 })
      );

    await Player.findByIdAndDelete(req.params.id);
    return successResponse(res, null, "Deleted player successfully", 204);
  } catch (error) {
    return next(error);
  }
};

const getPlayersByIdTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team)
      return next(Object.assign(new Error("Team not found"), { status: 404 }));

    const players = await Player.find({ team_id: team._id });
    return successResponse(
      res,
      players,
      "Fetched players for team successfully"
    );
  } catch (error) {
    return next(error);
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
