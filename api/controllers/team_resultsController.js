const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");
// Them ket qua doi bong
const createTeamResults = async (req, res) => {
  const { team_id, season_id } = req.body;
  if (!team_id || !season_id)
    return res
      .status(400)
      .json({ message: "TeamId and SeasonId are required" });
  try {
    const db = GET_DB();
    const Check_team_id = new ObjectId(team_id);
    const team = await db.collection("teams").findOne({ _id: Check_team_id });
    if (!team) return res.status(404).json({ message: "Team not found" });
    const Check_season_id = new ObjectId(season_id);
    const season = await db
      .collection("seasons")
      .findOne({ _id: Check_season_id });
    if (!season) return res.status(404).json({ message: "Season not found" });
    const checkExist = await db
      .collection("team_results")
      .findOne({ team_id: Check_team_id, season_id: Check_season_id });
    if (checkExist)
      return res.status(400).json({ message: "Team result already exists" });
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
    res.status(201).json({ message: "Created team result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a team result", error });
  }
};
//Lay ket qua doi bong theo mua giai
const getTeamResultsbySeasonId = async (req, res) => {
  const { season_id } = req.params;
  if (!season_id)
    return res.status(400).json({ message: "SeasonId are required" });
  try {
    const db = GET_DB();
    const Check_season_id = new ObjectId(season_id);
    const team_results = await db
      .collection("team_results")
      .find({ season_id: Check_season_id })
      .toArray();
    if (!team_results)
      return res.status(404).json({ message: "Team results not found" });
    res.status(200).json({ team_results });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team results", error });
  }
};
//Lay ket qua doi bong theo id
const getTeamResultsById = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Id is required" });
  try {
    const db = GET_DB();
    const Check_id = new ObjectId(id);
    const team_result = await db
      .collection("team_results")
      .findOne({ _id: Check_id });
    if (!team_result)
      return res.status(404).json({ message: "Team result not found" });
    res.status(200).json({ team_result });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team result", error });
  }
};
//Lay id ket qua doi bong
const getId = async (req, res) => {
  const { team_id, season_id } = req.body;
  if (!team_id || !season_id)
    return res
      .status(400)
      .json({ message: "TeamId and SeasonId are required" });
  try {
    const db = GET_DB();
    const Check_team_id = new ObjectId(team_id);
    const Check_season_id = new ObjectId(season_id);
    const team_result = await db
      .collection("team_results")
      .findOne({ team_id: Check_team_id, season_id: Check_season_id });
    if (!team_result)
      return res.status(404).json({ message: "Team result not found" });
    res.status(200).json(team_result._id);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team result", error });
  }
};
// Cập nhật kết quả đội bóng sau trận đấu
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

// API cập nhật kết quả đội bóng sau trận đấu
const updateTeamResultsByMatch = async (req, res) => {
  const match_id = new ObjectId(req.params.matchid);
  const db = GET_DB();

  try {
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) return res.status(404).json({ message: "Match not found" });

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

    return res.status(200).json({ message: "Team results updated" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update team results", error: err.message });
  }
};

module.exports = {
  createTeamResults,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
};
