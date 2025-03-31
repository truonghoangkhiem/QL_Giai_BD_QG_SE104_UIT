const { GET_DB } = require("../../../config/db");
const { ObjectId } = require("mongodb");
const { successResponse } = require("../../../../utils/responseFormat"); // Import các hàm định dạng phản hồi

// Lấy tất cả trận đấu
const getMatches = async (req, res, next) => {
  try {
    const db = GET_DB();
    const matches = await db.collection("matches").find().toArray();
    return successResponse(res, matches, "Fetched all matches successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Lấy trận đấu theo id
const getMatchesById = async (req, res, next) => {
  try {
    const db = GET_DB();
    const match_id = new ObjectId(req.params.id);
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    return successResponse(res, match, "Match found successfully");
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Tạo trận đấu
const createMatch = async (req, res, next) => {
  const { season_id, matchperday } = req.body;
  if (!season_id || !matchperday) {
    const error = new Error("All fields are required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  if (typeof season_id !== "string") {
    const error = new Error("Invalid input type");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  if (typeof matchperday !== "number") {
    const error = new Error("Match per day has to be a number");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  if (matchperday < 0) {
    const error = new Error("Match per day has to be a positive number");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const season = await db.collection("seasons").findOne({ _id: SeasonID });
    if (!season) {
      const error = new Error("Season not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const { start_date, end_date } = season;
    const StartDate = new Date(start_date);
    const EndDate = new Date(end_date);
    const Teams = await db
      .collection("teams")
      .find({ season_id: SeasonID })
      .toArray();
    const NumberOfTeams = Teams.length;
    if (NumberOfTeams < 2) {
      const error = new Error("Not enough teams for a match");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const Schedule = []; // Lịch thi đấu
    const MatchPerDayTracker = {}; // Kiểm tra xem đã có bao nhiêu trận đấu trong ngày
    const teamsPlayedInDay = {}; // Kiểm tra đội đã thi đấu trong ngày chưa

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

    // Tạo lịch thi đấu
    for (let i = 0; i < NumberOfTeams; i++) {
      for (let j = 0; j < NumberOfTeams; j++) {
        if (i == j) continue;
        const team1 = Teams[i];
        const team2 = Teams[j];
        let MatchDate = getNextAvailableDate(StartDate, team1, team2);
        if (MatchDate === null) {
          const error = new Error("Not enough time for match");
          error.status = 400;
          return next(error); // Ném lỗi cho middleware xử lý
        }
        // Kiểm tra đội đã thi đấu trong ngày chưa
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
        return successResponse(res, null, "Created match successfully", 201);
      else {
        const error = new Error("Failed to create match");
        error.status = 400;
        return next(error); // Ném lỗi cho middleware xử lý
      }
    }
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

const getMatchesBySeasonId = async (req, res, next) => {
  const season_id = req.params.seasonid;
  if (!season_id) {
    const error = new Error("Season ID is required");
    error.status = 400;
    return next(error); // Ném lỗi cho middleware xử lý
  }
  try {
    const db = GET_DB();
    const SeasonID = new ObjectId(season_id);
    const matches = await db
      .collection("matches")
      .find({ season_id: SeasonID })
      .toArray();
    return successResponse(
      res,
      matches,
      "Fetched all matches by season ID successfully"
    );
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Cập nhật trận đấu
const updateMatch = async (req, res, next) => {
  const { team1, team2, date, stadium, score, goalDetails } = req.body;
  const match_id = new ObjectId(req.params.id);
  try {
    const db = GET_DB();
    const match = await db.collection("matches").findOne({ _id: match_id });
    if (!match) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const Updatefile = {};
    if (team1) Updatefile.team1 = new ObjectId(team1);
    if (team2) Updatefile.team2 = new ObjectId(team2);
    if (date) Updatefile.date = date;
    if (stadium) Updatefile.stadium = stadium;
    if (score) {
      const regrex = /^[0-9]-[0-9]$/;
      if (!regrex.test(score)) {
        const error = new Error("Invalid score format");
        error.status = 400;
        return next(error); // Ném lỗi cho middleware xử lý
      }
      Updatefile.score = score;
    }
    const regulationseason = await db
      .collection("regulations")
      .findOne({ season_id: match.season_id, regulation_name: "Goal Rules" });
    maxtimeforgoal = regulationseason.rules.goalTimeLimit.maxMinute;
    checkTypeofGoal = regulationseason.rules.goalTypes;
    if (goalDetails) {
      for (const goal of goalDetails) {
        // Kiểm tra tất cả các trường trong goalDetails
        if (
          !goal.player_id ||
          !goal.team_id ||
          !goal.minute ||
          !goal.goalType
        ) {
          const error = new Error("Incomplete goalDetails fields");
          error.status = 400;
          return next(error); // Ném lỗi cho middleware xử lý
        }
        if (goal.minute > maxtimeforgoal) {
          const error = new Error(
            "Goal minute must be less than Max time of regulation"
          );
          error.status = 400;
          return next(error); // Ném lỗi cho middleware xử lý
        }
        if (!checkTypeofGoal.includes(goal.goalType)) {
          const error = new Error("Invalid goal type");
          error.status = 400;
          return next(error); // Ném lỗi cho middleware xử lý
        }
      }
    }
    if (goalDetails) Updatefile.goalDetails = goalDetails;
    const result = await db
      .collection("matches")
      .updateOne({ _id: match_id }, { $set: Updatefile });
    if (result.modifiedCount > 0)
      return successResponse(res, null, "Updated match successfully");
    else {
      const error = new Error("Failed to update match");
      error.status = 400;
      return next(error); // Ném lỗi cho middleware xử lý
    }
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

// Xóa trận đấu
const deleteMatch = async (req, res, next) => {
  const match_id = new ObjectId(req.params.id);
  try {
    const db = GET_DB();
    if (!(await db.collection("matches").findOne({ _id: match_id }))) {
      const error = new Error("Match not found");
      error.status = 404;
      return next(error); // Ném lỗi cho middleware xử lý
    }
    const result = await db
      .collection("matches")
      .findOneAndDelete({ _id: match_id });
    return successResponse(res, null, "Deleted match successfully", 204);
  } catch (error) {
    return next(error); // Ném lỗi cho middleware xử lý
  }
};

module.exports = {
  getMatches,
  getMatchesById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchesBySeasonId,
};
