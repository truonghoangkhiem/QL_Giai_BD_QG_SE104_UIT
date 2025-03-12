const { GET_DB } = require("../config/db");
const { ObjectId } = require("mongodb");

//Lay tat ca tran dau
const getMatches = async (req, res) => {
  try {
    const db = GET_DB();
    const matches = await db.collection("matches").find().toArray();
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
// Lay tran dau theo id
const getMatchesById = async (req, res) => {
  try {
    const db = GET_DB();
    const match_id = new ObjectId(req.params.id);
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
const createMatch = async (req, res) => {
  const { season_id, matchperday } = req.body;
  if (!season_id || !matchperday) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (typeof season_id !== "string") {
    return res.status(400).json({ message: "Invalid input type" });
  }
  if (typeof matchperday !== "number") {
    return res
      .status(400)
      .json({ message: "Match per day have to is a number" });
  }
  if (matchperday < 0) {
    return res
      .status(400)
      .json({ message: "Match per day have to is a positive number" });
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const season = await db.collection("seasons").findOne({ _id: SeasonID });
    if (!season) return res.status(404).json({ message: "Season not found" });
    const { start_date, end_date } = season;
    const StartDate = new Date(start_date);
    const EndDate = new Date(end_date);
    const Teams = await db
      .collection("teams")
      .find({ season_id: SeasonID })
      .toArray();
    const NumberOfTeams = Teams.length;
    if (NumberOfTeams < 2)
      return res.status(400).json({ message: "Not enough teams for a match" });
    const Schedule = []; // Lich thi dau
    const MatchPerDayTracker = {}; // Kiem tra xem da co bao nhieu tran dau trong ngay
    const teamsPlayedInDay = {}; // Kiem tra doi da thi dau trong ngay chua

    const getNextAvailableDate = (currentDate, teama, teamb) => {
      let newDate = new Date(currentDate);
      while (
        (MatchPerDayTracker[newDate.toDateString()] &&
          MatchPerDayTracker[newDate.toDateString()] >= matchperday) ||
        (teamsPlayedInDay[newDate.toDateString()] &&
          (teamsPlayedInDay[newDate.toDateString()].has(teama._id.toString()) ||
            teamsPlayedInDay[newDate.toDateString()].has(teamb._id.toString())))
      ) {
        newDate.setDate(newDate.getDate() + 1);
        if (newDate > EndDate) {
          return null; // Không tìm thấy ngày hợp lệ trong phạm vi season
        }
      }
      return newDate;
    };

    //Tao lich thi dau
    for (let i = 0; i < NumberOfTeams; i++) {
      for (let j = 0; j < NumberOfTeams; j++) {
        if (i == j) continue;
        const team1 = Teams[i];
        const team2 = Teams[j];
        let MatchDate = getNextAvailableDate(StartDate, team1, team2);
        if (MatchDate === null)
          return res.status(400).json({ message: "Not enough time for match" });
        //Kiem tra doi da thi dau trong ngay chua
        Schedule.push({
          season_id: SeasonID,
          team1: team1._id,
          team2: team2._id,
          date: MatchDate,
          stadium: team1.stadium,
          score: "0-0",
          goalDetails: [],
        });
        if (!teamsPlayedInDay[MatchDate.toDateString()])
          teamsPlayedInDay[MatchDate.toDateString()] = new Set();
        teamsPlayedInDay[MatchDate.toDateString()].add(team1._id.toString());
        teamsPlayedInDay[MatchDate.toDateString()].add(team2._id.toString());
        MatchPerDayTracker[MatchDate.toDateString()] =
          (MatchPerDayTracker[MatchDate.toDateString()] || 0) + 1;
      }
    }
    if (Schedule.length > 0) {
      const result = await db.collection("matches").insertMany(Schedule);
      if (result.insertedCount > 0)
        return res.status(201).json({ message: "Created match successfully" });
      else return res.status(400).json({ message: "Failed to create match" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to create match", error });
  }
};

module.exports = {
  getMatches,
  getMatchesById,
  createMatch,
  //   updateMatch,
  //   deleteMatch,
};
