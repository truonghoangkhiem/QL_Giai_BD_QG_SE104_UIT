import MatchLineup from "../../../../models/MatchLineup.js";
import Match from "../../../../models/Match.js";
import Team from "../../../../models/Team.js";
import Player from "../../../../models/Player.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  createOrUpdateMatchLineupSchema,
  MatchIdParamSchema,
  TeamIdParamSchema
} from "../../../../schemas/matchLineupSchema.js";
import mongoose from "mongoose";

// Create or Update a Match Lineup for a team
export const createOrUpdateLineup = async (req, res, next) => {
  const parseResult = createOrUpdateMatchLineupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }

  const { match_id, team_id, season_id, players } = parseResult.data;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const match = await Match.findById(match_id).session(session);
    if (!match) {
      throw Object.assign(new Error("Match not found"), { status: 404 });
    }
    if (match.season_id.toString() !== season_id) {
        throw Object.assign(new Error("Season ID in lineup does not match match's season ID"), { status: 400 });
    }

    const team = await Team.findById(team_id).session(session);
    if (!team) {
      throw Object.assign(new Error("Team not found"), { status: 404 });
    }
     if (team.season_id.toString() !== season_id) {
        throw Object.assign(new Error("Season ID in lineup does not match team's season ID"), { status: 400 });
    }

    const playerIds = players.map(p => p.player_id);
    const foundPlayers = await Player.find({ _id: { $in: playerIds }, team_id: team_id }).session(session);
    if (foundPlayers.length !== playerIds.length) {
      throw Object.assign(new Error("One or more players not found or do not belong to the specified team"), { status: 400 });
    }

    const ageRegulation = await Regulation.findOne({
        season_id: match.season_id,
        regulation_name: "Age Regulation",
    }).session(session);

    if (!ageRegulation || !ageRegulation.rules || typeof ageRegulation.rules.minPlayersPerTeam !== 'number' || typeof ageRegulation.rules.maxPlayersPerTeam !== 'number') {
        throw Object.assign(new Error("Age Regulation with player count limits not found or invalid for this season."), {
            status: 400,
        });
    }
    const { minPlayersPerTeam, maxPlayersPerTeam } = ageRegulation.rules;

    if (players.length < minPlayersPerTeam) {
        throw Object.assign(new Error(`Lineup must have at least ${minPlayersPerTeam} players as per Age Regulation.`), { status: 400 });
    }
    if (players.length > maxPlayersPerTeam) { 
        throw Object.assign(new Error(`Lineup cannot exceed ${maxPlayersPerTeam} players as per Age Regulation for team registration. If this is for active players in match, adjust regulation or logic.`), { status: 400 });
    }

    const lineup = await MatchLineup.findOneAndUpdate(
      { match_id, team_id },
      { match_id, team_id, season_id, players },
      { new: true, upsert: true, runValidators: true, session }
    );

    await session.commitTransaction();
    session.endSession();
    // Use isNew property from findOneAndUpdate with upsert to determine status code
    const isNew = !lineup.createdAt || lineup.createdAt.getTime() === lineup.updatedAt.getTime(); // Heuristic for new
    return successResponse(res, lineup, "Lineup created/updated successfully", isNew ? 201 : 200);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.code === 11000) { 
        return next(Object.assign(new Error("Lineup for this team in this match already exists. Use PUT to update."), { status: 409 }));
    }
    console.error("Error in createOrUpdateLineup:", error);
    return next(error);
  }
};

// Get Lineups for a Match
export const getLineupsByMatchId = async (req, res, next) => {
  const parseResult = MatchIdParamSchema.safeParse(req.params);
   if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }
  const { match_id } = parseResult.data;

  try {
    const lineups = await MatchLineup.find({ match_id })
      .populate({
          path: 'team_id',
          select: 'team_name logo'
      })
      .populate({
          path: 'players.player_id',
          select: 'name number dob nationality position isForeigner' 
      });

    if (!lineups || lineups.length === 0) {
      return successResponse(res, [], "No lineups found for this match");
    }
    return successResponse(res, lineups, "Lineups fetched successfully");
  } catch (error) {
    console.error("Error in getLineupsByMatchId:", error);
    return next(error);
  }
};

// Get Lineup for a specific Team in a Match
export const getLineupByMatchAndTeamId = async (req, res, next) => {
  const matchParamsResult = MatchIdParamSchema.safeParse({match_id: req.params.match_id});
  const teamParamsResult = TeamIdParamSchema.safeParse({team_id: req.params.team_id});

  if (!matchParamsResult.success) {
    return next(Object.assign(new Error(matchParamsResult.error.errors[0].message), { status: 400 }));
  }
  if (!teamParamsResult.success) {
    return next(Object.assign(new Error(teamParamsResult.error.errors[0].message), { status: 400 }));
  }

  const { match_id } = matchParamsResult.data;
  const { team_id } = teamParamsResult.data;

  try {
    const lineup = await MatchLineup.findOne({ match_id, team_id })
      .populate({
          path: 'team_id',
          select: 'team_name logo'
      })
      .populate({
          path: 'players.player_id',
          select: 'name number dob nationality position isForeigner'
      });

    if (!lineup) {
      return next(Object.assign(new Error("Lineup not found"), { status: 404 }));
    }
    return successResponse(res, lineup, "Lineup fetched successfully");
  } catch (error) {
     console.error("Error in getLineupByMatchAndTeamId:", error);
    return next(error);
  }
};

// Delete a Match Lineup
export const deleteLineup = async (req, res, next) => {
  const matchParamsResult = MatchIdParamSchema.safeParse({match_id: req.params.match_id});
  const teamParamsResult = TeamIdParamSchema.safeParse({team_id: req.params.team_id});

  if (!matchParamsResult.success) {
    return next(Object.assign(new Error(matchParamsResult.error.errors[0].message), { status: 400 }));
  }
  if (!teamParamsResult.success) {
    return next(Object.assign(new Error(teamParamsResult.error.errors[0].message), { status: 400 }));
  }

  const { match_id } = matchParamsResult.data;
  const { team_id } = teamParamsResult.data;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await MatchLineup.findOneAndDelete({ match_id, team_id }).session(session);
    if (!result) {
      throw Object.assign(new Error("Lineup not found to delete"), { status: 404 });
    }
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, null, "Lineup deleted successfully", 200);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in deleteLineup:", error);
    return next(error);
  }
};