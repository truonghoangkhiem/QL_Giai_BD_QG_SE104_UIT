import Player from "../../../../models/Player.js";
import Team from "../../../../models/Team.js";
import Regulation from "../../../../models/Regulation.js";
import PlayerResult from "../../../../models/PlayerResult.js"; // Thêm import
import PlayerRanking from "../../../../models/PlayerRanking.js"; // Thêm import
import Match from "../../../../models/Match.js"; // Thêm import
import { calculateAndSavePlayerRankings } from "./player_rankingsController.js"; // Thêm import hàm helper

import {
  createPlayerSchema,
  updatePlayerSchema,
  getPlayerByNameAndNumberSchema,
} from "../../../../schemas/playerSchema.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import { TeamIdSchema } from "../../../../schemas/teamSchema.js";
import mongoose from "mongoose";

const getPlayers = async (req, res, next) => {
  try {
    const players = await Player.find().populate("team_id");
    return successResponse(res, players, "Fetched players successfully");
  } catch (error) {
    return next(error);
  }
};

const getPlayerByNamePlayerAndNumberAndTeamId = async (req, res, next) => {
  const { team_id, number, name_player } = req.params;
  try {
    const { success, error } = TeamIdSchema.safeParse({ id: team_id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const TeamId = new mongoose.Types.ObjectId(team_id); // Sửa lỗi 'TeamId is not defined'
    const { success: numberSuccess, error: numberError } =
      getPlayerByNameAndNumberSchema.safeParse({ name_player, number });
    if (!numberSuccess) {
      const validationError = new Error(numberError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const player = await Player.findOne({
      team_id: TeamId,
      number,
      name: { $regex: name_player, $options: "i" },
    });
    if (!player)
      return next(
        Object.assign(new Error("Player not found"), { status: 404 })
      );
    return successResponse(res, player, "Player found successfully");
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const team = await Team.findById(team_id).session(session);
    if (!team) {
      throw Object.assign(new Error("Team not found"), { status: 404 });
    }
    
    const teamSeasonId = team.season_id; // Lấy season_id từ team

    const regulation = await Regulation.findOne({
      season_id: teamSeasonId, // Sử dụng teamSeasonId
      regulation_name: "Age Regulation",
    }).session(session);

    if (!regulation) {
      throw Object.assign(new Error("Regulation not found for the team's season"), { status: 500 });
    }
      
    const { minAge, maxAge, maxForeignPlayers, maxPlayersPerTeam } =
      regulation.rules;

    const existingNumber = await Player.findOne({ team_id, number }).session(session);
    if (existingNumber) {
      throw Object.assign(new Error("Player number already exists in this team"), {
          status: 400,
        });
    }
      
    const playersInTeam = await Player.find({ team_id }).session(session);
    if (playersInTeam.length >= maxPlayersPerTeam) {
      throw Object.assign(
          new Error(`Team already has maximum ${maxPlayersPerTeam} players`),
          { status: 400 }
        );
    }
      
    if (isForeigner) {
      const foreignCount = playersInTeam.filter((p) => p.isForeigner).length;
      if (foreignCount >= maxForeignPlayers) {
        throw Object.assign(
            new Error(
              `Team can have only ${maxForeignPlayers} foreign players`
            ),
            { status: 400 }
          );
      }
    }

    const birthDate = new Date(dob);
    const currentDate = new Date();
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < minAge || age > maxAge) {
      throw Object.assign(
          new Error(`Player age must be between ${minAge} and ${maxAge}. Current age: ${age}`),
          { status: 400 }
        );
    }
      
    const newPlayer = new Player({
      team_id,
      name,
      dob,
      nationality,
      position,
      isForeigner,
      number,
    });
    const savedPlayer = await newPlayer.save({ session });

    // Tự động tạo PlayerResult và PlayerRanking
    const seasonOfTeam = await Team.findById(team_id).populate('season_id').session(session);
    if (!seasonOfTeam || !seasonOfTeam.season_id || !seasonOfTeam.season_id.start_date) {
        throw Object.assign(new Error("Could not determine season start date for the team."), { status: 500 });
    }
    const initialDate = new Date(seasonOfTeam.season_id.start_date);
    initialDate.setUTCHours(0,0,0,0);

    const playerResult = new PlayerResult({
        player_id: savedPlayer._id,
        season_id: teamSeasonId, // Sử dụng teamSeasonId
        team_id: savedPlayer.team_id,
        matchesplayed: 0,
        totalGoals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        date: initialDate,
    });
    const savedPlayerResult = await playerResult.save({ session });

    const playerRanking = new PlayerRanking({
        season_id: teamSeasonId, // Sử dụng teamSeasonId
        player_results_id: savedPlayerResult._id,
        player_id: savedPlayer._id,
        rank: 0, // Sẽ được cập nhật sau
        date: initialDate,
    });
    await playerRanking.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    return successResponse(res, savedPlayer, "Created player and initial records successfully", 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in createPlayer:", error);
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
    if (!player) {
      return next(
        Object.assign(new Error("Player not found"), { status: 404 })
      );
    }
    
    const targetTeamId = updates.team_id || player.team_id.toString();

    // Kiểm tra ràng buộc nếu có thay đổi quan trọng (số áo, đội, quốc tịch, ngày sinh)
     if (updates.number && updates.number !== player.number) {
        const numberExists = await Player.findOne({
            team_id: targetTeamId,
            number: updates.number,
            _id: { $ne: playerId } 
        });
        if (numberExists) {
            return next(Object.assign(new Error("Player number already exists in this team"), { status: 400 }));
        }
    }

    const team = await Team.findById(targetTeamId);
    if (!team) {
        return next(Object.assign(new Error("Target team not found"), { status: 404 }));
    }
    const teamSeasonId = team.season_id;

    const regulation = await Regulation.findOne({
        season_id: teamSeasonId,
        regulation_name: "Age Regulation",
    });

    if (!regulation) {
        return next(Object.assign(new Error("Regulation not found for the team's season"), { status: 500 }));
    }
    const { minAge, maxAge, maxForeignPlayers, maxPlayersPerTeam } = regulation.rules;

    // Kiểm tra maxForeignPlayers nếu isForeigner thay đổi hoặc cầu thủ chuyển đội
    if (updates.isForeigner !== undefined || (updates.team_id && updates.team_id !== player.team_id.toString())) {
        const isPotentiallyForeign = updates.isForeigner !== undefined ? updates.isForeigner : player.isForeigner;
        if (isPotentiallyForeign) {
            const playersInTargetTeam = await Player.find({ team_id: targetTeamId, _id: { $ne: playerId } });
            const foreignCount = playersInTargetTeam.filter(p => p.isForeigner).length;
            if (foreignCount >= maxForeignPlayers) {
                 return next(Object.assign(new Error(`Target team already has maximum ${maxForeignPlayers} foreign players`), { status: 400 }));
            }
        }
    }
    
    // Kiểm tra tuổi nếu dob thay đổi
    if (updates.dob) {
        const birthDate = new Date(updates.dob);
        const currentDate = new Date();
        let age = currentDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = currentDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < minAge || age > maxAge) {
            return next(Object.assign(new Error(`Player age must be between ${minAge} and ${maxAge}. Proposed age: ${age}`), { status: 400 }));
        }
    }

    const updatedPlayer = await Player.findByIdAndUpdate(playerId, updates, { new: true });
     if (!updatedPlayer) { // Should not happen if player was found initially
        return next(Object.assign(new Error("Player not found during update"), { status: 404 }));
    }
    return successResponse(res, updatedPlayer, "Updated player successfully");
  } catch (error) {
    console.error("Error in updatePlayer:", error);
    return next(error);
  }
};

const deletePlayer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const player = await Player.findById(req.params.id).session(session);
    if (!player) {
      throw Object.assign(new Error("Player not found"), { status: 404 });
    }

    const playerId = player._id;

    // Tìm tất cả PlayerResult của cầu thủ này
    const playerResultsToDelete = await PlayerResult.find({ player_id: playerId }).session(session);
    const playerResultIdsToDelete = playerResultsToDelete.map(pr => pr._id);
    const affectedSeasonIds = [...new Set(playerResultsToDelete.map(pr => pr.season_id.toString()))];

    // Xóa PlayerRanking liên quan đến các PlayerResult đó
    if (playerResultIdsToDelete.length > 0) {
      await PlayerRanking.deleteMany({ player_results_id: { $in: playerResultIdsToDelete } }).session(session);
    }

    // Xóa PlayerResult
    await PlayerResult.deleteMany({ player_id: playerId }).session(session);

    // Xóa Player
    await Player.findByIdAndDelete(playerId).session(session);
    
    await session.commitTransaction();
    session.endSession(); // Kết thúc session trước khi gọi hàm tính toán lại

    // Sau khi transaction thành công, tính toán lại bảng xếp hạng cầu thủ cho các mùa giải bị ảnh hưởng
    // Điều này được thực hiện bên ngoài transaction để tránh lỗi "Cannot use a session that has ended"
    // nếu calculateAndSavePlayerRankings cũng sử dụng session mới.
    for (const seasonId of affectedSeasonIds) {
        const seasonObjectId = new mongoose.Types.ObjectId(seasonId);
        // Tìm trận đấu cuối cùng có kết quả trong mùa giải đó để làm ngày tham chiếu
        const lastMatchWithScore = await Match.findOne({
            season_id: seasonObjectId,
            score: { $ne: null, $regex: /^\d+-\d+$/ }
        }).sort({ date: -1 });

        if (lastMatchWithScore) {
            const dateForRanking = new Date(lastMatchWithScore.date);
            dateForRanking.setUTCHours(0,0,0,0);
            // Gọi hàm helper từ player_rankingsController
            // Hàm này cần được thiết kế để có thể chạy độc lập hoặc chấp nhận session (nếu cần)
            // Hiện tại, chúng ta sẽ gọi nó mà không truyền session, nó sẽ tự quản lý.
            await calculateAndSavePlayerRankings(seasonObjectId, dateForRanking); 
            console.log(`Recalculated player rankings for season ${seasonId} after deleting player ${playerId}`);
        } else {
            // Nếu không có trận đấu nào có score, có thể chỉ cần xóa PlayerRanking cho mùa giải đó
             await PlayerRanking.deleteMany({ season_id: seasonObjectId });
             console.log(`No scored matches found for season ${seasonId} after deleting player ${playerId}, cleared player rankings for the season.`);
        }
    }

    return successResponse(res, null, "Deleted player and related data successfully, rankings recalculated.", 200); // 200 để có thể gửi body message
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in deletePlayer:", error.message, error.stack);
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

export {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayersByIdTeam,
  getPlayerByNamePlayerAndNumberAndTeamId,
};