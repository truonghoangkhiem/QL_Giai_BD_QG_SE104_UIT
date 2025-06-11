// backend/src/api/v1/controllers/player/playerController.js
import Player from "../../../../models/Player.js";
import Team from "../../../../models/Team.js";
import Regulation from "../../../../models/Regulation.js";
import PlayerResult from "../../../../models/PlayerResult.js";
import PlayerRanking from "../../../../models/PlayerRanking.js";
import Match from "../../../../models/Match.js";
// Import hàm helper từ player_rankingsController nếu bạn vẫn cần nó cho deletePlayer
import { calculateAndSavePlayerRankings } from "./player_rankingsController.js";

import {
  createPlayerSchema,
  updatePlayerSchema,
  getPlayerByNameAndNumberSchema,
} from "../../../../schemas/playerSchema.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import { TeamIdSchema } from "../../../../schemas/teamSchema.js"; // Đảm bảo import này đúng
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
    const { success: teamIdValid, error: teamIdError } = TeamIdSchema.safeParse({ id: team_id });
    if (!teamIdValid) {
      const validationError = new Error(teamIdError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const TeamObjectId = new mongoose.Types.ObjectId(team_id);

    const { success: nameNumValid, error: nameNumError } =
      getPlayerByNameAndNumberSchema.safeParse({ name_player, number });
    if (!nameNumValid) {
      const validationError = new Error(nameNumError.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }
    const player = await Player.findOne({
      team_id: TeamObjectId,
      number,
      name: { $regex: new RegExp(`^${name_player}$`, "i") }, // Chính xác tên, không phân biệt hoa thường
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(Object.assign(new Error("Invalid Player ID format"), { status: 400 }));
    }
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

// HÀM CREATEPLAYER ĐÃ SỬA ĐỔI: CHỈ TẠO PLAYER
const createPlayer = async (req, res, next) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success)
    return next(
      Object.assign(new Error(parsed.error.errors[0].message), { status: 400 })
    );

  const { team_id, name, dob, nationality, position, isForeigner, number, avatar } = // Added avatar
    parsed.data;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(team_id)) {
        throw Object.assign(new Error("Invalid Team ID format"), { status: 400 });
    }
    const teamObjectId = new mongoose.Types.ObjectId(team_id);

    const team = await Team.findById(teamObjectId).session(session);
    if (!team) {
      throw Object.assign(new Error("Team not found"), { status: 404 });
    }
    
    const teamSeasonId = team.season_id; 

    const regulation = await Regulation.findOne({
      season_id: teamSeasonId,
      regulation_name: "Age Regulation",
    }).session(session);

    if (!regulation || !regulation.rules) { // Kiểm tra cả regulation.rules
      throw Object.assign(new Error("Age Regulation not found or rules not defined for the team's season"), { status: 500 });
    }
      
    const { minAge, maxAge, maxForeignPlayers, maxPlayersPerTeam } =
      regulation.rules;

    const existingNumber = await Player.findOne({ team_id: teamObjectId, number }).session(session);
    if (existingNumber) {
      throw Object.assign(new Error("Số áo này đã có cầu thủ khác trong đội sử dụng."), {
          status: 400,
        });
    }
      
    const playersInTeam = await Player.find({ team_id: teamObjectId }).session(session);
    if (playersInTeam.length >= maxPlayersPerTeam) {
      throw Object.assign(
          new Error(`Đội đã đủ số lượng cầu thủ tối đa (${maxPlayersPerTeam}).`),
          { status: 400 }
        );
    }
      
    if (isForeigner) {
      const foreignCount = playersInTeam.filter((p) => p.isForeigner).length;
      if (foreignCount >= maxForeignPlayers) {
        throw Object.assign(
            new Error(
              `Đội đã đủ số lượng cầu thủ ngoại binh tối đa (${maxForeignPlayers}).`
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

    if (minAge === undefined || maxAge === undefined) {
        throw Object.assign(new Error("minAge or maxAge is undefined in regulations."), { status: 500 });
    }

    if (age < minAge || age > maxAge) {
      throw Object.assign(
          new Error(`Tuổi của cầu thủ không phù hợp với quy định (${minAge} - ${maxAge} tuổi). Tuổi hiện tại: ${age}`),
          { status: 400 }
        );
    }
      
    const newPlayer = new Player({
      team_id: teamObjectId,
      name,
      dob,
      nationality,
      position,
      isForeigner,
      number,
      avatar: avatar || '', // Added avatar, default to empty string if not provided
    });
    const savedPlayer = await newPlayer.save({ session });
    
    // --- BỎ PHẦN TỰ ĐỘNG TẠO PlayerResult và PlayerRanking ---

    await session.commitTransaction();
    session.endSession();

    // Trả về thông tin cầu thủ vừa tạo để frontend có thể sử dụng ID
    return successResponse(res, savedPlayer, "Created player successfully. Frontend should now create initial PlayerResult and PlayerRanking.", 201);
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
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

  const updates = parsed.data; // updates will now include avatar if provided
  const playerIdParam = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(playerIdParam)) {
    return next(Object.assign(new Error("Invalid Player ID format for update"), { status: 400 }));
  }
  const playerId = new mongoose.Types.ObjectId(playerIdParam);


  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const player = await Player.findById(playerId).session(session);
    if (!player) {
      throw Object.assign(new Error("Player not found"), { status: 404 });
    }
    
    const targetTeamIdString = updates.team_id || player.team_id.toString();
    if (!mongoose.Types.ObjectId.isValid(targetTeamIdString)) {
        throw Object.assign(new Error("Invalid target Team ID format"), { status: 400 });
    }
    const targetTeamId = new mongoose.Types.ObjectId(targetTeamIdString);


    if (updates.number && updates.number !== player.number) {
        const numberExists = await Player.findOne({
            team_id: targetTeamId,
            number: updates.number,
            _id: { $ne: playerId } 
        }).session(session);
        if (numberExists) {
            throw Object.assign(new Error("Số áo này đã có cầu thủ khác trong đội sử dụng."), { status: 400 });
        }
    }

    const team = await Team.findById(targetTeamId).session(session);
    if (!team) {
        throw Object.assign(new Error("Target team not found"), { status: 404 });
    }
    const teamSeasonId = team.season_id;

    const regulation = await Regulation.findOne({
        season_id: teamSeasonId,
        regulation_name: "Age Regulation",
    }).session(session);

    if (!regulation || !regulation.rules) {
        throw Object.assign(new Error("Quy định về độ tuổi của giải đấu chưa được thiết lập. Vui lòng liên hệ quản trị viên."), { status: 500 });
    }
    const { minAge, maxAge, maxForeignPlayers } = regulation.rules;
    if (minAge === undefined || maxAge === undefined || maxForeignPlayers === undefined) {
        throw Object.assign(new Error("minAge, maxAge, or maxForeignPlayers is undefined in regulations."), { status: 500 });
    }

    if (updates.isForeigner !== undefined || (updates.team_id && updates.team_id !== player.team_id.toString())) {
        const isPotentiallyForeign = updates.isForeigner !== undefined ? updates.isForeigner : player.isForeigner;
        if (isPotentiallyForeign) {
            const playersInTargetTeam = await Player.find({ team_id: targetTeamId, _id: { $ne: playerId } }).session(session);
            const foreignCount = playersInTargetTeam.filter(p => p.isForeigner).length;
            if (foreignCount >= maxForeignPlayers) {
                 throw Object.assign(new Error(`Target team already has maximum ${maxForeignPlayers} foreign players`), { status: 400 });
            }
        }
    }
    
    if (updates.dob) {
        const birthDate = new Date(updates.dob);
        const currentDate = new Date();
        let age = currentDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = currentDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < minAge || age > maxAge) {
            throw Object.assign(new Error(`Player age must be between ${minAge} and ${maxAge}. Proposed age: ${age}`), { status: 400 });
        }
    }

    // Nếu team_id thay đổi, cần cập nhật PlayerResult và PlayerRanking tương ứng
    if (updates.team_id && updates.team_id !== player.team_id.toString()) {
        const oldTeamId = player.team_id;
        const newTeamId = new mongoose.Types.ObjectId(updates.team_id);

        // Cập nhật team_id trong PlayerResult của cầu thủ này cho mùa giải hiện tại của đội mới
        // Giả định rằng khi chuyển đội, kết quả ở đội cũ không còn liên quan trực tiếp
        // hoặc cần một logic phức tạp hơn để xử lý chuyển nhượng giữa mùa.
        // Đơn giản nhất là cập nhật team_id cho các bản ghi PlayerResult trong mùa giải của đội MỚI.
        // Hoặc tạo PlayerResult mới cho đội mới và mùa giải mới nếu cần.

        // Tìm PlayerResult mới nhất của cầu thủ ở đội cũ trong mùa giải của đội cũ
        const oldTeam = await Team.findById(oldTeamId).populate('season_id').session(session);
        if (oldTeam && oldTeam.season_id) {
            // Nếu muốn xóa PlayerResult ở đội cũ, thực hiện ở đây
            // await PlayerResult.deleteMany({ player_id: playerId, team_id: oldTeamId, season_id: oldTeam.season_id._id }).session(session);
            // await PlayerRanking.deleteMany({ player_id: playerId, season_id: oldTeam.season_id._id }).session(session);
             console.log(`Player ${playerId} moved from team ${oldTeamId} in season ${oldTeam.season_id._id}. Results in old team might need manual adjustment or specific business logic.`);
        }
        
        // Tạo PlayerResult ban đầu cho đội mới nếu chưa có
         const newTeamSeasonId = teamSeasonId; // đã lấy ở trên
         const seasonOfNewTeam = await Season.findById(newTeamSeasonId).session(session);
         if (!seasonOfNewTeam) throw new Error("Season for new team not found.");

         const initialDateForNewTeam = new Date(seasonOfNewTeam.start_date);
         initialDateForNewTeam.setUTCHours(0,0,0,0);

         const existingResultInNewTeam = await PlayerResult.findOne({
            player_id: playerId,
            team_id: newTeamId,
            season_id: newTeamSeasonId,
            date: initialDateForNewTeam
         }).session(session);

         if (!existingResultInNewTeam) {
            const initialPlayerResultForNewTeam = new PlayerResult({
                player_id: playerId,
                season_id: newTeamSeasonId,
                team_id: newTeamId,
                date: initialDateForNewTeam,
                // stats mặc định
            });
            const savedPR = await initialPlayerResultForNewTeam.save({session});

            const initialPlayerRankingForNewTeam = new PlayerRanking({
                player_id: playerId,
                season_id: newTeamSeasonId,
                player_results_id: savedPR._id,
                date: initialDateForNewTeam,
                rank: 0
            });
            await initialPlayerRankingForNewTeam.save({session});
         }
    }


    const updatedPlayer = await Player.findByIdAndUpdate(playerId, updates, { new: true, session }); // updates now includes avatar
     if (!updatedPlayer) {
        throw Object.assign(new Error("Player not found during update"), { status: 404 });
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, updatedPlayer, "Updated player successfully");
  } catch (error) {
    if(session.inTransaction()){
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in updatePlayer:", error);
    return next(error);
  }
};

const deletePlayer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw Object.assign(new Error("Invalid Player ID format"), { status: 400 });
    }
    const playerId = new mongoose.Types.ObjectId(req.params.id);

    const player = await Player.findById(playerId).session(session);
    if (!player) {
      throw Object.assign(new Error("Player not found"), { status: 404 });
    }

    // Tìm tất cả PlayerResult của cầu thủ này để xác định các mùa giải bị ảnh hưởng
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
    await Player.findByIdAndDelete(playerId).session(session); // Sử dụng findByIdAndDelete
    
    await session.commitTransaction();
    // session.endSession(); // Kết thúc session ở đây TRƯỚC khi gọi recalculate

    // Sau khi transaction thành công, tính toán lại bảng xếp hạng cầu thủ cho các mùa giải bị ảnh hưởng
    // Việc này được thực hiện bên ngoài transaction chính
    for (const seasonIdStr of affectedSeasonIds) {
        const seasonObjectId = new mongoose.Types.ObjectId(seasonIdStr);
        
        // Tìm trận đấu cuối cùng có kết quả trong mùa giải đó để làm ngày tham chiếu
        const lastMatchWithScore = await Match.findOne({
            season_id: seasonObjectId,
            score: { $ne: null, $regex: /^\d+-\d+$/ } // Chỉ những trận có tỉ số hợp lệ
        }).sort({ date: -1 });

        let dateForRanking;
        if (lastMatchWithScore) {
            dateForRanking = new Date(lastMatchWithScore.date);
        } else {
            // Nếu không có trận nào có score, lấy ngày bắt đầu mùa giải
            const seasonInfo = await Season.findById(seasonObjectId);
            if (seasonInfo) {
                dateForRanking = new Date(seasonInfo.start_date);
            } else {
                console.warn(`Season info not found for ${seasonObjectId} during player deletion recalculation. Skipping ranking update.`);
                continue; // Bỏ qua mùa giải này nếu không tìm thấy thông tin
            }
        }
        dateForRanking.setUTCHours(0,0,0,0);
        
        console.log(`PlayerController: Triggering player ranking recalculation for season ${seasonIdStr}, date ${dateForRanking.toISOString()}`);
        await calculateAndSavePlayerRankings(seasonObjectId, dateForRanking); 
    }

    return successResponse(res, null, "Deleted player and related data successfully, player rankings recalculated.", 200);
  } catch (error) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession(); // Đảm bảo session được kết thúc cả khi có lỗi
    console.error("Error in deletePlayer:", error.message, error.stack);
    return next(error);
  }
};


const getPlayersByIdTeam = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(Object.assign(new Error("Invalid Team ID format"), { status: 400 }));
    }
    const teamId = new mongoose.Types.ObjectId(req.params.id);

    const team = await Team.findById(teamId);
    if (!team)
      return next(Object.assign(new Error("Team not found"), { status: 404 }));

    const players = await Player.find({ team_id: team._id }).populate('team_id'); // Populate để lấy thông tin đội
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