import Ranking from "../../../../models/Ranking.js";
import TeamResult from "../../../../models/TeamResult.js";
import Regulation from "../../../../models/Regulation.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import {
  CreateRankingSchema,
  SeasonIdSchema as RankingSeasonIdSchema, // Alias để tránh xung đột
  UpdateRankingSchema,
  RankingIdSchema,
} from "../../../../schemas/rankingSchema.js";
import mongoose from "mongoose";

// Hàm helper để tính toán và lưu bảng xếp hạng đội bóng
export const calculateAndSaveTeamRankings = async (seasonId, dateForRanking, session = null) => {
  const SeasonID = new mongoose.Types.ObjectId(seasonId);
  const targetDate = new Date(dateForRanking);
  targetDate.setUTCHours(0, 0, 0, 0);

  const queryOptions = session ? { session } : {};

  const seasonRegulation = await Regulation.findOne({
    season_id: SeasonID,
    regulation_name: "Ranking Rules",
  }, null, queryOptions);

  if (!seasonRegulation || !seasonRegulation.rules) {
    console.error(`Ranking Regulation not found or rules not defined for season ${SeasonID} on date ${targetDate}. Cannot calculate rankings.`);
    // Optionally, delete existing rankings for this date if rules are missing
    await Ranking.deleteMany({ season_id: SeasonID, date: targetDate }, queryOptions);
    return;
  }

  const rankingCriteria = seasonRegulation.rules.rankingCriteria;
  if (!rankingCriteria || !Array.isArray(rankingCriteria) || rankingCriteria.length === 0) {
    console.error(`Invalid ranking criteria for season ${SeasonID}. Cannot calculate rankings.`);
    await Ranking.deleteMany({ season_id: SeasonID, date: targetDate }, queryOptions);
    return;
  }

  const sortStage = {};
  const validFields = ["points", "goalsDifference", "goalsFor", "headToHeadPoints"]; // headToHeadPoints là một trường hợp đặc biệt
  rankingCriteria.forEach((field) => {
    if (validFields.includes(field) && field !== "headToHeadPoints") { // headToHeadPoints được xử lý riêng trong sort
      sortStage[field] = -1; // Mặc định: cao hơn là tốt hơn
    }
  });


  // Lấy TeamResult mới nhất cho mỗi đội tính đến ngày targetDate
  const teamResultsForRanking = await TeamResult.aggregate([
    { $match: { season_id: SeasonID, date: { $lte: targetDate } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: "$team_id",
        latestResultId: { $first: "$_id" },
        doc: { $first: "$$ROOT" }
      }
    },
    { $replaceRoot: { newRoot: "$doc" } }
  ]).session(session);


  if (teamResultsForRanking.length === 0) {
    console.log(`No team results found for season ${SeasonID} on/before ${targetDate.toISOString().split("T")[0]} to rank.`);
    await Ranking.deleteMany({ season_id: SeasonID, date: targetDate }, queryOptions);
    return;
  }
  
  // Sắp xếp các TeamResult này
  const sortedTeamResults = [...teamResultsForRanking].sort((a, b) => {
    for (const field of rankingCriteria) {
        if (field === "headToHeadPoints") {
            // Đối đầu trực tiếp cần logic phức tạp hơn, thường là so sánh điểm giữa các đội liên quan.
            // Trong một hệ thống đầy đủ, bạn cần xác định nhóm các đội bằng điểm và sau đó so sánh H2H chỉ trong nhóm đó.
            // Ở đây, chúng ta giả định headToHeadPoints trên TeamResult là một map { opponent_id: points_against_opponent }
            // Việc này đơn giản hóa và có thể không hoàn toàn chính xác cho mọi kịch bản H2H phức tạp.
            const pointsA_vs_B = (a.headToHeadPoints && a.headToHeadPoints[b.team_id.toString()]) || 0;
            const pointsB_vs_A = (b.headToHeadPoints && b.headToHeadPoints[a.team_id.toString()]) || 0;
            if (pointsA_vs_B !== pointsB_vs_A) return pointsB_vs_A - pointsA_vs_B; // Đội có điểm H2H cao hơn sẽ xếp trên
        } else if (a[field] !== b[field]) {
            return (b[field] || 0) - (a[field] || 0); // Mặc định: giá trị cao hơn là tốt hơn
        }
    }
    // Nếu tất cả các tiêu chí đều bằng nhau, có thể sắp xếp theo tên đội hoặc giữ nguyên thứ tự
    return (a.team_id.toString()).localeCompare(b.team_id.toString());
  });


  // Cập nhật hoặc tạo mới Ranking
  const rankingOperations = [];
  for (let i = 0; i < sortedTeamResults.length; i++) {
    const teamResult = sortedTeamResults[i];
    rankingOperations.push({
      updateOne: {
        filter: {
          team_result_id: teamResult._id, // Liên kết với TeamResult cụ thể của ngày đó
          season_id: SeasonID,
          date: targetDate,
        },
        update: {
          $set: {
            rank: i + 1,
            team_id: teamResult.team_id, // Thêm team_id vào Ranking để dễ truy vấn
          }
        },
        upsert: true,
      },
    });
  }

  // Xóa các ranking cũ không còn teamResult tương ứng (ví dụ đội bị xóa)
  const currentTeamResultIdsForDate = new Set(sortedTeamResults.map(tr => tr._id.toString()));
  const existingRankingsForDate = await Ranking.find({ season_id: SeasonID, date: targetDate }, '_id team_result_id', queryOptions);

  existingRankingsForDate.forEach(existingRank => {
    if (!currentTeamResultIdsForDate.has(existingRank.team_result_id.toString())) {
      rankingOperations.push({
        deleteOne: {
          filter: { _id: existingRank._id }
        }
      });
    }
  });


  if (rankingOperations.length > 0) {
    await Ranking.bulkWrite(rankingOperations, { session });
  }
  console.log(`Team rankings recalculated for season ${SeasonID} on ${targetDate.toISOString().split("T")[0]}. Operations: ${rankingOperations.length}`);
};


// Tạo bảng xếp hạng đội bóng
const createRanking = async (req, res, next) => {
  const { team_result_id } = req.params; // Lấy từ params
  const { season_id } = req.body; // Lấy từ body
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = CreateRankingSchema.safeParse({
      team_result_id, // Validate
      season_id,      // Validate
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const TeamResultID = new mongoose.Types.ObjectId(team_result_id);
    const SeasonID = new mongoose.Types.ObjectId(season_id);

    const teamResult = await TeamResult.findOne({
      _id: TeamResultID,
      season_id: SeasonID,
    }).session(session);

    if (!teamResult) {
      const error = new Error("Team Result not found for the given season");
      error.status = 404;
      throw error;
    }

    const rankingDate = new Date(teamResult.date); // Sử dụng ngày của teamResult
    rankingDate.setUTCHours(0,0,0,0);

    // Kiểm tra xem đã có ranking cho team_result_id và ngày này chưa
    const checkExist = await Ranking.findOne({ 
        team_result_id: TeamResultID,
        date: rankingDate
    }).session(session);

    if (checkExist) {
      // Nếu đã tồn tại, có thể chỉ cần tính toán lại thay vì báo lỗi
      await calculateAndSaveTeamRankings(SeasonID, rankingDate, session);
      await session.commitTransaction();
      session.endSession();
      return successResponse(res, checkExist, "Ranking already exists, recalculated for the date.", 200);
    }

    const newRanking = new Ranking({
      team_result_id: TeamResultID,
      season_id: SeasonID,
      team_id: teamResult.team_id, // Lưu team_id trực tiếp vào Ranking
      rank: 0, // Sẽ được cập nhật bởi calculateAndSaveTeamRankings
      date: rankingDate,
    });
    await newRanking.save({ session });

    // Tính toán lại toàn bộ bảng xếp hạng cho ngày này
    await calculateAndSaveTeamRankings(SeasonID, rankingDate, session);
    
    await session.commitTransaction();
    session.endSession();

    // Lấy lại bản ghi ranking mới sau khi đã tính toán
    const finalRanking = await Ranking.findById(newRanking._id);

    return successResponse(res, finalRanking, "Ranking created and calculated successfully", 201);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};

// Lấy bảng xếp hạng mùa giải
const getSeasonRanking = async (req, res, next) => {
  const { seasonid } = req.params;
  const { date } = req.query; // Lấy date từ query param
  try {
    const { success, error } = RankingSeasonIdSchema.safeParse({ seasonid });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      return next(validationError);
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    
    let targetDate;
    if (date) {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            const validationError = new Error("Invalid date format in query parameter");
            validationError.status = 400;
            return next(validationError);
        }
        targetDate.setUTCHours(0,0,0,0);
    } else {
        // Nếu không có date, lấy ngày mới nhất có ranking
        const latestRankingEntry = await Ranking.findOne({ season_id: SeasonID }).sort({ date: -1 });
        if (!latestRankingEntry) {
            return successResponse(res, [], "No rankings found for this season yet.");
        }
        targetDate = new Date(latestRankingEntry.date);
        targetDate.setUTCHours(0,0,0,0);
    }
    
    // Đảm bảo ranking cho ngày targetDate là mới nhất
    // await calculateAndSaveTeamRankings(SeasonID, targetDate);

    const seasonRanking = await Ranking.find({ 
      season_id: SeasonID,
      date: targetDate // Chỉ lấy ranking của ngày cụ thể này
    })
    .populate({
        path: 'team_result_id',
        populate: { path: 'team_id', select: 'team_name logo' } // Populate tên đội và logo
    })
    .populate({ path: 'team_id', select: 'team_name logo' }) // Populate trực tiếp từ Ranking.team_id
    .sort({ rank: 1 });

    // Map lại dữ liệu để dễ sử dụng ở frontend
    const formattedRanking = seasonRanking.map(r => ({
        _id: r._id,
        rank: r.rank,
        date: r.date,
        season_id: r.season_id,
        team_id: r.team_id?._id || r.team_result_id?.team_id?._id,
        team_name: r.team_id?.team_name || r.team_result_id?.team_id?.team_name || "N/A",
        logo: r.team_id?.logo || r.team_result_id?.team_id?.logo || "URL_DEFAULT_LOGO",
        points: r.team_result_id?.points || 0,
        matchplayed: r.team_result_id?.matchplayed || 0,
        wins: r.team_result_id?.wins || 0,
        draws: r.team_result_id?.draws || 0,
        losses: r.team_result_id?.losses || 0,
        goalsFor: r.team_result_id?.goalsFor || 0,
        goalsAgainst: r.team_result_id?.goalsAgainst || 0,
        goalsDifference: r.team_result_id?.goalsDifference || 0,
        goalsForAway: r.team_result_id?.goalsForAway || 0,
        headToHeadPoints: r.team_result_id?.headToHeadPoints ? Object.fromEntries(r.team_result_id.headToHeadPoints) : {}
    }));


    return successResponse(
      res,
      formattedRanking,
      `Workspaceed season rankings for ${targetDate.toISOString().split('T')[0]} successfully`
    );
  } catch (error) {
    console.error("Error in getSeasonRanking:", error);
    return next(error);
  }
};

// Cập nhật bảng xếp hạng (thường được gọi sau khi một trận đấu có kết quả)
const updateRanking = async (req, res, next) => {
  const { seasonid } = req.params; // Đây là season_id
  const { match_date } = req.body; // Ngày của trận đấu vừa kết thúc
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = UpdateRankingSchema.safeParse({
      seasonid,
      match_date,
    });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const SeasonID = new mongoose.Types.ObjectId(seasonid);
    const targetDate = new Date(match_date);
    targetDate.setUTCHours(0, 0, 0, 0);

    await calculateAndSaveTeamRankings(SeasonID, targetDate, session);
    
    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      null,
      `Ranking updated for season ${seasonid} on date ${targetDate.toISOString().split("T")[0]}`
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updateRanking:", error);
    return next(error);
  }
};

// Xóa bảng xếp hạng
const deleteRanking = async (req, res, next) => {
  const { id } = req.params; // ID của một bản ghi Ranking cụ thể
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, error } = RankingIdSchema.safeParse({ id });
    if (!success) {
      const validationError = new Error(error.errors[0].message);
      validationError.status = 400;
      throw validationError;
    }

    const ranking_id = new mongoose.Types.ObjectId(id);
    const rankingToDelete = await Ranking.findById(ranking_id).session(session);
    if (!rankingToDelete) {
      const error = new Error("Ranking not found");
      error.status = 404;
      throw error;
    }

    const seasonId = rankingToDelete.season_id;
    const rankingDate = new Date(rankingToDelete.date);
    rankingDate.setUTCHours(0,0,0,0);

    await Ranking.deleteOne({ _id: ranking_id }).session(session);

    // Sau khi xóa, tính toán lại bảng xếp hạng cho ngày đó của mùa giải đó
    await calculateAndSaveTeamRankings(seasonId, rankingDate, session);
    
    await session.commitTransaction();
    session.endSession();

    return successResponse(res, null, "Ranking entry deleted and rankings recalculated for the date successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
};

export { createRanking, getSeasonRanking, updateRanking, deleteRanking };