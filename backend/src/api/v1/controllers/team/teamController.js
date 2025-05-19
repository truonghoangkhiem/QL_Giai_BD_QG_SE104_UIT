// backend/src/api/v1/controllers/team/teamController.js
import Team from "../../../../models/Team.js";
import Season from "../../../../models/Season.js";
import Player from "../../../../models/Player.js";
import Match from "../../../../models/Match.js";
import TeamResult from "../../../../models/TeamResult.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import Ranking from "../../../../models/Ranking.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdSchema,
  NameTeamSchema,
} from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import mongoose from "mongoose";

// Import các hàm helper nếu cần (ví dụ: từ rankingController, player_resultsController, ...)
import { updateTeamResultsForDateInternal } from "./team_resultsController.js"; // Giả sử có hàm này được export
import { calculateAndSaveTeamRankings } from "./rankingController.js"; // Giả sử có hàm này được export
import { updatePlayerResultsForDateInternal } from "../player/player_resultsController.js"; // Giả sử có hàm này
import { calculateAndSavePlayerRankings } from "../player/player_rankingsController.js"; // Giả sử có hàm này


// Lấy tất cả đội bóng
const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().populate("season_id");
    return successResponse(res, teams, "Fetched teams successfully");
  } catch (error) {
    return next(error);
  }
};

// Lấy đội bóng theo tên và ID mùa giải
const getTeamsByNameAndSeasonId = async (req, res, next) => {
  const season_id_param = req.params.season_id;
  const team_name_param = req.params.team_name;

  try {
    const { success: nameSuccess, error: nameError } = NameTeamSchema.safeParse({ team_name: team_name_param });
    if (!nameSuccess) {
      const validationError = new Error(nameError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    if (!mongoose.Types.ObjectId.isValid(season_id_param)) {
      const validationError = new Error("Invalid season_id format");
      validationError.status = 400;
      return next(validationError);
    }
    const seasonIdObj = new mongoose.Types.ObjectId(season_id_param);

    const { success: idSuccess, error: idError } = SeasonIdSchema.safeParse({
      id: season_id_param,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team = await Team.findOne({ team_name: team_name_param, season_id: seasonIdObj });
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    return successResponse(res, team, "Fetched team successfully");
  } catch (error) {
    return next(error);
  }
};

// Lấy đội bóng theo ID
const getTeamsByID = async (req, res, next) => {
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const team_id_obj = new mongoose.Types.ObjectId(req.params.id);
    const team = await Team.findById(team_id_obj).populate("season_id");
    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }
    return successResponse(res, team, "Team found successfully");
  } catch (error) {
    return next(error);
  }
};

// Thêm đội bóng (CHỈ TẠO TEAM, KHÔNG TẠO TEAM_RESULT HAY RANKING)
const createTeam = async (req, res, next) => {
  const { season_id, team_name, stadium, coach, logo } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = CreateTeamSchema.safeParse({
      season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const Check_season_id = new mongoose.Types.ObjectId(season_id);
    const season = await Season.findById(Check_season_id).session(session);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      throw error;
    }

    const existingTeam = await Team.findOne({
      team_name,
      season_id: Check_season_id,
    }).session(session);
    if (existingTeam) {
      const error = new Error("Team name already exists in this season");
      error.status = 400;
      throw error;
    }

    const newTeam = new Team({
      season_id: Check_season_id,
      team_name,
      stadium,
      coach,
      logo,
    });
    const savedTeam = await newTeam.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Trả về thông tin đội bóng vừa tạo.
    // Frontend sẽ chịu trách nhiệm gọi API tạo TeamResult và Ranking.
    return successResponse(
      res,
      savedTeam, // Trả về object Team đầy đủ
      "Created team successfully. Frontend should now create initial TeamResult and Ranking.",
      201
    );
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in createTeam:", error);
    return next(error);
  }
};

// Sửa đội bóng
const updateTeam = async (req, res, next) => {
  const { team_name, stadium, coach, logo } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success: idSuccess, error: idError } = TeamIdSchema.safeParse({
      id: req.params.id,
    });
    if (!idSuccess) {
      const validationError = new Error(idError.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const { success, error } = UpdateTeamSchema.safeParse({
      team_name,
      stadium,
      coach,
      logo,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const existingTeam = await Team.findById(teamId).session(session);
    if (!existingTeam) {
      const error = new Error("Team not found");
      error.status = 404;
      throw error;
    }

    const updatedTeamData = {};
    if (team_name) updatedTeamData.team_name = team_name;
    if (stadium) updatedTeamData.stadium = stadium;
    if (coach) updatedTeamData.coach = coach;
    if (logo) updatedTeamData.logo = logo;

    if (team_name && team_name !== existingTeam.team_name) {
      const checkExist = await Team.findOne({
        team_name,
        season_id: existingTeam.season_id,
        _id: { $ne: teamId },
      }).session(session);
      if (checkExist) {
        const error = new Error("Team name already exists in this season");
        error.status = 400;
        throw error;
      }
    }
    
    if (Object.keys(updatedTeamData).length === 0) {
        await session.abortTransaction(); // Không có gì thay đổi, không cần commit
        session.endSession();
        return successResponse(res, existingTeam, "No changes made to the team");
    }

    const result = await Team.findByIdAndUpdate(teamId, { $set: updatedTeamData }, { new: true, session });
    if (!result) {
        const error = new Error("Team not found during update"); // Should not happen if existingTeam was found
        error.status = 404;
        throw error;
    }

    await session.commitTransaction();
    session.endSession();
    return successResponse(res, result, "Team updated successfully");
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    return next(error);
  }
};


// Hàm tính toán lại dữ liệu mùa giải (đã điều chỉnh)
const recalculateSeasonData = async (season_id_str, excluded_team_id_str = null) => {
    console.log(`Recalculating data for season ${season_id_str}, excluding team ${excluded_team_id_str}`);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const seasonId = new mongoose.Types.ObjectId(season_id_str);
        const excludedTeamObjectId = excluded_team_id_str ? new mongoose.Types.ObjectId(excluded_team_id_str) : null;

        const rankingRegulation = await Regulation.findOne({ season_id: seasonId, regulation_name: "Ranking Rules" }).session(session);
        if (!rankingRegulation || !rankingRegulation.rules) {
            throw new Error("Ranking Regulation not found or rules not defined for the season.");
        }
        const teamRegulationRules = {
            winPoints: rankingRegulation.rules.winPoints || 3,
            drawPoints: rankingRegulation.rules.drawPoints || 1,
            losePoints: rankingRegulation.rules.losePoints || 0,
        };
        const rankingCriteria = rankingRegulation.rules.rankingCriteria || ['points', 'goalsDifference', 'goalsFor'];


        const matchesQuery = { season_id: seasonId, score: { $ne: null, $regex: /^\d+-\d+$/ } };
        if (excludedTeamObjectId) {
            matchesQuery.$nor = [
                { team1: excludedTeamObjectId },
                { team2: excludedTeamObjectId }
            ];
        }
        const relevantMatches = await Match.find(matchesQuery).populate('team1 team2 goalDetails.player_id').session(session);

        const teamsQuery = { season_id: seasonId };
        if (excludedTeamObjectId) {
            teamsQuery._id = { $ne: excludedTeamObjectId };
        }
        const activeTeams = await Team.find(teamsQuery).session(session);
        const activeTeamIds = activeTeams.map(t => t._id);
        
        const playersQuery = { team_id: { $in: activeTeamIds }};
        // Không cần loại trừ cầu thủ của đội bị xóa ở đây nữa vì activeTeamIds đã loại trừ đội đó
        const activePlayers = await Player.find(playersQuery).session(session);
        const activePlayerIds = activePlayers.map(p => p._id);


        // Xóa TeamResult, Ranking, PlayerResult, PlayerRanking CŨ của các đội/cầu thủ CÒN LẠI trong mùa giải
        await TeamResult.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds } }).session(session);
        await Ranking.deleteMany({ season_id: seasonId, team_id: { $in: activeTeamIds } }).session(session);
        await PlayerResult.deleteMany({ season_id: seasonId, player_id: { $in: activePlayerIds } }).session(session);
        await PlayerRanking.deleteMany({ season_id: seasonId, player_id: { $in: activePlayerIds } }).session(session);

        const season = await Season.findById(seasonId).session(session);
        if (!season) throw new Error("Season not found for recalculation.");
        const seasonStartDate = new Date(season.start_date);
        seasonStartDate.setUTCHours(0, 0, 0, 0);

        // Tạo TeamResult và PlayerResult ban đầu cho ngày bắt đầu mùa giải cho các đội/cầu thủ CÒN LẠI
        for (const team of activeTeams) {
            await TeamResult.create([{
                team_id: team._id,
                season_id: seasonId,
                date: seasonStartDate,
            }], { session });

            const playersOfTeam = activePlayers.filter(p => p.team_id.equals(team._id));
            for (const player of playersOfTeam) {
                await PlayerResult.create([{
                    player_id: player._id,
                    season_id: seasonId,
                    team_id: team._id,
                    date: seasonStartDate,
                }], { session });
            }
        }
        
        const allMatchDatesInvolved = [...new Set(relevantMatches.map(m => new Date(m.date).toISOString().split('T')[0]))];
        const datesToProcess = [...new Set([seasonStartDate.toISOString().split('T')[0], ...allMatchDatesInvolved])]
                                .sort((a,b) => new Date(a) - new Date(b));

        for (const dateStr of datesToProcess) {
            const currentDate = new Date(dateStr);
            currentDate.setUTCHours(0,0,0,0);

            for (const team of activeTeams) {
                await updateTeamResultsForDateInternal(team._id, seasonId, currentDate, teamRegulationRules, session);
                const playersOfTeam = activePlayers.filter(p => p.team_id.equals(team._id));
                for (const player of playersOfTeam) {
                    await updatePlayerResultsForDateInternal(player._id, team._id, seasonId, currentDate, session);
                }
            }
        }

        for (const dateStr of datesToProcess) {
            const currentDate = new Date(dateStr);
            currentDate.setUTCHours(0,0,0,0);
            await calculateAndSaveTeamRankings(seasonId, currentDate, session); // Sử dụng hàm đã export
            await calculateAndSavePlayerRankings(seasonId, currentDate, session); // Sử dụng hàm đã export
        }

        await session.commitTransaction();
        console.log(`Recalculation for season ${season_id_str} (excluding team ${excluded_team_id_str || 'none'}) completed successfully.`);
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error during season data recalculation for season ${season_id_str}:`, error);
    } finally {
        session.endSession();
    }
};


// Xóa đội bóng
const deleteTeam = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: req.params.id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError; 
    }

    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const teamToDelete = await Team.findById(teamId).session(session);
    if (!teamToDelete) {
      const error = new Error("Team not found");
      error.status = 404;
      throw error;
    }

    const seasonId = teamToDelete.season_id; // Đây là ObjectId

    // 1. Delete Players of the team
    const playersToDelete = await Player.find({ team_id: teamId }).session(session);
    const playerIdsToDelete = playersToDelete.map(p => p._id);

    if (playerIdsToDelete.length > 0) {
      // Delete PlayerResults and PlayerRankings for these players IN THIS SPECIFIC season
      await PlayerResult.deleteMany({ player_id: { $in: playerIdsToDelete }, season_id: seasonId }).session(session);
      await PlayerRanking.deleteMany({ player_id: { $in: playerIdsToDelete }, season_id: seasonId }).session(session);
      await Player.deleteMany({ _id: { $in: playerIdsToDelete } }).session(session); // Xóa cầu thủ
    }

    // 2. Delete Matches involving the team IN THIS SPECIFIC season
    // (Nếu một đội có thể tham gia nhiều mùa giải, cần cẩn thận hơn. Giả định đội chỉ thuộc 1 mùa.)
    await Match.deleteMany({ season_id: seasonId, $or: [{ team1: teamId }, { team2: teamId }] }).session(session);

    // 3. Delete TeamResult for this team IN THIS SPECIFIC season
    await TeamResult.deleteMany({ team_id: teamId, season_id: seasonId }).session(session);

    // 4. Delete Ranking for this team IN THIS SPECIFIC season
    await Ranking.deleteMany({ team_id: teamId, season_id: seasonId }).session(session);

    // 5. Delete the Team itself
    await Team.deleteOne({ _id: teamId }).session(session);
    
    await session.commitTransaction(); 
    session.endSession(); // Kết thúc session trước khi gọi recalculate

    // 6. Recalculate data cho mùa giải, loại trừ đội vừa xóa
    // Hàm này sẽ chạy trong session riêng của nó.
    await recalculateSeasonData(seasonId.toString(), teamId.toString());

    return successResponse(res, null, "Deleted team and initiated season data recalculation successfully", 200);

  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in deleteTeam:", error); 
    return next(error);
  }
};

// Lấy đội bóng theo season_id
const getTeamsByIDSeason = async (req, res, next) => {
  try {
    const { success, error } = SeasonIdSchema.safeParse({ id: req.params.season_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const season_id_obj = new mongoose.Types.ObjectId(req.params.season_id);
    const season = await Season.findById(season_id_obj);
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error);
    }
    const teams = await Team.find({ season_id: season_id_obj }).populate("season_id");
    if (teams.length === 0) {
      return successResponse(res, [], "No teams found for this season");
    }
    return successResponse(
      res,
      teams,
      "Fetched teams successfully for this season"
    );
  } catch (error) {
    console.error("Error in getTeamsByIDSeason:", error);
    return next(error);
  }
};

export {
  getTeams,
  getTeamsByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByIDSeason,
  getTeamsByNameAndSeasonId,
  recalculateSeasonData,
};