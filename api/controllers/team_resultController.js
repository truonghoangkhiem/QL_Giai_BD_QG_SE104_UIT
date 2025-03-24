const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

const createTeamResult = async (req, res) => {
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
    const goalDifference = 0;
    const points = 0;
    await db.collection("team_results").insertOne({
      team_id: Check_team_id,
      season_id: Check_season_id,
      matchplayed,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    });
    res.status(201).json({ message: "Created team result successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add a team result", error });
  }
};

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

const updateTeamResults = async (
  team_id,
  season_id,
  team_score,
  opponent_score
) => {
  const db = GET_DB();
  Check_team_id = new ObjectId(team_id);
  Check_season_id = new ObjectId(season_id);
  const teamResult = await db
    .collection("team_results")
    .findOne({ team_id: Check_team_id, season_id: Check_season_id });

  if (!teamResult) {
    throw new Error("Team result not found");
  }

  // Cập nhật số trận đã chơi
  const updatedMatchesPlayed = teamResult.matchplayed + 1;

  // Cập nhật kết quả trận đấu
  const updatedGoalsFor = teamResult.goalsFor + team_score;
  const updatedGoalsAgainst = teamResult.goalsAgainst + opponent_score;
  const updatedGoalDifference =
    teamResult.goalDifference + team_score - opponent_score;

  let updatedPoints = teamResult.points;
  let updatedWins = teamResult.wins;
  let updatedLosses = teamResult.losses;
  let updatedDraws = teamResult.draws;

  const seasonRegulation = await db
    .collection("regulations")
    .findOne({ season_id: Check_season_id, regulation_name: "Ranking Rules" });
  if (!seasonRegulation) {
    throw new Error("Regulation not found");
  }
  const pointforwin = seasonRegulation.rules.winPoints;
  const pointfordraw = seasonRegulation.rules.drawPoints;
  const pointforloss = seasonRegulation.rules.losePoints;
  // Cập nhật kết quả thắng thua hòa và điểm số
  if (team_score > opponent_score) {
    updatedPoints += pointforwin; // 3 điểm cho chiến thắng
    updatedWins += 1;
  } else if (team_score < opponent_score) {
    updatedPoints += pointforloss; // 0 điểm cho thua
    updatedLosses += 1;
  } else {
    updatedPoints += pointfordraw; // 1 điểm cho hòa
    updatedDraws += 1;
  }

  // Cập nhật kết quả đội
  await db.collection("team_results").updateOne(
    { team_id: Check_team_id, season_id: Check_season_id },
    {
      $set: {
        matchplayed: updatedMatchesPlayed,
        goalsFor: updatedGoalsFor,
        goalsAgainst: updatedGoalsAgainst,
        goalDifference: updatedGoalDifference,
        points: 0,
        wins: updatedWins,
        losses: updatedLosses,
        draws: updatedDraws,
      },
    }
  );
};

const updateTeamResultsByMatch = async (req, res) => {
  const match_id = new ObjectId(req.params.matchid);
  const db = GET_DB();

  try {
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) return res.status(404).json({ message: "Match not found" });

    const [team1_score, team2_score] = match.score.split("-").map(Number);
    const { team1, team2, season_id } = match;

    // Cập nhật kết quả cho team1
    await updateTeamResults(team1, season_id, team1_score, team2_score);

    // Cập nhật kết quả cho team2
    await updateTeamResults(team2, season_id, team2_score, team1_score);

    return res.status(200).json({ message: "Team results updated" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update team results", error: err });
  }
};

module.exports = {
  createTeamResult,
  getTeamResultsbySeasonId,
  getTeamResultsById,
  getId,
  updateTeamResultsByMatch,
};
