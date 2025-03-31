const { ObjectId } = require("mongodb");
const { GET_DB } = require("../../../config/db");

const { successResponse } = require("../../../../utils/responseFormat");

// Thêm kết quả đội bóng
const createTeamResults = async (req, res, next) => {
  const { team_id, season_id } = req.body;
  if (!team_id || !season_id) {
    return next(new Error("TeamId and SeasonId are required"));
  }
  try {
    const db = GET_DB();
    const Check_team_id = new ObjectId(team_id);
    const team = await db.collection("teams").findOne({ _id: Check_team_id });
    if (!team) return next(new Error("Team not found"));
    const Check_season_id = new ObjectId(season_id);
    const season = await db
      .collection("seasons")
      .findOne({ _id: Check_season_id });
    if (!season) return next(new Error("Season not found"));
    const checkExist = await db
      .collection("team_results")
      .findOne({ team_id: Check_team_id, season_id: Check_season_id });
    if (checkExist) return next(new Error("Team result already exists"));

    const matchplayed = 0;
    const wins = 0;
    const draws = 0;
    const losses = 0;
    const goalsFor = 0;
    const goalsAgainst = 0;
    const goalsDifference = 0;
    const points = 0;
    const goalsForAway = 0;
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    await db.collection("team_results").insertOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      matchplayed,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalsDifference,
      points,
      goalsForAway,
      headToHeadPoints: {},
      date: currentDate,
    });

    return successResponse(res, null, "Created team result successfully", 201);
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Lấy kết quả đội bóng theo mùa giải
const getTeamResultsbySeasonId = async (req, res, next) => {
  const season_id = req.params.season_id;
  console.log(season_id);
  if (!season_id) return next(new Error("SeasonId is required"));
  try {
    const db = GET_DB();
    const Check_season_id = new ObjectId(season_id);
    const team_results = await db
      .collection("team_results")
      .find({ season_id: Check_season_id })
      .toArray();
    if (!team_results) return next(new Error("Team results not found"));

    return successResponse(
      res,
      team_results,
      "Fetched team results successfully"
    );
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Lấy kết quả đội bóng theo ID
const getTeamResultsById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new Error("Id is required"));
  try {
    const db = GET_DB();
    const Check_id = new ObjectId(id);
    const team_result = await db
      .collection("team_results")
      .findOne({ _id: Check_id });
    if (!team_result) return next(new Error("Team result not found"));

    return successResponse(res, team_result, "Team result found successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

// Lấy ID kết quả đội bóng
const getId = async (req, res, next) => {
  const { team_id, season_id } = req.params;
  if (!team_id || !season_id)
    return next(new Error("TeamId and SeasonId are required"));
  try {
    const db = GET_DB();
    const Check_team_id = new ObjectId(team_id);
    const Check_season_id = new ObjectId(season_id);
    const team_result = await db
      .collection("team_results")
      .findOne({ team_id: Check_team_id, season_id: Check_season_id });
    if (!team_result) return next(new Error("Team result not found"));

    return successResponse(
      res,
      team_result._id,
      "Fetched team result ID successfully"
    );
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

const updateTeamResults = async (
  team_id,
  season_id,
  team_score,
  opponent_score,
  isHome,
  opponent_team_id,
  match_date // Ngày của trận đấu
) => {
  const db = GET_DB();
  const Check_team_id = new ObjectId(team_id);
  const Check_season_id = new ObjectId(season_id);
  const Check_opponent_team_id = new ObjectId(opponent_team_id);

  // Chuẩn hóa ngày từ match_date thành ISODate với giờ 00:00:00
  const currentDate = new Date(match_date);
  currentDate.setUTCHours(0, 0, 0, 0);

  // Tìm bản ghi team_results với cùng ngày
  const teamResultSameDay = await db.collection("team_results").findOne({
    team_id: Check_team_id,
    season_id: Check_season_id,
    date: currentDate,
  });

  if (teamResultSameDay) {
    // Nếu đã tồn tại bản ghi với cùng ngày, cập nhật nó
    const updatedMatchesPlayed = teamResultSameDay.matchplayed + 1;
    const updatedGoalsFor = teamResultSameDay.goalsFor + team_score;
    const updatedGoalsAgainst = teamResultSameDay.goalsAgainst + opponent_score;
    const updatedGoalDifference = updatedGoalsFor - updatedGoalsAgainst;
    let updatedGoalsForAway = teamResultSameDay.goalsForAway;
    if (!isHome) {
      updatedGoalsForAway += team_score;
    }
    let updatedPoints = teamResultSameDay.points;
    let updatedWins = teamResultSameDay.wins;
    let updatedLosses = teamResultSameDay.losses;
    let updatedDraws = teamResultSameDay.draws;
    let updatedHeadToHeadPoints = teamResultSameDay.headToHeadPoints || {};
    const opponentKey = Check_opponent_team_id.toString();
    if (!updatedHeadToHeadPoints[opponentKey]) {
      updatedHeadToHeadPoints[opponentKey] = 0;
    }

    const seasonRegulation = await db.collection("regulations").findOne({
      season_id: Check_season_id,
      regulation_name: "Ranking Rules",
    });
    if (!seasonRegulation) {
      throw new Error("Regulation not found");
    }
    const pointforwin = seasonRegulation.rules.winPoints;
    const pointfordraw = seasonRegulation.rules.drawPoints;
    const pointforloss = seasonRegulation.rules.losePoints;

    if (team_score > opponent_score) {
      updatedPoints += pointforwin;
      updatedWins += 1;
      updatedHeadToHeadPoints[opponentKey] += 3;
    } else if (team_score < opponent_score) {
      updatedPoints += pointforloss;
      updatedLosses += 1;
      updatedHeadToHeadPoints[opponentKey] += 0;
    } else {
      updatedPoints += pointfordraw;
      updatedDraws += 1;
      updatedHeadToHeadPoints[opponentKey] += 1;
    }

    await db.collection("team_results").updateOne(
      { team_id: Check_team_id, season_id: Check_season_id, date: currentDate },
      {
        $set: {
          matchplayed: updatedMatchesPlayed,
          goalsFor: updatedGoalsFor,
          goalsAgainst: updatedGoalsAgainst,
          goalsDifference: updatedGoalDifference,
          points: updatedPoints,
          wins: updatedWins,
          losses: updatedLosses,
          draws: updatedDraws,
          goalsForAway: updatedGoalsForAway,
          headToHeadPoints: updatedHeadToHeadPoints,
        },
      }
    );
  } else {
    // Tìm bản ghi gần nhất trước ngày currentDate
    const latestTeamResult = await db
      .collection("team_results")
      .find({
        team_id: Check_team_id,
        season_id: Check_season_id,
        date: { $lt: currentDate }, // Lấy bản ghi có ngày nhỏ hơn ngày hiện tại
      })
      .sort({ date: -1 }) // Sắp xếp giảm dần để lấy bản ghi gần nhất
      .limit(1)
      .toArray();

    // Dữ liệu cơ sở: dùng bản ghi gần nhất nếu có, không thì bắt đầu từ 0
    const baseResult = latestTeamResult.length > 0 ? latestTeamResult[0] : null;
    const matchplayed = (baseResult?.matchplayed || 0) + 1;
    const goalsFor = (baseResult?.goalsFor || 0) + team_score;
    const goalsAgainst = (baseResult?.goalsAgainst || 0) + opponent_score;
    const goalsDifference = goalsFor - goalsAgainst;
    let goalsForAway = baseResult?.goalsForAway || 0;
    if (!isHome) {
      goalsForAway += team_score;
    }
    let points = baseResult?.points || 0;
    let wins = baseResult?.wins || 0;
    let losses = baseResult?.losses || 0;
    let draws = baseResult?.draws || 0;
    let headToHeadPoints = baseResult?.headToHeadPoints || {};
    const opponentKey = Check_opponent_team_id.toString();
    if (!headToHeadPoints[opponentKey]) {
      headToHeadPoints[opponentKey] = 0;
    }

    const seasonRegulation = await db.collection("regulations").findOne({
      season_id: Check_season_id,
      regulation_name: "Ranking Rules",
    });
    if (!seasonRegulation) {
      throw new Error("Regulation not found");
    }
    const pointforwin = seasonRegulation.rules.winPoints;
    const pointfordraw = seasonRegulation.rules.drawPoints;
    const pointforloss = seasonRegulation.rules.losePoints;

    if (team_score > opponent_score) {
      points += pointforwin;
      wins += 1;
      headToHeadPoints[opponentKey] += 3;
    } else if (team_score < opponent_score) {
      points += pointforloss;
      losses += 1;
      headToHeadPoints[opponentKey] += 0;
    } else {
      points += pointfordraw;
      draws += 1;
      headToHeadPoints[opponentKey] += 1;
    }

    // Tạo bản ghi mới với dữ liệu tích lũy từ ngày cũ
    await db.collection("team_results").insertOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      matchplayed,
      goalsFor,
      goalsAgainst,
      goalsDifference,
      points,
      wins,
      losses,
      draws,
      goalsForAway,
      headToHeadPoints,
      date: currentDate,
    });
  }
};

// Cập nhật kết quả đội bóng sau trận đấu
const updateTeamResultsByMatch = async (req, res, next) => {
  const match_id = new ObjectId(req.params.matchid);
  const db = GET_DB();

  try {
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) return next(new Error("Match not found"));

    const [team1_score, team2_score] = match.score.split("-").map(Number);
    const { team1, team2, season_id, date } = match;

    // Truyền ngày của trận đấu (match.date) vào hàm updateTeamResults
    await updateTeamResults(
      team1,
      season_id,
      team1_score,
      team2_score,
      true,
      team2,
      date
    );
    await updateTeamResults(
      team2,
      season_id,
      team2_score,
      team1_score,
      false,
      team1,
      date
    );

    return successResponse(res, null, "Team results updated successfully");
  } catch (err) {
    return next(err); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

const deleteTeamResults = async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new Error("Id is required"));
  try {
    const db = GET_DB();
    const Check_id = new ObjectId(id);
    const team_result = await db
      .collection("team_results")
      .findOne({ _id: Check_id });
    if (!team_result) return next(new Error("Team result not found"));

    await db.collection("team_results").deleteOne({ _id: Check_id });

    return successResponse(res, null, "Deleted team result successfully");
  } catch (error) {
    return next(error); // Chuyển lỗi vào middleware xử lý lỗi
  }
};

module.exports = {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
  deleteTeamResults,
};
